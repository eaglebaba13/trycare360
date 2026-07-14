/**
 * Patient Portal — Health Passport server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { HealthPassportEngine } from "./engines/passport.engine.server";
import { emptySchema, updatePassportVisibilitySchema } from "./validators";

export const getMyHealthPassport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new HealthPassportEngine(context.supabase);
    return { passport: await engine.build(context.userId) };
  });

export const updateHealthPassportVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updatePassportVisibilitySchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new HealthPassportEngine(context.supabase);
    return { passport: await engine.updateVisibility(context.userId, data) };
  });
