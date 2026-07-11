/**
 * Scheduling — Reminder pipeline (server-only).
 *
 * Reads the Communication Policy for the appointment's tenant / branch /
 * service, materialises rows into `appointment_reminders`, and dispatches
 * through the Automation Engine via `emit_automation_event()`. It does
 * NOT contain any provider-specific messaging code — the Notification
 * Engine is the single sender.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  CommunicationPolicyEngine,
  type ResolvedPolicy,
} from "./communication-policy.server";
import { REMINDER_EVENTS } from "./events";

type SB = SupabaseClient<Database>;

type Appointment = {
  id: string;
  tenant_id: string;
  branch_id: string;
  service_id: string | null;
  starts_at: string;
  person_id: string;
  status_code: string;
};

const TEMPLATE_FOR_OFFSET = (offsetMinutes: number, templates: Record<string, string>) => {
  if (offsetMinutes >= 1440) return templates.reminder_24h;
  if (offsetMinutes >= 60) return templates.reminder_2h;
  return templates.arrival;
};

export class ReminderPipeline {
  private readonly policy: CommunicationPolicyEngine;
  constructor(private readonly sb: SB) {
    this.policy = new CommunicationPolicyEngine(sb);
  }

  /** Schedule the full reminder tree for one appointment. */
  async scheduleForAppointment(args: {
    appointmentId: string;
    reason?: "booked" | "rescheduled";
  }): Promise<{ scheduled: number; policy: ResolvedPolicy }> {
    const appt = await this.loadAppointment(args.appointmentId);
    const policy = await this.policy.resolve({
      tenantId: appt.tenant_id,
      branchId: appt.branch_id,
      serviceId: appt.service_id,
    });

    // Clear pending future reminders on reschedule.
    if (args.reason === "rescheduled") {
      await this.sb
        .from("appointment_reminders")
        .update({ status: "cancelled" } as never)
        .eq("appointment_id", appt.id)
        .in("status", ["pending", "queued"]);
    }

    const startsAt = new Date(appt.starts_at).getTime();
    const now = Date.now();
    const rows: {
      tenant_id: string;
      appointment_id: string;
      channel: string;
      scheduled_at: string;
      status: string;
      template_code: string | null;
      meta: Record<string, unknown>;
    }[] = [];

    for (const offset of policy.reminder_offsets_minutes) {
      const at = startsAt - offset * 60_000;
      if (at <= now) continue;
      const primary = policy.channels_order[0] ?? "whatsapp";
      rows.push({
        tenant_id: appt.tenant_id,
        appointment_id: appt.id,
        channel: primary,
        scheduled_at: new Date(at).toISOString(),
        status: "pending",
        template_code:
          TEMPLATE_FOR_OFFSET(offset, policy.templates) ??
          "appointment.reminder",
        meta: {
          offset_minutes: offset,
          fallback_channels: policy.channels_order.slice(1),
          language: policy.language,
          policy_code: policy.code ?? null,
        },
      });
    }

    // Booking confirmation is immediate.
    rows.push({
      tenant_id: appt.tenant_id,
      appointment_id: appt.id,
      channel: policy.channels_order[0] ?? "whatsapp",
      scheduled_at: new Date().toISOString(),
      status: "pending",
      template_code:
        policy.templates.booking_confirmation ??
        "appointment.booking_confirmation",
      meta: {
        kind: "booking_confirmation",
        fallback_channels: policy.channels_order.slice(1),
        language: policy.language,
        policy_code: policy.code ?? null,
      },
    });

    if (rows.length) {
      const { error } = await this.sb
        .from("appointment_reminders")
        .insert(rows as never);
      if (error) throw new Error(error.message);
    }

    await this.sb.rpc("emit_automation_event", {
      _tenant_id: appt.tenant_id,
      _event_type: REMINDER_EVENTS.SCHEDULED,
      _payload: {
        appointment_id: appt.id,
        count: rows.length,
        policy_code: policy.code ?? null,
      } as never,
      _entity_ref: { type: "appointment", id: appt.id } as never,
    });

    return { scheduled: rows.length, policy };
  }

  /** Mark a reminder as sent and emit the workflow event. */
  async markSent(args: {
    reminderId: string;
    providerRef?: string | null;
  }): Promise<void> {
    const { data, error } = await this.sb
      .from("appointment_reminders")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        provider_ref: args.providerRef ?? null,
      } as never)
      .eq("id", args.reminderId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await this.sb.rpc("emit_automation_event", {
      _tenant_id: (data as { tenant_id: string }).tenant_id,
      _event_type: REMINDER_EVENTS.SENT,
      _payload: { reminder_id: args.reminderId } as never,
      _entity_ref: { type: "appointment_reminder", id: args.reminderId } as never,
    });
  }

  /** Record a failure; falls back to next channel from the policy. */
  async markFailed(args: {
    reminderId: string;
    error: string;
  }): Promise<{ retryScheduled: boolean }> {
    const { data: row, error: readErr } = await this.sb
      .from("appointment_reminders")
      .select("*")
      .eq("id", args.reminderId)
      .single();
    if (readErr) throw new Error(readErr.message);

    const meta = (row.meta ?? {}) as {
      fallback_channels?: string[];
      offset_minutes?: number;
    };
    const nextChannel = meta.fallback_channels?.[0];
    const attempts = row.attempt_no + 1;

    if (nextChannel) {
      const { error } = await this.sb
        .from("appointment_reminders")
        .update({
          channel: nextChannel,
          status: "pending",
          attempt_no: attempts,
          last_error: args.error,
          meta: {
            ...meta,
            fallback_channels: meta.fallback_channels?.slice(1) ?? [],
          } as never,
        } as never)
        .eq("id", args.reminderId);
      if (error) throw new Error(error.message);
      return { retryScheduled: true };
    }

    await this.sb
      .from("appointment_reminders")
      .update({
        status: "failed",
        attempt_no: attempts,
        last_error: args.error,
      } as never)
      .eq("id", args.reminderId);

    await this.sb.rpc("emit_automation_event", {
      _tenant_id: row.tenant_id,
      _event_type: REMINDER_EVENTS.FAILED,
      _payload: {
        reminder_id: args.reminderId,
        error: args.error,
      } as never,
      _entity_ref: { type: "appointment_reminder", id: args.reminderId } as never,
    });
    return { retryScheduled: false };
  }

  private async loadAppointment(id: string): Promise<Appointment> {
    const { data, error } = await this.sb
      .from("appointments")
      .select(
        "id,tenant_id,branch_id,service_id,starts_at,person_id,status_code",
      )
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return data as Appointment;
  }
}
