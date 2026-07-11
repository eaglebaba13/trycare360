/**
 * Lead Dashboard
 * KPIs + charts computed entirely from existing lead + revenue data.
 * No new business logic; server functions are consumed as-is.
 */
import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, UserPlus, UserCheck, UserX, Flame, Snowflake, AlertTriangle,
  CalendarClock, TrendingUp, IndianRupee, ListChecks,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads } from "@/lib/leads/leads.functions";
import { listOpenSlas } from "@/lib/sla/sla.functions";
import { listFollowUps } from "@/lib/leads/followup.functions";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/leads/")({
  component: LeadsDashboard,
});

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

function LeadsDashboard() {
  const { activeTenantId } = useTenant();
  const leadsFn = useServerFn(listLeads);
  const slaFn = useServerFn(listOpenSlas);
  const followUpFn = useServerFn(listFollowUps);

  const leadsQ = useQuery({
    queryKey: ["leads-dash", activeTenantId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const slaQ = useQuery({
    queryKey: ["leads-dash-sla", activeTenantId],
    queryFn: () => slaFn({ data: { tenant_id: activeTenantId!, entity_type: "lead" } }),
    enabled: !!activeTenantId,
  });
  const fuQ = useQuery({
    queryKey: ["leads-dash-fu", activeTenantId],
    queryFn: () => followUpFn({ data: { tenant_id: activeTenantId!, before: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(), limit: 200, offset: 0 } }),
    enabled: !!activeTenantId,
  });

  const rows = leadsQ.data?.rows ?? [];
  const total = leadsQ.data?.count ?? 0;

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let today = 0, assigned = 0, unassigned = 0, hot = 0, cold = 0, converted = 0, lost = 0, revenue = 0;
    for (const r of rows) {
      if (new Date(r.created_at).getTime() >= startOfDay) today++;
      if (r.owner_id) assigned++; else unassigned++;
      const score = Number(r.lead_score ?? 0);
      if (score >= 70) hot++;
      if (score < 30) cold++;
      if (r.status === "won" || r.converted_at) { converted++; revenue += Number(r.expected_value ?? 0); }
      if (r.status === "lost") lost++;
    }
    return { today, assigned, unassigned, hot, cold, converted, lost, revenue };
  }, [rows]);

  const bySource = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const key = r.source ?? "unknown";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [rows]);

  const byStage = useMemo(() => {
    const order = ["new", "contacted", "qualified", "consultation", "proposal", "negotiation", "won", "lost"];
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.stage_code, (m.get(r.stage_code) ?? 0) + 1);
    return order.filter((s) => m.has(s)).map((s) => ({ stage: s, count: m.get(s) ?? 0 }));
  }, [rows]);

  const trend = useMemo(() => {
    const days: { d: string; created: number; converted: number }[] = [];
    const map = new Map<string, { created: number; converted: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { created: 0, converted: 0 });
      days.push({ d: key, created: 0, converted: 0 });
    }
    for (const r of rows) {
      const k = String(r.created_at).slice(0, 10);
      if (map.has(k)) map.get(k)!.created++;
      if (r.converted_at) {
        const k2 = String(r.converted_at).slice(0, 10);
        if (map.has(k2)) map.get(k2)!.converted++;
      }
    }
    return days.map((x) => ({ d: x.d.slice(5), ...map.get(x.d)! }));
  }, [rows]);

  return (
    <PageContainer title="Lead Dashboard" description="Enterprise view of your acquisition funnel">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/leads/list">Open Lead List</Link></Button>
      </div>

      <KpiGrid>
        <KpiCard label="Total Leads" value={total} icon={Users} />
        <KpiCard label="Today" value={stats.today} icon={UserPlus} tone="info" />
        <KpiCard label="Assigned" value={stats.assigned} icon={UserCheck} tone="success" />
        <KpiCard label="Unassigned" value={stats.unassigned} icon={UserX} tone="warning" />
        <KpiCard label="Hot Leads" value={stats.hot} icon={Flame} tone="danger" hint="score ≥ 70" />
        <KpiCard label="Cold Leads" value={stats.cold} icon={Snowflake} tone="info" hint="score < 30" />
        <KpiCard label="SLA Breached" value={(slaQ.data?.rows ?? []).filter((r: { status: string }) => r.status === "breached").length} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Follow-ups Today" value={fuQ.data?.rows.length ?? 0} icon={CalendarClock} />
        <KpiCard label="Converted" value={stats.converted} icon={TrendingUp} tone="success" />
        <KpiCard label="Lost" value={stats.lost} icon={UserX} tone="danger" />
        <KpiCard label="Revenue Attributed" value={`₹${stats.revenue.toLocaleString("en-IN")}`} icon={IndianRupee} tone="success" hint="from expected_value" />
        <KpiCard label="Open SLAs" value={slaQ.data?.rows.length ?? 0} icon={ListChecks} />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Source Distribution</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySource} dataKey="value" nameKey="name" outerRadius={90} label>
                  {bySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
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
                <XAxis dataKey="stage" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Lead & Conversion Trend (14 days)</CardTitle></CardHeader>
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="d" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
