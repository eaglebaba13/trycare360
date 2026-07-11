/**
 * Sales Analytics — telecaller/sales rep performance, ageing, stage conversion,
 * won/lost reasons. Reuses supervisor.listTeamStats + leads.listLeads.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads } from "@/lib/leads/leads.functions";
import { listTeamStats } from "@/lib/leads/supervisor.functions";
import { AnalyticsFilterBar, useAnalyticsFilters, applyAnalyticsFilter, uniqueOptions } from "@/lib/analytics/filters";
import { Users, Clock, Zap, ArrowDownUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics/sales")({
  component: SalesAnalytics,
});

function SalesAnalytics() {
  const { activeTenantId } = useTenant();
  const leadsFn = useServerFn(listLeads);
  const teamFn = useServerFn(listTeamStats);
  const [filters, patch, reset] = useAnalyticsFilters();

  const leadsQ = useQuery({
    queryKey: ["analytics-sales-leads", activeTenantId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const teamQ = useQuery({
    queryKey: ["analytics-sales-team", activeTenantId],
    queryFn: () => teamFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const leads = leadsQ.data?.rows ?? [];
  const team = teamQ.data?.rows ?? [];

  const fLeads = useMemo(() => applyAnalyticsFilter(leads, filters, {
    date: "created_at", branch: "branch_id", franchise: "franchise_id", source: "source", owner: "owner_id",
  }), [leads, filters]);

  const ageing = useMemo(() => {
    const buckets = { "0-1d": 0, "2-7d": 0, "8-30d": 0, ">30d": 0 } as Record<string, number>;
    const now = Date.now();
    for (const l of fLeads) {
      if (l.status !== "open") continue;
      const days = (now - Date.parse(String(l.created_at))) / 86400000;
      if (days <= 1) buckets["0-1d"]++;
      else if (days <= 7) buckets["2-7d"]++;
      else if (days <= 30) buckets["8-30d"]++;
      else buckets[">30d"]++;
    }
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [fLeads]);

  const stageConv = useMemo(() => {
    const order = ["new", "contacted", "qualified", "consultation", "proposal", "negotiation", "won"];
    const counts = new Map<string, number>();
    for (const l of fLeads) counts.set(String(l.stage_code), (counts.get(String(l.stage_code)) ?? 0) + 1);
    return order.map((s, i) => {
      const prev = i > 0 ? counts.get(order[i - 1]) ?? 0 : (counts.get(s) ?? 0);
      const cur = counts.get(s) ?? 0;
      return { stage: s, count: cur, rate: prev ? cur / prev : 0 };
    });
  }, [fLeads]);

  const wonReasons = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of fLeads.filter((l) => l.won_reason_id)) m.set(String(l.won_reason_id), (m.get(String(l.won_reason_id)) ?? 0) + 1);
    return [...m.entries()].map(([reason, count]) => ({ reason: reason.slice(0, 10), count }));
  }, [fLeads]);

  const lostReasons = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of fLeads.filter((l) => l.lost_reason_id)) m.set(String(l.lost_reason_id), (m.get(String(l.lost_reason_id)) ?? 0) + 1);
    return [...m.entries()].map(([reason, count]) => ({ reason: reason.slice(0, 10), count }));
  }, [fLeads]);

  const totalTeam = team.length;
  const totalCallsToday = team.reduce((s, t) => s + Number(t.calls_today ?? 0), 0);
  const totalConvertedToday = team.reduce((s, t) => s + Number(t.converted_today ?? 0), 0);
  const totalRevenueToday = team.reduce((s, t) => s + Number(t.revenue_today ?? 0), 0);

  return (
    <>
      <AnalyticsFilterBar
        filters={filters} onChange={patch} onReset={reset}
        options={{
          branch: uniqueOptions(leads, "branch_id" as never),
          franchise: uniqueOptions(leads, "franchise_id" as never),
          source: uniqueOptions(leads, "source" as never),
          telecaller: uniqueOptions(leads, "owner_id" as never),
        }}
        exportRows={team as Record<string, unknown>[]}
        exportName="sales-team-stats"
      />
      <KpiGrid>
        <KpiCard label="Active Owners" value={totalTeam} icon={Users} />
        <KpiCard label="Calls Today" value={totalCallsToday} icon={Zap} tone="info" />
        <KpiCard label="Converted Today" value={totalConvertedToday} icon={ArrowDownUp} tone="success" />
        <KpiCard label="Revenue Today" value={`₹${Math.round(totalRevenueToday).toLocaleString("en-IN")}`} icon={Clock} tone="success" />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Telecaller / Sales Performance</CardTitle></CardHeader>
          <CardContent style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={team.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="owner_id" tick={{ fontSize: 10 }} />
                <YAxis /><Tooltip /><Legend />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total leads" />
                <Bar dataKey="hot" fill="#ef4444" name="Hot" />
                <Bar dataKey="converted_today" fill="#10b981" name="Converted today" />
                <Bar dataKey="calls_today" fill="#8b5cf6" name="Calls today" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lead Ageing (open only)</CardTitle></CardHeader>
          <CardContent style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageing}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" /><YAxis allowDecimals={false} />
                <Tooltip /><Bar dataKey="count" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stage Conversion</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageConv}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" /><YAxis allowDecimals={false} />
                <Tooltip formatter={(v: number, n: string) => n === "rate" ? `${(v * 100).toFixed(1)}%` : v} />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Won / Lost Reasons</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wonReasons} layout="vertical">
                <XAxis type="number" allowDecimals={false} /><YAxis dataKey="reason" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip /><Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lostReasons} layout="vertical">
                <XAxis type="number" allowDecimals={false} /><YAxis dataKey="reason" type="category" tick={{ fontSize: 10 }} width={70} />
                <Tooltip /><Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
