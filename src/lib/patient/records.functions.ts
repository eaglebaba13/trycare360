/**
 * Patient Portal — Records server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PatientRecordsEngine } from "./engines/records.engine.server";
import { recordsWindowSchema } from "./validators";

const boot = (context: { supabase: unknown }) => new PatientRecordsEngine(context.supabase);

export const getMyClinicalSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    summary: await boot(context).clinicalSummary({ viewerUserId: context.userId, ...data }),
  }));

export const listMyPrescriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    rows: await boot(context).listPrescriptions({ viewerUserId: context.userId, ...data }),
  }));

export const listMyTreatmentPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    rows: await boot(context).listTreatmentPlans({ viewerUserId: context.userId, ...data }),
  }));

export const listMyLabReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    rows: await boot(context).listLabReports({ viewerUserId: context.userId, ...data }),
  }));

export const listMyRadiologyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    rows: await boot(context).listRadiologyReports({ viewerUserId: context.userId, ...data }),
  }));

export const listMyPathologyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    rows: await boot(context).listPathologyReports({ viewerUserId: context.userId, ...data }),
  }));

export const listMyPharmacyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordsWindowSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => ({
    rows: await boot(context).listPharmacyOrders({ viewerUserId: context.userId, ...data }),
  }));
