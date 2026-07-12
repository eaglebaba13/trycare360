/**
 * Laboratory — instrument calibration.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calibrationRecordSchema } from "./validators";
import { CalibrationEngine } from "./engines/qc.engine.server";
import { CalibrationRepository } from "./repositories.server";
import { z } from "zod";

export const recordCalibration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => calibrationRecordSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CalibrationEngine(context.supabase);
    return { calibration: await engine.record({ ...data, actorId: context.userId }) };
  });

export const listCalibrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), instrumentId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new CalibrationRepository(context.supabase);
    return { rows: await repo.listForInstrument(data.instrumentId) };
  });
