/**
 * Patient Portal — Appointment server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AppointmentPortalEngine } from "./engines/appointments.engine.server";
import {
  appointmentIdSchema,
  bookAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  queueStatusSchema,
  rescheduleAppointmentSchema,
} from "./validators";

export const listMyAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listAppointmentsSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new AppointmentPortalEngine(context.supabase);
    return { rows: await engine.listAppointments({ viewerUserId: context.userId, ...data }) };
  });

export const bookMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bookAppointmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AppointmentPortalEngine(context.supabase);
    return { appointment: await engine.book({ viewerUserId: context.userId, ...data }) };
  });

export const rescheduleMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rescheduleAppointmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AppointmentPortalEngine(context.supabase);
    return { appointment: await engine.reschedule({ viewerUserId: context.userId, ...data }) };
  });

export const cancelMyAppointment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cancelAppointmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AppointmentPortalEngine(context.supabase);
    return { appointment: await engine.cancel({ viewerUserId: context.userId, ...data }) };
  });

export const getMyQueueStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => queueStatusSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new AppointmentPortalEngine(context.supabase);
    return await engine.queueStatus({ viewerUserId: context.userId, ...data });
  });

export const selfCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => appointmentIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AppointmentPortalEngine(context.supabase);
    return { appointment: await engine.selfCheckIn({ viewerUserId: context.userId, ...data }) };
  });
