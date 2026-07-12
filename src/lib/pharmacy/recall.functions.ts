/**
 * Pharmacy — Drug Recall server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RecallEngine } from "./engines/recall.engine.server";
import { RecallRepository } from "./repositories.server";
import { recallCreateSchema, recallIdSchema } from "./validators";

export const initiateRecall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recallCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RecallEngine(context.supabase);
    return engine.initiate(data, context.userId);
  });

export const completeRecall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recallIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RecallEngine(context.supabase);
    return { recall: await engine.complete(data.tenantId, data.recallId) };
  });

export const listRecalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new RecallRepository(context.supabase);
    return { rows: await repo.list({ tenantId: data.tenantId, limit: data.limit }) };
  });
