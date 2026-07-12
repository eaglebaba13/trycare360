/**
 * Phase 2.8 Laboratory — read-only analytics server functions.
 *
 * Every function is:
 *   - Guarded by requireSupabaseAuth
 *   - Zod-validated via analyticsWindowSchema
 *   - A pure read: it delegates to LaboratoryAnalyticsService, which itself
 *     only reads Stage 2 repositories. No engine calls, no writes.
 *
 * The three legacy `*Snapshot` exports remain for backwards compatibility
 * with Stage 3 and Stage 5 workspaces.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyticsWindowSchema } from "./validators";
import {
  LaboratoryOrderRepository,
  ResultRepository,
  TurnaroundRepository,
} from "./repositories.server";
import { LaboratoryAnalyticsService } from "./analytics.server";

// ---------------------------------------------------------------------------
// Stage 6 canonical analytics feed
// ---------------------------------------------------------------------------
const win = (d: unknown) => analyticsWindowSchema.parse(d);

export const getLaboratoryExecutiveKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getExecutiveDashboard(data),
  );

export const getLaboratoryOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getOrderAnalytics(data),
  );

export const getLaboratoryTurnaround = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getTurnaroundAnalytics(data),
  );

export const getLaboratorySpecimens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getSpecimenAnalytics(data),
  );

export const getLaboratoryAnalyzers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getAnalyzerAnalytics(data),
  );

export const getLaboratoryQuality = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getQualityAnalytics(data),
  );

export const getLaboratoryVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getVerificationAnalytics(data),
  );

export const getLaboratoryDistribution = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getDistributionAnalytics(data),
  );

export const getLaboratoryExternalLabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getExternalLabAnalytics(data),
  );

export const getLaboratoryRadiology = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getRadiologyAnalytics(data),
  );

export const getLaboratoryPathology = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getPathologyAnalytics(data),
  );

export const getLaboratoryMicrobiology = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getMicrobiologyAnalytics(data),
  );

export const getLaboratoryFinancial = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getFinancialAnalytics(data),
  );

export const getLaboratoryCompliance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getComplianceAnalytics(data),
  );

export const getLaboratoryAi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getAiAnalytics(data),
  );

export const getLaboratoryReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new LaboratoryAnalyticsService(context.supabase).getLaboratoryReport(data),
  );

// ---------------------------------------------------------------------------
// Legacy snapshots retained for Stage 3/5 workspace compatibility.
// ---------------------------------------------------------------------------
export const orderVolumeSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) => {
    const repo = new LaboratoryOrderRepository(context.supabase);
    const rows = await repo.list({
      tenantId: data.tenantId,
      branchId: data.branchId ?? null,
      from: data.from ?? null,
      to: data.to ?? null,
      limit: 500,
    });
    const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    return { totals: { count: rows.length, byStatus } };
  });

export const resultStatusSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) => {
    const repo = new ResultRepository(context.supabase);
    const rows = await repo.list({ tenantId: data.tenantId, limit: 500 });
    const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
    const critical = rows.filter((r) => r.is_critical).length;
    return { totals: { count: rows.length, byStatus, critical } };
  });

export const turnaroundSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) => {
    const orders = new LaboratoryOrderRepository(context.supabase);
    const tat = new TurnaroundRepository(context.supabase);
    const list = await orders.list({
      tenantId: data.tenantId,
      branchId: data.branchId ?? null,
      from: data.from ?? null,
      to: data.to ?? null,
      limit: 100,
    });
    const durations: number[] = [];
    for (const o of list) {
      const history = await tat.listForOrder(o.id);
      if (history.length >= 2) {
        const first = new Date(history[0]!.occurred_at).getTime();
        const last = new Date(history[history.length - 1]!.occurred_at).getTime();
        durations.push((last - first) / 60000);
      }
    }
    const avg = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    return { averageMinutes: Math.round(avg), sampled: durations.length };
  });
