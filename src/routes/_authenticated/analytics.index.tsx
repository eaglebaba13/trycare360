/**
 * Executive Analytics — top-of-funnel KPIs.
 * All numbers derived from existing lead + revenue engines.
 * Formulas: src/lib/analytics/kpi-definitions.md
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, UserCheck, UserX, ListChecks, Sparkles, Repeat, Percent, TrendingUp } from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads } from "@/lib/leads/leads.functions";
import { listRevenueEvents } from "@/lib/attribution/attribution.functions";
import { AnalyticsFilterBar, useAnalyticsFilters, applyAnalyticsFilter, uniqueOptions } from "@/lib/analytics/filters";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics/")({
  component: ExecutiveAnalytics,
});

const COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function ExecutiveAnalytics() {
  const { activeTenantId } = useTenant();
  const leadsFn = useServerFn(listLeads);
  const revFn = useServerFn(listRevenueEvents);
  const [filters, patch, reset] = useAnalyticsFilters();

  const leadsQ = useQuery({
    queryKey: ["analytics-exec-leads", activeTenantId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const revQ = useQuery({
    queryKey: ["analytics-exec-rev", activeTenantId],
    queryFn: () => revFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });

  const leads = leadsQ.data?.rows ?? [];
  const revenue = revQ.data?.rows ?? [];

  const fLeads = useMemo(() => applyAnalyticsFilter(leads, filters, {
    date: "created_at", branch: "branch_id", franchise: "franchise_id", campaign: "campaign_id",
    source: "source", owner: "owner_id",
  }), [leads, filters]);
  const fRevenue = useMemo(() => applyAnalyticsFilter(revenue, filters, {
    date: "occurred_at", branch: "branch_id", franchise: "franchise_id", doctor: "doctor_id",
    treatment: "treatment_id", membership: "membership_id",
  }), [revenue, filters]);

  const kpis = useMemo(() => {
    const total = fLeads.length;
    const qualifiedStages = new Set(["qualified", "consultation", "proposal", "negotiation", "won"]);
    const qualified = fLeads.filter((l) => qualifiedStages.has(String(l.stage_code))).length;
    const converted = fLeads.filter((l) => l.converted_at).length;
    const lost = fLeads.filter((l) => l.status === "lost").length;
    const patient = fLeads.filter((l) => l.converted_to === "patient").length;
    const membershipRev = fRevenue.filter((r) => r.category === "membership").length;
    const subscriptionRev = fRevenue.filter((r) => r.category === "subscription").length;
    const appt = fLeads.filter((l) => l.next_follow_up_at || l.stage_code === "consultation").length;
    return {
      total, qualified, converted, lost,
      leadConv: total ? converted / total : 0,
      apptConv: total ? appt / total : 0,
      patientConv: converted ? patient / converted : 0,
      membershipConv: converted ? membershipRev / converted : 0,
      subscriptionConv: converted ? subscriptionRev / converted : 0,
    };
  }, [fLeads, fRevenue]);

  const bySource = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of fLeads) m.set(String(l.source ?? "unknown"), (m.get(String(l.source ?? "unknown")) ?? 0) + 1);
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [fLeads]);

  const byStage = useMemo(() => {
    const order = ["new", "contacted", "qualified", "consultation", "proposal", "negotiation", "won", "lost"];
    const m = new Map<string, number>();
    for (const l of fLeads) m.set(String(l.stage_code), (m.get(String(l.stage_code)) ?? 0) + 1);
    return order.filter((s) => m.has(s)).map((s) => ({ stage: s, count: m.get(s) ?? 0 }));
  }, [fLeads]);

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <>
      <AnalyticsFilterBar
        filters={filters} onChange={patch} onReset={reset}
        options={{
          branch: uniqueOptions(leads, "branch_id" as never),
          franchise: uniqueOptions(leads, "franchise_id" as never),
          source: uniqueOptions(leads, "source" as never),
          campaign: uniqueOptions(leads, "campaign_id" as never),
          telecaller: uniqueOptions(leads, "owner_id" as never),
          doctor: uniqueOptions(revenue, "doctor_id" as never),
          treatment: uniqueOptions(revenue, "treatment_id" as never),
          membership: uniqueOptions(revenue, "membership_id" as never),
        }}
        exportRows={fLeads as Record<string, unknown>[]}
        exportName="executive-leads"
      />

      <KpiGrid>
        <KpiCard label="Total Leads" value={kpis.total} icon={Users} />
        <KpiCard label="Qualified" value={kpis.qualified} icon={UserCheck} tone="info" />
        <KpiCard label="Converted" value={kpis.converted} icon={TrendingUp} tone="success" />
        <KpiCard label="Lost" value={kpis.lost} icon={UserX} tone="danger" />
        <KpiCard label="Lead Conversion" value={pct(kpis.leadConv)} icon={Percent} tone="success" />
        <KpiCard label="Appointment Conv." value={pct(kpis.apptConv)} icon={ListChecks} tone="info" hint="leads w/ appointment intent" />
        <KpiCard label="Patient Conversion" value={pct(kpis.patientConv)} icon={Sparkles} tone="success" />
        <KpiCard label="Membership Conv." value={pct(kpis.membershipConv)} icon={Repeat} tone="info" />
        <KpiCard label="Subscription Conv." value={pct(kpis.subscriptionConv)} icon={Repeat} tone="info" />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Source Mix</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" outerRadius={90} label>
                  {bySource.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stage Funnel</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" /><YAxis allowDecimals={false} />
                <Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
