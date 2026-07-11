/**
 * Commission Analytics — pending, approved, paid (placeholder), top earners,
 * incentive trend. Reuses commission_accruals from the Commission Engine.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { listAccruals } from "@/lib/commissions/commissions.functions";
import { AnalyticsFilterBar, useAnalyticsFilters, applyAnalyticsFilter, uniqueOptions } from "@/lib/analytics/filters";
import { Wallet, CheckCircle2, Clock, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics/commission")({
  component: CommissionAnalytics,
});

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function CommissionAnalytics() {
  const { activeTenantId } = useTenant();
  const call = useServerFn(listAccruals);
  const [filters, patch, reset] = useAnalyticsFilters();

  const q = useQuery({
    queryKey: ["analytics-comm", activeTenantId],
    queryFn: () => call({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];

  const filtered = useMemo(() => applyAnalyticsFilter(rows, filters, {
    date: "computed_at",
  }), [rows, filters]);

  const sumBy = (status: string | string[]) => {
    const list = Array.isArray(status) ? status : [status];
    return filtered.filter((r) => list.includes(String(r.status))).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  };
  const pending = sumBy(["draft", "calculated", "under_review"]);
  const approved = sumBy("approved");
  const locked = sumBy("locked");
  const paid = sumBy("paid");

  const topEarners = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      const k = String(r.beneficiary_id);
      m.set(k, (m.get(k) ?? 0) + Number(r.amount ?? 0));
    }
    return [...m.entries()].map(([id, amount]) => ({ id: id.slice(0, 12), amount })).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [filtered]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) m.set(String(r.beneficiary_type), (m.get(String(r.beneficiary_type)) ?? 0) + Number(r.amount ?? 0));
    return [...m.entries()].map(([type, amount]) => ({ type, amount }));
  }, [filtered]);

  const trend = useMemo(() => {
    const days = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of filtered) {
      const k = String(r.computed_at ?? "").slice(0, 10);
      if (days.has(k)) days.set(k, (days.get(k) ?? 0) + Number(r.amount ?? 0));
    }
    return [...days.entries()].map(([d, v]) => ({ d: d.slice(5), amount: v }));
  }, [filtered]);

  return (
    <>
      <AnalyticsFilterBar
        filters={filters} onChange={patch} onReset={reset}
        options={{
          telecaller: uniqueOptions(rows, "beneficiary_id" as never),
        }}
        exportRows={filtered as Record<string, unknown>[]}
        exportName="commission-accruals"
      />
      <KpiGrid>
        <KpiCard label="Pending" value={money(pending)} icon={Clock} tone="warning" hint="draft + calculated + review" />
        <KpiCard label="Approved" value={money(approved)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Locked" value={money(locked)} icon={Wallet} tone="info" />
        <KpiCard label="Paid (Phase 3)" value={money(paid)} icon={Wallet} hint="placeholder until payout ships" />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Earners</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEarners} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => money(v)} />
                <YAxis dataKey="id" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By Beneficiary Type</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" /><YAxis tickFormatter={(v) => money(v)} />
                <Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle><Trophy className="inline h-4 w-4 mr-1" />Incentive Trend (30 days)</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="d" /><YAxis tickFormatter={(v) => money(v)} />
                <Tooltip formatter={(v: number) => money(v)} /><Legend />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
