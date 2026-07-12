/**
 * Laboratory — result entry, listing, amendment.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resultAmendSchema, resultEntrySchema, resultListSchema } from "./validators";
import { ResultEngine } from "./engines/result.engine.server";
import { ResultRepository, ResultVersionRepository } from "./repositories.server";
import { z } from "zod";

export const enterResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resultEntrySchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ResultEngine(context.supabase);
    return { result: await engine.enter({ ...data, actorId: context.userId }) };
  });

export const listResults = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resultListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ResultRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const amendResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resultAmendSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ResultEngine(context.supabase);
    return { result: await engine.amend({ ...data, actorId: context.userId }) };
  });

export const listResultVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid(), resultId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ResultVersionRepository(context.supabase);
    return { versions: await repo.listForResult(data.resultId) };
  });
