/**
 * Laboratory — release verified results.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resultIdSchema } from "./validators";
import { ReleaseEngine } from "./engines/result.engine.server";

export const releaseResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resultIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ReleaseEngine(context.supabase);
    return { result: await engine.release(data.tenantId, data.resultId, context.userId) };
  });
