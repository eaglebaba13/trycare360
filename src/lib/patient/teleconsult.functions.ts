/**
 * Patient Portal — Teleconsult server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TeleconsultEngine } from "./engines/teleconsult.engine.server";
import { appointmentIdSchema, listAppointmentsSchema } from "./validators";

export const listMyTeleconsultations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listAppointmentsSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new TeleconsultEngine(context.supabase);
    return { rows: await engine.list({ viewerUserId: context.userId, ...data }) };
  });

export const getTeleconsultJoinInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => appointmentIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new TeleconsultEngine(context.supabase);
    return await engine.joinInfo({ viewerUserId: context.userId, ...data });
  });
