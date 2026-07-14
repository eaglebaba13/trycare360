/**
 * Patient Portal — Family server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FamilyEngine } from "./engines/family.engine.server";
import {
  addFamilyMemberSchema,
  createFamilyAccountSchema,
  emptySchema,
  memberIdSchema,
  switchPatientContextSchema,
  updateFamilyPermissionsSchema,
} from "./validators";

export const createFamilyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createFamilyAccountSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FamilyEngine(context.supabase);
    return { account: await engine.createAccount(context.userId, data) };
  });

export const addFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addFamilyMemberSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FamilyEngine(context.supabase);
    return { member: await engine.addMember(context.userId, data) };
  });

export const updateFamilyPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateFamilyPermissionsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FamilyEngine(context.supabase);
    return { member: await engine.updatePermissions(context.userId, data) };
  });

export const removeFamilyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => memberIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FamilyEngine(context.supabase);
    await engine.removeMember(context.userId, data.memberId);
    return { ok: true };
  });

export const listFamilyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new FamilyEngine(context.supabase);
    return engine.listMembers(context.userId);
  });

export const switchPatientContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => switchPatientContextSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FamilyEngine(context.supabase);
    return { identity: await engine.switchContext(context.userId, data.targetUserId) };
  });
