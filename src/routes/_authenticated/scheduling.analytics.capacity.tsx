import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Percent, Users, ShieldAlert, Crown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useTenant } from "@/hooks/use-tenant";
import { getCapacityAnalytics } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/capacity")({
  component: CapacityTab,
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function CapacityTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getCapacityAnalytics);
  const q = useQuery({
    queryKey: ["sched-cap", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const d = q.data;

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={(d?.daily ?? []) as unknown as Record<string, unknown>[]} exportName="scheduling-capacity" />
      {d && (
        <>
          <KpiGrid>
            <KpiCard label="Capacity Plans" value={d.totals.plans} icon={Activity} />
            <KpiCard label="Planned / Day" value={`${d.totals.planned_minutes_per_day}m`} icon={Activity} />
            <KpiCard label="Used" value={`${d.totals.used_minutes}m`} tone="info" icon={Activity} />
            <KpiCard label="Utilization" value={pct(d.totals.utilization)} tone="success" icon={Percent} />
            <KpiCard label="Walk-in Reserve" value={`${d.totals.walk_in_reserve_minutes}m`} icon={Users} />
            <KpiCard label="Emergency Reserve" value={`${d.totals.emergency_reserve_minutes}m`} tone="warning" icon={ShieldAlert} />
            <KpiCard label="VIP Reserve" value={`${d.totals.vip_reserve_minutes}m`} tone="info" icon={Crown} />
            <KpiCard label="Exhaustion Rate" value={pct(d.totals.exhaustion_rate)} tone="danger" icon={Percent} />
          </KpiGrid>
          <Card>
            <CardHeader><CardTitle>Daily Utilization</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={d.totals.planned_minutes_per_day} stroke="#f59e0b" strokeDasharray="4 4" label="Planned" />
                  <Line type="monotone" dataKey="used" stroke="hsl(var(--primary))" strokeWidth={2} name="Used (m)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
