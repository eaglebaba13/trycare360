/**
 * Laboratory — Westgard QC runs and reviews.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { qcRunSchema } from "./validators";
import { QualityControlEngine } from "./engines/qc.engine.server";
import { QCRepository } from "./repositories.server";
import { z } from "zod";

export const recordQcRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => qcRunSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new QualityControlEngine(context.supabase);
    return engine.recordRun({ ...data, actorId: context.userId });
  });

export const listRecentQc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), testId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new QCRepository(context.supabase);
    return { rows: await repo.recentForTest(data.tenantId, data.testId) };
  });
