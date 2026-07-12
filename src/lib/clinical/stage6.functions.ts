/**
 * Clinical / EMR — Stage 6 Server Functions.
 *
 * Thin RPC facade over `ClinicalAnalyticsService`. Every function:
 *   - uses requireSupabaseAuth (RLS enforces tenant scoping + clinical read perms)
 *   - validates input via Zod
 *   - returns plain DTOs (safe for TanStack Query cache)
 *
 * No new event bus, no autonomous writes, no duplicate reporting engine.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ClinicalAnalyticsService } from "./stage6.analytics.server";

const windowSchema = z.object({
  tenantId: z.string().uuid(),
  from: z.string().min(8),
  to: z.string().min(8),
});

const reportSchema = windowSchema.extend({
  groupBy: z.enum(["day", "week", "month", "doctor", "branch", "service", "diagnosis", "treatment", "outcome"]),
});

export const getClinicalExecutiveKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.executive(data.tenantId, { from: data.from, to: data.to });
  });

export const getClinicalDoctorPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.doctorPerformance(data.tenantId, { from: data.from, to: data.to });
  });

export const getClinicalOutcomes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.outcomes(data.tenantId, { from: data.from, to: data.to });
  });

export const getClinicalQuality = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.quality(data.tenantId, { from: data.from, to: data.to });
  });

export const getClinicalCompliance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.compliance(data.tenantId, { from: data.from, to: data.to });
  });

export const getClinicalAiKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.aiDashboard(data.tenantId, { from: data.from, to: data.to });
  });

export const getClinicalReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportSchema.parse(d))
  .handler(async ({ context, data }) => {
    const svc = new ClinicalAnalyticsService(context.supabase);
    return svc.report({
      tenantId: data.tenantId,
      window: { from: data.from, to: data.to },
      groupBy: data.groupBy,
    });
  });
