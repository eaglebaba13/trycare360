/**
 * Operational Analytics — SLA compliance, follow-up compliance, assignment
 * efficiency, AI assessment completion, queue health.
 * Reuses SLA + Follow-up + Supervisor engines.
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { listOpenSlas } from "@/lib/sla/sla.functions";
import { listFollowUps } from "@/lib/leads/followup.functions";
import { listLeads } from "@/lib/leads/leads.functions";
import { listTeamStats, listQueueDistribution } from "@/lib/leads/supervisor.functions";
import { AnalyticsFilterBar, useAnalyticsFilters } from "@/lib/analytics/filters";
import { ShieldCheck, AlertTriangle, CalendarClock, Users, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics/operational")({
  component: OperationalAnalytics,
});

function OperationalAnalytics() {
  const { activeTenantId } = useTenant();
  const slaFn = useServerFn(listOpenSlas);
  const fuFn = useServerFn(listFollowUps);
  const leadsFn = useServerFn(listLeads);
  const teamFn = useServerFn(listTeamStats);
  const queueFn = useServerFn(listQueueDistribution);
  const [filters, patch, reset] = useAnalyticsFilters();

  const enabled = !!activeTenantId;
  const slaQ = useQuery({ queryKey: ["ops-sla", activeTenantId], queryFn: () => slaFn({ data: { tenant_id: activeTenantId!, entity_type: "lead" } }), enabled });
  const fuQ = useQuery({ queryKey: ["ops-fu", activeTenantId], queryFn: () => fuFn({ data: { tenant_id: activeTenantId!, limit: 200, offset: 0 } }), enabled });
  const leadsQ = useQuery({ queryKey: ["ops-leads", activeTenantId], queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }), enabled });
  const teamQ = useQuery({ queryKey: ["ops-team", activeTenantId], queryFn: () => teamFn({ data: { tenant_id: activeTenantId! } }), enabled });
  const queueQ = useQuery({ queryKey: ["ops-queue", activeTenantId], queryFn: () => queueFn({ data: { tenant_id: activeTenantId! } }), enabled });

  type Row = Record<string, unknown>;
  const slas = (slaQ.data?.rows ?? []) as Row[];
  const fus = (fuQ.data?.rows ?? []) as Row[];
  const leads = (leadsQ.data?.rows ?? []) as Row[];
  const team = (teamQ.data?.rows ?? []) as Row[];
  const queue = (queueQ.data?.distribution ?? []) as Row[];

  const kpis = useMemo(() => {
    const slaTotal = slas.length;
    const slaBreached = slas.filter((s: Row) => s.status === "breached" || s.breached_at).length;
    const slaCompliance = slaTotal ? 1 - slaBreached / slaTotal : 1;

    const fuTotal = fus.length;
    const fuOnTime = fus.filter((f: Row) => f.status === "completed" && Date.parse(String(f.completed_at ?? f.due_at)) <= Date.parse(String(f.due_at))).length;
    const fuCompliance = fuTotal ? fuOnTime / fuTotal : 1;

    const assigned = leads.filter((l: Row) => l.owner_id).length;
    const assignEfficiency = leads.length ? assigned / leads.length : 0;

    const owners = team.map((t: Row) => Number(t.total ?? 0));
    const mean = owners.reduce((s, v) => s + v, 0) / (owners.length || 1);
    const variance = owners.reduce((s, v) => s + (v - mean) ** 2, 0) / (owners.length || 1);
    const std = Math.sqrt(variance);
    const queueHealth = mean ? 1 - Math.min(1, std / mean) : 1;

    return { slaCompliance, slaTotal, slaBreached, fuCompliance, fuTotal, assignEfficiency, queueHealth };
  }, [slas, fus, leads, team]);

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const queueChart = useMemo(() => queue.slice(0, 15).map((q) => ({
    owner: String(q.owner_id ?? "unassigned").slice(0, 8),
    total: Number(q.total ?? 0),
  })), [queue]);

  return (
    <>
      <AnalyticsFilterBar filters={filters} onChange={patch} onReset={reset} options={{}} exportRows={team as Record<string, unknown>[]} exportName="ops-team" />

      <KpiGrid>
        <KpiCard label="SLA Compliance" value={pct(kpis.slaCompliance)} icon={ShieldCheck} tone="success" hint={`${kpis.slaBreached}/${kpis.slaTotal} breached`} />
        <KpiCard label="Open SLAs" value={kpis.slaTotal} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Follow-up Compliance" value={pct(kpis.fuCompliance)} icon={CalendarClock} tone="info" />
        <KpiCard label="Assignment Efficiency" value={pct(kpis.assignEfficiency)} icon={Users} tone="info" />
        <KpiCard label="Queue Health" value={pct(kpis.queueHealth)} icon={Activity} tone="success" hint="1 - std/mean" />
        <KpiCard label="AI Assessment Completion" value="—" icon={Activity} hint="wired when consultations report status" />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Queue Distribution</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={queueChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="owner" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip /><Bar dataKey="total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>SLA Load per Owner</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={team.slice(0, 12)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="owner_id" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip /><Legend />
                <Bar dataKey="sla_open" fill="#f59e0b" name="Open" />
                <Bar dataKey="sla_breached" fill="#ef4444" name="Breached" />
                <Bar dataKey="pending_followups" fill="#8b5cf6" name="Pending F/U" />
                <Bar dataKey="missed_followups" fill="#ef4444" name="Missed F/U" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
