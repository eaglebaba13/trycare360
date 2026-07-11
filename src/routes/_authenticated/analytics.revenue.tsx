/**
 * Revenue Analytics — breakdowns by campaign/branch/franchise/doctor/
 * product/treatment/membership/subscription. Reuses revenue_events +
 * attribution_credits from the Attribution Engine.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { listRevenueEvents, listAttributionCredits } from "@/lib/attribution/attribution.functions";
import { AnalyticsFilterBar, useAnalyticsFilters, applyAnalyticsFilter, uniqueOptions } from "@/lib/analytics/filters";
import { IndianRupee, TrendingUp, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics/revenue")({
  component: RevenueAnalytics,
});

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function groupSum<T extends Record<string, unknown>>(rows: T[], key: keyof T, valueKey: keyof T, top = 10) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "—");
    m.set(k, (m.get(k) ?? 0) + Number(r[valueKey] ?? 0));
  }
  return [...m.entries()].map(([name, value]) => ({ name: name.slice(0, 18), value }))
    .sort((a, b) => b.value - a.value).slice(0, top);
}

function RevenueAnalytics() {
  const { activeTenantId } = useTenant();
  const revFn = useServerFn(listRevenueEvents);
  const credFn = useServerFn(listAttributionCredits);
  const [filters, patch, reset] = useAnalyticsFilters();

  const revQ = useQuery({
    queryKey: ["analytics-rev", activeTenantId],
    queryFn: () => revFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const credQ = useQuery({
    queryKey: ["analytics-rev-cred", activeTenantId],
    queryFn: () => credFn({ data: { tenant_id: activeTenantId!, limit: 500 } }),
    enabled: !!activeTenantId,
  });

  const revenue = revQ.data?.rows ?? [];
  const credits = credQ.data?.rows ?? [];

  const fRevenue = useMemo(() => applyAnalyticsFilter(revenue, filters, {
    date: "occurred_at", branch: "branch_id", franchise: "franchise_id", doctor: "doctor_id",
    treatment: "treatment_id", membership: "membership_id",
  }), [revenue, filters]);

  const total = fRevenue.reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const events = fRevenue.length;
  const avg = events ? total / events : 0;

  const byCategory = useMemo(() => groupSum(fRevenue, "category" as never, "amount" as never, 8), [fRevenue]);
  const byBranch = useMemo(() => groupSum(fRevenue, "branch_id" as never, "amount" as never), [fRevenue]);
  const byFranchise = useMemo(() => groupSum(fRevenue, "franchise_id" as never, "amount" as never), [fRevenue]);
  const byDoctor = useMemo(() => groupSum(fRevenue, "doctor_id" as never, "amount" as never), [fRevenue]);
  const byProduct = useMemo(() => groupSum(fRevenue.filter((r) => r.product_id), "product_id" as never, "amount" as never), [fRevenue]);
  const byTreatment = useMemo(() => groupSum(fRevenue.filter((r) => r.treatment_id), "treatment_id" as never, "amount" as never), [fRevenue]);
  const byMembership = useMemo(() => groupSum(fRevenue.filter((r) => r.category === "membership"), "membership_id" as never, "amount" as never), [fRevenue]);
  const bySubscription = useMemo(() => groupSum(fRevenue.filter((r) => r.category === "subscription"), "subscription_id" as never, "amount" as never), [fRevenue]);
  const byCampaign = useMemo(() => groupSum(credits, "campaign_id" as never, "credit_amount" as never), [credits]);

  const trend = useMemo(() => {
    const days = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of fRevenue) {
      const k = String(r.occurred_at).slice(0, 10);
      if (days.has(k)) days.set(k, (days.get(k) ?? 0) + Number(r.amount ?? 0));
    }
    return [...days.entries()].map(([d, v]) => ({ d: d.slice(5), revenue: v }));
  }, [fRevenue]);

  const chart = (title: string, data: { name: string; value: number }[], color = "hsl(var(--primary))") => (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => money(v)} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
            <Tooltip formatter={(v: number) => money(v)} />
            <Bar dataKey="value" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <>
      <AnalyticsFilterBar
        filters={filters} onChange={patch} onReset={reset}
        options={{
          branch: uniqueOptions(revenue, "branch_id" as never),
          franchise: uniqueOptions(revenue, "franchise_id" as never),
          doctor: uniqueOptions(revenue, "doctor_id" as never),
          treatment: uniqueOptions(revenue, "treatment_id" as never),
          membership: uniqueOptions(revenue, "membership_id" as never),
        }}
        exportRows={fRevenue as Record<string, unknown>[]}
        exportName="revenue-events"
      />
      <KpiGrid>
        <KpiCard label="Total Revenue" value={money(total)} icon={IndianRupee} tone="success" />
        <KpiCard label="Events" value={events} icon={Layers} />
        <KpiCard label="Avg Event Value" value={money(avg)} icon={TrendingUp} tone="info" />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader><CardTitle>Revenue Trend (30 days)</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="d" /><YAxis tickFormatter={(v) => money(v)} />
                <Tooltip formatter={(v: number) => money(v)} /><Legend />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {chart("By Category", byCategory)}
        {chart("By Campaign (attributed)", byCampaign, "#8b5cf6")}
        {chart("By Branch", byBranch, "#06b6d4")}
        {chart("By Franchise", byFranchise, "#10b981")}
        {chart("By Doctor", byDoctor, "#f59e0b")}
        {chart("By Product", byProduct, "#ef4444")}
        {chart("By Treatment", byTreatment)}
        {chart("By Membership", byMembership, "#10b981")}
        {chart("By Subscription", bySubscription, "#8b5cf6")}
      </div>
    </>
  );
}
