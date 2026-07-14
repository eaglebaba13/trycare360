/**
 * Patient Portal — Session server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SessionEngine } from "./engines/session.engine.server";
import { emptySchema, revokeSessionSchema } from "./validators";

export const listPortalSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new SessionEngine(context.supabase);
    return ({ rows: await engine.list(context.userId) } as never);
  });

export const revokePortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => revokeSessionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SessionEngine(context.supabase);
    return ({ session: await engine.revoke(context.userId, data.sessionId) } as never);
  });
