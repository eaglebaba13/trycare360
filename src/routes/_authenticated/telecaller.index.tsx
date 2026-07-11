/**
 * Telecaller Dashboard — personal KPIs for the signed-in owner.
 * Reads-only view over existing lead / follow-up / SLA / interaction data.
 */
import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users, PhoneCall, CalendarClock, AlertTriangle, Flame,
  TrendingUp, IndianRupee, Target, XCircle,
} from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/hooks/use-tenant";
import { useSession } from "@/hooks/use-session";
import { listLeads } from "@/lib/leads/leads.functions";
import { listFollowUps } from "@/lib/leads/followup.functions";
import { listOpenSlas } from "@/lib/sla/sla.functions";
import { listInteractions } from "@/lib/interactions/interactions.functions";

export const Route = createFileRoute("/_authenticated/telecaller/")({
  component: TelecallerDashboard,
});

function TelecallerDashboard() {
  const { activeTenantId } = useTenant();
  const session = useSession();
  const userId = session.data?.userId ?? null;

  const leadsFn = useServerFn(listLeads);
  const fuFn = useServerFn(listFollowUps);
  const slaFn = useServerFn(listOpenSlas);
  const intFn = useServerFn(listInteractions);

  const startOfDay = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), []);
  const endOfDay = useMemo(() => new Date(new Date().setHours(23, 59, 59, 999)).toISOString(), []);

  const leadsQ = useQuery({
    queryKey: ["tc-leads", activeTenantId, userId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, owner_id: userId!, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId && !!userId,
  });
  const fuQ = useQuery({
    queryKey: ["tc-fu", activeTenantId, userId, endOfDay],
    queryFn: () => fuFn({ data: { tenant_id: activeTenantId!, owner_id: userId!, before: endOfDay, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId && !!userId,
  });
  const slaQ = useQuery({
    queryKey: ["tc-sla", activeTenantId],
    queryFn: () => slaFn({ data: { tenant_id: activeTenantId!, entity_type: "lead" } }),
    enabled: !!activeTenantId,
  });
  const callsQ = useQuery({
    queryKey: ["tc-calls", activeTenantId, startOfDay],
    queryFn: () => intFn({ data: { tenant_id: activeTenantId!, channels: ["call"], from: startOfDay, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId,
  });

  const rows = leadsQ.data?.rows ?? [];
  const stats = useMemo(() => {
    const startTs = Date.parse(startOfDay);
    let hot = 0, convertedToday = 0, revenue = 0;
    for (const r of rows) {
      if (Number(r.lead_score ?? 0) >= 70) hot++;
      if (r.converted_at && Date.parse(r.converted_at) >= startTs) {
        convertedToday++;
        revenue += Number(r.expected_value ?? 0);
      }
    }
    return { hot, convertedToday, revenue };
  }, [rows, startOfDay]);

  const fus = fuQ.data?.rows ?? [];
  const now = Date.now();
  const pendingFollowUps = fus.filter((f: { status: string }) => f.status === "pending").length;
  const missedFollowUps = fus.filter((f: { status: string; due_at: string }) =>
    f.status === "pending" && Date.parse(f.due_at) < now,
  ).length;

  const slaRows = (slaQ.data?.rows ?? []).filter((s: { assigned_to: string | null }) => s.assigned_to === userId);
  const slaBreached = slaRows.filter((s: { breached_at: string | null }) => !!s.breached_at).length;

  const callsToday = (callsQ.data?.rows ?? []).filter((c: { owner_id: string | null }) => c.owner_id === userId).length;

  // Productivity: simple weighted score reusing signals we already have.
  const productivity = useMemo(() => {
    const callScore = Math.min(100, callsToday * 5);
    const fuScore = pendingFollowUps === 0 ? 100 : Math.max(0, 100 - missedFollowUps * 15);
    const conv = stats.convertedToday * 20;
    const slaPenalty = slaBreached * 10;
    return Math.max(0, Math.min(100, Math.round((callScore + fuScore + conv - slaPenalty) / 3)));
  }, [callsToday, pendingFollowUps, missedFollowUps, stats.convertedToday, slaBreached]);

  return (
    <div className="space-y-6">
      <KpiGrid>
        <KpiCard label="My Leads" value={leadsQ.data?.count ?? rows.length} icon={Users} />
        <KpiCard label="Today's Calls" value={callsToday} icon={PhoneCall} tone="info" />
        <KpiCard label="Pending Follow-ups" value={pendingFollowUps} icon={CalendarClock} tone="warning" />
        <KpiCard label="Missed Follow-ups" value={missedFollowUps} icon={XCircle} tone="danger" />
        <KpiCard label="SLA Breaches" value={slaBreached} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Hot Leads" value={stats.hot} icon={Flame} tone="warning" />
        <KpiCard label="Converted Today" value={stats.convertedToday} icon={TrendingUp} tone="success" />
        <KpiCard label="Revenue Generated" value={`₹${stats.revenue.toLocaleString("en-IN")}`} icon={IndianRupee} tone="success" />
        <KpiCard label="Productivity Score" value={`${productivity}`} hint="out of 100" icon={Target} tone={productivity >= 70 ? "success" : productivity >= 40 ? "warning" : "danger"} />
      </KpiGrid>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Jump into work</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><Link to="/telecaller/queue">Open my queue</Link></Button>
          <Button asChild variant="outline"><Link to="/telecaller/calendar">Follow-up calendar</Link></Button>
          <Button asChild variant="outline"><Link to="/telecaller/productivity">Productivity report</Link></Button>
          <Button asChild variant="outline"><Link to="/leads">Team dashboard</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
