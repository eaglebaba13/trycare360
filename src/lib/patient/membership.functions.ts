/**
 * Patient Portal — Membership server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MembershipEngine } from "./engines/membership.engine.server";
import {
  activateMembershipSchema,
  cancelMembershipSchema,
  emptySchema,
  membershipIdSchema,
  renewMembershipSchema,
} from "./validators";

export const listMyMemberships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new MembershipEngine(context.supabase);
    return { rows: await engine.list(context.userId) };
  });

export const activateMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => activateMembershipSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MembershipEngine(context.supabase);
    return { membership: await engine.activate(context.userId, data) };
  });

export const renewMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renewMembershipSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MembershipEngine(context.supabase);
    return { membership: await engine.renew(context.userId, data) };
  });

export const pauseMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => membershipIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MembershipEngine(context.supabase);
    return { membership: await engine.pause(context.userId, data.membershipId) };
  });

export const cancelMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cancelMembershipSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MembershipEngine(context.supabase);
    return { membership: await engine.cancel(context.userId, data.membershipId, data.reason) };
  });
