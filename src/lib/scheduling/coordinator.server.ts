/**
 * Scheduling — Booking Transaction Coordinator (server-only).
 *
 * Single source of truth for creating an appointment, regardless of
 * origin (website, AI consult, telecaller, mobile, reception, workflow).
 *
 * Pipeline (per user's Stage 2 recommendation):
 *   1. Evaluate policies                     → PolicyEngine
 *   2. Validate service dependencies         → PackageEngine
 *   3. Check availability + resource conflict → SlotEngine + ConflictEngine
 *   4. Check capacity                        → CapacityEngine
 *   5. Create temporary hold                 → ConflictEngine.createHold
 *   6. Reserve required resources            → (folded into hold + insert)
 *   7. Insert appointment                    → AppointmentRepository.insert
 *   8. Update queue (if walk-in / queued)    → QueueEngine.issueToken
 *   9. Emit workflow events                  → emit_automation_event
 *  10. Write timeline + audit + search index → log_timeline_event, index_search_entity
 *  11. Commit
 *
 * On any failure we release the temporary hold and re-throw a typed
 * `BookingError`. Because Supabase-js has no cross-table transaction,
 * we use the hold as a soft-transaction proxy: appointment insert is
 * the only DB write that must succeed; every earlier step is
 * side-effect-free or explicitly reversible.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  AppointmentRepository,
  ConflictRepository,
  type AppointmentInsert,
  type AppointmentRow,
} from "./repositories.server";
import { SchedulingPolicyEngine } from "./policy.server";
import { CapacityEngine } from "./capacity.server";
import { ConflictEngine } from "./conflict.server";
import { SlotEngine } from "./slots.server";
import { PackageEngine } from "./packages.server";
import { QueueEngine } from "./queue.server";
import { APPOINTMENT_EVENTS, CAPACITY_EVENTS } from "./events";
import type { BookAppointmentInput } from "./validators";

type SB = SupabaseClient<Database>;

export type BookingErrorCode =
  | "policy_blocked"
  | "dependency_missing"
  | "unavailable"
  | "capacity_exhausted"
  | "hold_failed"
  | "insert_failed";

export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export type BookingResult = {
  appointment: AppointmentRow;
  hold_id?: string;
  queue_token_id?: string | null;
  policy_notes: string[];
};

function newAppointmentCode(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `A-${t}-${r}`;
}

export class BookingTransactionCoordinator {
  private readonly appts: AppointmentRepository;
  private readonly conflicts: ConflictRepository;
  private readonly conflictEngine: ConflictEngine;
  private readonly slots: SlotEngine;
  private readonly capacity: CapacityEngine;
  private readonly policy: SchedulingPolicyEngine;
  private readonly packages: PackageEngine;
  private readonly queue: QueueEngine;

  constructor(private readonly sb: SB) {
    this.appts = new AppointmentRepository(sb);
    this.conflicts = new ConflictRepository(sb);
    this.conflictEngine = new ConflictEngine(sb);
    this.slots = new SlotEngine(sb);
    this.capacity = new CapacityEngine(sb);
    this.policy = new SchedulingPolicyEngine(sb);
    this.packages = new PackageEngine(sb);
    this.queue = new QueueEngine(sb);
  }

  async book(input: BookAppointmentInput, actorUserId?: string | null): Promise<BookingResult> {
    const endsAt = new Date(
      new Date(input.starts_at).getTime() + input.duration_minutes * 60_000,
    ).toISOString();

    // 1. Policies
    const policyEval = await this.policy.evaluate({
      tenant_id: input.tenant_id,
      branch_id: input.branch_id,
      franchise_id: input.franchise_id ?? null,
      service_id: input.service_id,
      service_variant_id: input.service_variant_id ?? null,
      doctor_id: input.doctor_id ?? null,
      person_id: input.person_id,
      booking_source: input.booking_source,
      action: "book",
      starts_at: input.starts_at,
    });
    if (!policyEval.allowed && !input.policy_override_reason) {
      throw new BookingError(
        "policy_blocked",
        "Booking blocked by scheduling policy.",
        policyEval.violations,
      );
    }

    // 2. Dependencies
    const dep = await this.packages.validateDependencies({
      tenantId: input.tenant_id,
      personId: input.person_id,
      serviceId: input.service_id,
      startsAt: input.starts_at,
    });
    if (!dep.ok) {
      throw new BookingError(
        "dependency_missing",
        "Service dependencies not satisfied.",
        dep,
      );
    }

    // 3. Availability + conflict
    const avail = await this.slots.checkAvailability({
      tenantId: input.tenant_id,
      branchId: input.branch_id,
      doctorId: input.doctor_id ?? null,
      roomResourceId: input.room_resource_id ?? null,
      startsAt: input.starts_at,
      durationMinutes: input.duration_minutes,
      ignoreHoldId: input.hold_id ?? undefined,
    });
    if (!avail.ok) {
      throw new BookingError("unavailable", `Slot unavailable: ${avail.reason}`);
    }

    // 4. Capacity
    const cap = await this.capacity.checkCapacity({
      tenantId: input.tenant_id,
      branchId: input.branch_id,
      dimensionCode: "appointments",
      bucketStart: input.starts_at,
      bucketEnd: endsAt,
    });
    if (!cap.ok) {
      await this.sb.rpc("emit_automation_event", {
        _tenant_id: input.tenant_id,
        _event_type: CAPACITY_EVENTS.EXHAUSTED,
        _payload: cap as never,
        _entity_ref: {
          type: "capacity_plan",
          id: cap.plan_id ?? null,
        } as never,
      });
      throw new BookingError("capacity_exhausted", "Capacity exhausted.", cap);
    }

    // 5. Temporary hold (soft transaction). If caller passed a hold, reuse it.
    let holdId = input.hold_id ?? null;
    if (!holdId) {
      const holdResource = input.doctor_id ?? input.room_resource_id ?? null;
      if (holdResource) {
        try {
          const hold = await this.conflictEngine.createHold({
            row: {
              tenant_id: input.tenant_id,
              branch_id: input.branch_id,
              resource_id: holdResource,
              held_by: actorUserId ?? null,
              held_for_person_id: input.person_id,
              starts_at: input.starts_at,
              ends_at: endsAt,
              expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
              slot_key: `${input.branch_id}:${holdResource}:${input.starts_at}`,
              status: "active",
              meta: { booking_source: input.booking_source } as Json,
            } as never,
          });
          holdId = hold.id as string;
        } catch (err) {
          throw new BookingError(
            "hold_failed",
            (err as Error).message,
            err,
          );
        }
      }
    }

    // 6+7. Insert appointment
    const row: AppointmentInsert = {
      tenant_id: input.tenant_id,
      person_id: input.person_id,
      service_id: input.service_id,
      service_variant_id: input.service_variant_id ?? null,
      appointment_type_id: input.appointment_type_id ?? null,
      appointment_reason_id: input.appointment_reason_id ?? null,
      branch_id: input.branch_id,
      org_unit_id: input.org_unit_id ?? null,
      franchise_id: input.franchise_id ?? null,
      doctor_id: input.doctor_id ?? null,
      primary_resource_id: input.primary_resource_id ?? null,
      room_resource_id: input.room_resource_id ?? null,
      resource_group_id: input.resource_group_id ?? null,
      starts_at: input.starts_at,
      ends_at: endsAt,
      duration_minutes: input.duration_minutes,
      timezone: input.timezone,
      delivery_mode: input.delivery_mode,
      booking_source: input.booking_source,
      booking_channel: input.booking_channel ?? null,
      lead_id: input.lead_id ?? null,
      package_id: input.package_id ?? null,
      sequence_item_id: input.sequence_item_id ?? null,
      series_id: input.series_id ?? null,
      parent_appointment_id: input.parent_appointment_id ?? null,
      household_id: input.household_id ?? null,
      membership_id: input.membership_id ?? null,
      is_emergency: input.is_emergency ?? false,
      is_vip: input.is_vip ?? false,
      is_walk_in: input.is_walk_in ?? false,
      priority_weight: input.priority_weight ?? 0,
      notes: input.notes ?? null,
      internal_notes: input.internal_notes ?? null,
      pickup_location: (input.pickup_location ?? null) as Json | null,
      dropoff_location: (input.dropoff_location ?? null) as Json | null,
      service_location: (input.service_location ?? null) as Json | null,
      attribution_touch_id: input.attribution_touch_id ?? null,
      created_by: actorUserId ?? null,
      appointment_code: newAppointmentCode(),
      status_code: "scheduled",
      meta: {
        ...(input.meta ?? {}),
        hold_id: holdId,
        policy_notes: policyEval.notes,
        policy_override_reason: input.policy_override_reason ?? null,
      } as Json,
    };

    let appointment: AppointmentRow;
    try {
      appointment = await this.appts.insert(row);
    } catch (err) {
      if (holdId) {
        try {
          await this.conflictEngine.releaseHold(holdId);
        } catch {
          /* best-effort */
        }
      }
      throw new BookingError("insert_failed", (err as Error).message, err);
    }

    // Status history
    await this.appts.appendStatus({
      tenant_id: input.tenant_id,
      appointment_id: appointment.id,
      from_status: null,
      to_status: "scheduled",
      changed_by: actorUserId ?? null,
      reason: `Booked via ${input.booking_source}`,
    } as never);

    // 8. Queue enrollment for walk-ins
    let queueTokenId: string | null = null;
    if (input.is_walk_in) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: queueRow } = await this.sb
          .from("appointment_queue")
          .select("id")
          .eq("tenant_id", input.tenant_id)
          .eq("branch_id", input.branch_id)
          .eq("status", "open")
          .eq("queue_date", today)
          .limit(1)
          .maybeSingle();
        if (queueRow?.id) {

          const token = await this.queue.issueToken({
            tenantId: input.tenant_id,
            branchId: input.branch_id,
            queueId: queueRow.id as string,
            appointmentId: appointment.id,
            personId: input.person_id,
            priority: input.priority_weight ?? 0,
            isVip: input.is_vip ?? false,
            isEmergency: input.is_emergency ?? false,
          });
          queueTokenId = token.id as string;
        }
      } catch (err) {
        // Queue is a soft feature; never fail the booking for it.
        console.warn("[coordinator] queue enrollment failed", err);
      }
    }

    // 9. Domain event
    await this.sb.rpc("emit_automation_event", {
      _tenant_id: input.tenant_id,
      _event_type: APPOINTMENT_EVENTS.CREATED,
      _payload: {
        appointment_id: appointment.id,
        person_id: input.person_id,
        service_id: input.service_id,
        branch_id: input.branch_id,
        starts_at: input.starts_at,
        ends_at: endsAt,
        booking_source: input.booking_source,
      } as never,
      _entity_ref: { type: "appointment", id: appointment.id } as never,
    });

    // 10. Timeline + search — best-effort, never blocks booking.
    try {
      await this.sb.rpc("log_timeline_event", {
        _tenant_id: input.tenant_id,
        _entity_type: "person",
        _entity_id: input.person_id,
        _event_type: "appointment.created",
        _title: `Appointment scheduled (${appointment.appointment_code})`,
        _body: input.notes ?? null,
        _meta: { appointment_id: appointment.id } as never,
      } as never);
    } catch (e) {
      console.warn("[coordinator] timeline log failed", e);
    }

    try {
      await this.sb.rpc("index_search_entity", {
        _tenant_id: input.tenant_id,
        _entity_type: "appointment",
        _entity_id: appointment.id,
        _title: appointment.appointment_code,
        _subtitle: input.notes ?? null,
        _body: null,
        _keywords: [
          input.booking_source,
          input.delivery_mode,
          input.branch_id,
          input.service_id,
          input.doctor_id,
        ]
          .filter(Boolean)
          .join(" "),
        _meta: { starts_at: input.starts_at } as never,
      } as never);
    } catch (e) {
      console.warn("[coordinator] search index failed", e);
    }


    // Release the hold now that the appointment owns the slot.
    if (holdId) {
      try {
        await this.conflictEngine.releaseHold(holdId);
      } catch {
        /* non-fatal */
      }
    }

    return {
      appointment,
      hold_id: holdId ?? undefined,
      queue_token_id: queueTokenId,
      policy_notes: policyEval.notes,
    };
  }
}
