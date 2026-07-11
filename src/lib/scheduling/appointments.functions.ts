/**
 * Scheduling — Appointment lifecycle server functions.
 * Every mutation flows through here so the Booking Transaction
 * Coordinator, policy engine, workflow events, timeline, and audit
 * remain the single source of truth.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  checkinSchema,
  completeSchema,
  startSchema,
  feedbackSchema,
  noShowSchema,
  appointmentIdSchema,
} from "./validators";
import { BookingTransactionCoordinator, BookingError } from "./coordinator.server";
import { AppointmentRepository } from "./repositories.server";
import { APPOINTMENT_EVENTS } from "./events";

export const bookAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bookAppointmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const coord = new BookingTransactionCoordinator(context.supabase);
    try {
      return await coord.book(data, context.userId);
    } catch (err) {
      if (err instanceof BookingError) {
        return {
          error: {
            code: err.code,
            message: err.message,
            detail: err.detail ?? null,
          },
        };
      }
      throw err;
    }
  });

export const cancelAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cancelAppointmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const existing = await repo.getById(data.appointment_id);
    if (!existing) throw new Error("Appointment not found");

    const updated = await repo.update(data.appointment_id, {
      status_code: "cancelled",
      cancelled_at: new Date().toISOString(),
    } as never);

    await context.supabase.from("appointment_cancellation").insert({
      tenant_id: data.tenant_id,
      appointment_id: data.appointment_id,
      cancelled_by: context.userId,
      cancelled_by_role: data.cancelled_by_role,
      reason_code: data.reason_code,
      reason_notes: data.reason_notes ?? null,
      refund_requested: data.refund_requested ?? false,
    } as never);

    await repo.appendStatus({
      tenant_id: data.tenant_id,
      appointment_id: data.appointment_id,
      from_status: existing.status_code,
      to_status: "cancelled",
      changed_by: context.userId,
      reason: data.reason_code,
    } as never);

    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: APPOINTMENT_EVENTS.CANCELLED,
      _payload: {
        appointment_id: data.appointment_id,
        reason_code: data.reason_code,
        cancelled_by_role: data.cancelled_by_role,
        offer_waitlist: data.offer_waitlist,
      } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });

    return { appointment: updated, offer_waitlist: data.offer_waitlist };
  });

export const rescheduleAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rescheduleAppointmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const existing = await repo.getById(data.appointment_id);
    if (!existing) throw new Error("Appointment not found");

    const duration = data.new_duration_minutes ?? existing.duration_minutes;
    const endsAt = new Date(
      new Date(data.new_starts_at).getTime() + duration * 60_000,
    ).toISOString();

    const updated = await repo.update(data.appointment_id, {
      starts_at: data.new_starts_at,
      ends_at: endsAt,
      duration_minutes: duration,
      branch_id: data.new_branch_id ?? existing.branch_id,
      doctor_id: data.new_doctor_id ?? existing.doctor_id,
      room_resource_id: data.new_room_resource_id ?? existing.room_resource_id,
      status_code: "rescheduled_pending",
    } as never);

    await context.supabase.from("appointment_reschedule").insert({
      tenant_id: data.tenant_id,
      appointment_id: data.appointment_id,
      previous_starts_at: existing.starts_at,
      previous_ends_at: existing.ends_at,
      new_starts_at: data.new_starts_at,
      new_ends_at: endsAt,
      requested_by: context.userId,
      requested_by_role: data.requested_by_role,
      reason: data.reason ?? null,
    } as never);

    await repo.appendStatus({
      tenant_id: data.tenant_id,
      appointment_id: data.appointment_id,
      from_status: existing.status_code,
      to_status: "rescheduled",
      changed_by: context.userId,
      reason: data.reason ?? null,
    } as never);

    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: APPOINTMENT_EVENTS.RESCHEDULED,
      _payload: {
        appointment_id: data.appointment_id,
        previous_starts_at: existing.starts_at,
        new_starts_at: data.new_starts_at,
        requested_by_role: data.requested_by_role,
      } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });

    return { appointment: updated };
  });

export const checkInAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkinSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const at = data.at ?? new Date().toISOString();
    const updated = await repo.update(data.appointment_id, {
      status_code: "checked_in",
      checked_in_at: at,
    } as never);
    await context.supabase.from("appointment_checkin").insert({
      tenant_id: data.tenant_id,
      appointment_id: data.appointment_id,
      checked_in_at: at,
      checkin_channel: data.checkin_channel,
      checked_in_by: context.userId,
      notes: data.notes ?? null,
    } as never);
    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: APPOINTMENT_EVENTS.CHECKED_IN,
      _payload: { appointment_id: data.appointment_id, at } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });
    return { appointment: updated };
  });

export const startAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => startSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const at = data.started_at ?? new Date().toISOString();
    const updated = await repo.update(data.appointment_id, {
      status_code: "in_progress",
      consult_started_at: at,
    } as never);
    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: APPOINTMENT_EVENTS.STARTED,
      _payload: { appointment_id: data.appointment_id, at } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });
    return { appointment: updated };
  });

export const completeAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => completeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const at = data.completed_at ?? new Date().toISOString();
    const updated = await repo.update(data.appointment_id, {
      status_code: "completed",
      consult_completed_at: at,
      checked_out_at: at,
    } as never);
    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: APPOINTMENT_EVENTS.COMPLETED,
      _payload: {
        appointment_id: data.appointment_id,
        at,
        outcome_notes: data.outcome_notes ?? null,
      } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });
    return { appointment: updated };
  });

export const submitAppointmentFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => feedbackSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("appointment_feedback")
      .insert({
        tenant_id: data.tenant_id,
        appointment_id: data.appointment_id,
        rating: data.rating,
        nps: data.nps ?? null,
        comments: data.comments ?? null,
        submitted_by: context.userId,
        meta: (data.meta ?? {}) as never,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: APPOINTMENT_EVENTS.FEEDBACK_RECEIVED,
      _payload: {
        appointment_id: data.appointment_id,
        rating: data.rating,
        nps: data.nps ?? null,
      } as never,
      _entity_ref: { type: "appointment", id: data.appointment_id } as never,
    });
    return { feedback: row };
  });

export const markNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => noShowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const at = new Date().toISOString();
    const updated = await repo.update(data.appointment_id, {
      status_code: "no_show",
      no_show_at: at,
    } as never);
    await context.supabase.from("appointment_no_show").insert({
      tenant_id: data.tenant_id,
      appointment_id: data.appointment_id,
      marked_at: at,
      marked_by: context.userId,
      reason: data.reason ?? null,
      charge_no_show_fee: data.charge_no_show_fee ?? false,
    } as never);
    return { appointment: updated };
  });

export const getAppointment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => appointmentIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AppointmentRepository(context.supabase);
    const row = await repo.getById(data.appointment_id);
    if (!row) throw new Error("Appointment not found");
    const history = await repo.listStatusHistory(data.appointment_id);
    return { appointment: row, history };
  });
