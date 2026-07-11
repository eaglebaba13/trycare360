/**
 * Scheduling — Reminder server functions (Stage 5).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { ReminderPipeline } from "./reminders.server";

const uuid = z.string().uuid();

export const scheduleReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        appointment_id: uuid,
        reason: z.enum(["booked", "rescheduled"]).default("booked"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const pipe = new ReminderPipeline(context.supabase);
    return pipe.scheduleForAppointment({
      appointmentId: data.appointment_id,
      reason: data.reason,
    });
  });

export const listAppointmentReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        appointment_id: uuid.nullish(),
        status: z.string().nullish(),
        from: z.string().datetime().nullish(),
        to: z.string().datetime().nullish(),
        limit: z.number().int().positive().max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointment_reminders")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("scheduled_at", { ascending: false })
      .limit(data.limit);
    if (data.appointment_id) q = q.eq("appointment_id", data.appointment_id);
    if (data.status) q = q.eq("status", data.status);
    if (data.from) q = q.gte("scheduled_at", data.from);
    if (data.to) q = q.lte("scheduled_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const markReminderSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ reminder_id: uuid, provider_ref: z.string().nullish() })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const pipe = new ReminderPipeline(context.supabase);
    await pipe.markSent({
      reminderId: data.reminder_id,
      providerRef: data.provider_ref ?? null,
    });
    return { ok: true };
  });

export const markReminderFailed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ reminder_id: uuid, error: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const pipe = new ReminderPipeline(context.supabase);
    return pipe.markFailed({
      reminderId: data.reminder_id,
      error: data.error,
    });
  });
