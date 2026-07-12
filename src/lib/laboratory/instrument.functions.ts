/**
 * Laboratory — analyzer instruments, queues, result ingestion.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyzerEnqueueSchema,
  analyzerResultSchema,
  instrumentUpsertSchema,
} from "./validators";
import { AnalyzerEngine } from "./engines/analyzer.engine.server";
import {
  AnalyzerQueueRepository,
  AnalyzerRepository,
} from "./repositories.server";
import { z } from "zod";

export const upsertInstrument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => instrumentUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AnalyzerEngine(context.supabase);
    return { instrument: await engine.upsertInstrument({ ...data, actorId: context.userId }) };
  });

export const listInstruments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AnalyzerRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const enqueueAnalyzerJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyzerEnqueueSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AnalyzerEngine(context.supabase);
    return { queue: await engine.enqueue(data) };
  });

export const ingestAnalyzerResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyzerResultSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AnalyzerEngine(context.supabase);
    return { row: await engine.ingestResult(data) };
  });

export const listAnalyzerQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        instrumentId: z.string().uuid(),
        status: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new AnalyzerQueueRepository(context.supabase);
    return { rows: await repo.listByInstrument(data.instrumentId, data.status) };
  });
