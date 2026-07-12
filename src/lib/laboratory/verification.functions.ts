/**
 * Laboratory — verification (auto + manual).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resultIdSchema } from "./validators";
import { VerificationEngine } from "./engines/result.engine.server";

export const autoVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resultIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new VerificationEngine(context.supabase);
    return { result: await engine.autoVerify(data.tenantId, data.resultId) };
  });

export const manualVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => resultIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new VerificationEngine(context.supabase);
    return {
      result: await engine.manualVerify(data.tenantId, data.resultId, context.userId),
    };
  });
