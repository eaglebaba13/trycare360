/**
 * Patient Portal — Consent server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ConsentEngine } from "./engines/consent.engine.server";
import { consentIdSchema, emptySchema, recordConsentSchema } from "./validators";

export const listMyConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new ConsentEngine(context.supabase);
    return ({ rows: await engine.list(context.userId) } as never);
  });

export const recordDigitalConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordConsentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ConsentEngine(context.supabase);
    return ({ consent: await engine.record(context.userId, data) } as never);
  });

export const withdrawDigitalConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => consentIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ConsentEngine(context.supabase);
    return ({ consent: await engine.withdraw(context.userId, data.consentId) } as never);
  });
