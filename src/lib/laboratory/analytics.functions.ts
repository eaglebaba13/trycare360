/**
 * Laboratory — read-only analytics feed. Delegates aggregation to
 * repositories/RPCs already provided by the Analytics Engine and
 * KPI Dictionary. Stage 2 exposes only lightweight snapshots for the
 * later Stage 6 dashboards; no KPI is computed twice here.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyticsWindowSchema } from "./validators";
import {
  LaboratoryOrderRepository,
  ResultRepository,
  TurnaroundRepository,
} from "./repositories.server";

export const orderVolumeSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyticsWindowSchema.parse(d))
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
  .inputValidator((d: unknown) => analyticsWindowSchema.parse(d))
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
  .inputValidator((d: unknown) => analyticsWindowSchema.parse(d))
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
