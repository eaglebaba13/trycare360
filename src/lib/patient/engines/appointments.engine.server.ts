import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assertFamilyPermission, resolvePatientIdentity } from "../helpers.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Appointment portal engine — patient-facing thin layer over the
 * platform Scheduling module. All slot inventory, capacity checks,
 * queueing, waitlisting, reminders, and coordinator logic remain in
 * `src/lib/scheduling/*`. This engine only surfaces read/CRUD for
 * the authenticated patient (or a delegated family member) and
 * delegates business decisions to Scheduling server services.
 */
export class AppointmentPortalEngine {
  constructor(private readonly sb: SB) {}

  private async resolveTarget(viewerUserId: string, targetUserId: string | undefined) {
    const target = targetUserId ?? viewerUserId;
    if (target !== viewerUserId) {
      await assertFamilyPermission(this.sb, {
        viewerUserId,
        targetUserId: target,
        capability: "view",
      });
    }
    return resolvePatientIdentity(this.sb, target);
  }

  async listAppointments(args: {
    viewerUserId: string;
    targetUserId?: string;
    status?: string;
    from?: string;
    to?: string;
    upcomingOnly?: boolean;
    limit?: number;
  }) {
    const identity = await this.resolveTarget(args.viewerUserId, args.targetUserId);
    if (!identity.personId || !identity.tenantId) return [];
    let q = this.sb
      .from("appointments")
      .select("id, tenant_id, person_id, appointment_type_id, practitioner_id, starts_at, ends_at, status_code, meta")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .order("starts_at", { ascending: args.upcomingOnly ? true : false })
      .limit(args.limit ?? 50);
    if (args.status) q = q.eq("status_code", args.status);
    if (args.upcomingOnly) q = q.gte("starts_at", new Date().toISOString());
    if (args.from) q = q.gte("starts_at", args.from);
    if (args.to) q = q.lte("starts_at", args.to);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async book(args: {
    viewerUserId: string;
    targetUserId?: string;
    slotId?: string;
    appointmentTypeId?: string;
    practitionerId?: string;
    startsAt: string;
    endsAt: string;
    reason?: string | null;
    meta?: Record<string, unknown>;
  }) {
    const target = args.targetUserId ?? args.viewerUserId;
    if (target !== args.viewerUserId) {
      await assertFamilyPermission(this.sb, {
        viewerUserId: args.viewerUserId,
        targetUserId: target,
        capability: "book",
      });
    }
    const identity = await resolvePatientIdentity(this.sb, target);
    if (!identity.personId || !identity.tenantId) throw new Error("Patient not registered");
    const { data, error } = await this.sb
      .from("appointments")
      .insert({
        tenant_id: identity.tenantId,
        person_id: identity.personId,
        appointment_type_id: args.appointmentTypeId ?? null,
        practitioner_id: args.practitionerId ?? null,
        starts_at: args.startsAt,
        ends_at: args.endsAt,
        status_code: "booked",
        meta: {
          ...(args.meta ?? {}),
          reason: args.reason,
          slot_id: args.slotId,
          booked_via: "patient_portal",
          booked_by_user_id: args.viewerUserId,
        },
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async reschedule(args: { viewerUserId: string; appointmentId: string; startsAt: string; endsAt: string }) {
    const { data: existing } = await this.sb
      .from("appointments")
      .select("id, person_id, tenant_id")
      .eq("id", args.appointmentId)
      .maybeSingle();
    if (!existing) throw new Error("Appointment not found");
    const { data, error } = await this.sb
      .from("appointments")
      .update({
        starts_at: args.startsAt,
        ends_at: args.endsAt,
        status_code: "rescheduled",
      })
      .eq("id", args.appointmentId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async cancel(args: { viewerUserId: string; appointmentId: string; reason?: string | null }) {
    const { data, error } = await this.sb
      .from("appointments")
      .update({
        status_code: "cancelled",
        meta: { cancelled_reason: args.reason, cancelled_by_user_id: args.viewerUserId },
      })
      .eq("id", args.appointmentId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async queueStatus(args: { viewerUserId: string; targetUserId?: string }) {
    const identity = await this.resolveTarget(args.viewerUserId, args.targetUserId);
    if (!identity.personId || !identity.tenantId) return { position: null, waiting: 0 };
    const { data } = await this.sb
      .from("appointments")
      .select("id, starts_at, status_code")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .in("status_code", ["checked_in", "waiting"]);
    const rows = (data ?? []) as Array<{ id: string; status_code: string }>;
    return { position: rows.length > 0 ? 1 : null, waiting: rows.length };
  }

  async selfCheckIn(args: { viewerUserId: string; appointmentId: string }) {
    const { data, error } = await this.sb
      .from("appointments")
      .update({ status_code: "checked_in" })
      .eq("id", args.appointmentId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
