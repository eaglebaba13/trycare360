/**
 * Patient Portal — Profile server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PatientProfileEngine } from "./engines/profile.engine.server";
import {
  emptySchema,
  updateProfileSchema,
  updateSettingsSchema,
  upsertPreferenceSchema,
} from "./validators";

export const getMyPatientProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new PatientProfileEngine(context.supabase);
    return ({ profile: await engine.getProfile(context.userId) } as never);
  });

export const updateMyPatientProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfileSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PatientProfileEngine(context.supabase);
    return ({ profile: await engine.updateProfile(context.userId, data) } as never);
  });

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new PatientProfileEngine(context.supabase);
    return ({ rows: await engine.getPreferences(context.userId) } as never);
  });

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertPreferenceSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PatientProfileEngine(context.supabase);
    return ({ preference: await engine.upsertPreference(context.userId, data) } as never);
  });

export const getMySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new PatientProfileEngine(context.supabase);
    return ({ settings: await engine.getSettings(context.userId) } as never);
  });

export const updateMySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSettingsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PatientProfileEngine(context.supabase);
    return ({ settings: await engine.updateSettings(context.userId, data.settings) } as never);
  });
