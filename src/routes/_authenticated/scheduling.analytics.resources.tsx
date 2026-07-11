import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useTenant } from "@/hooks/use-tenant";
import { getResourceAnalytics } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/resources")({
  component: ResourcesTab,
});

function ResourcesTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getResourceAnalytics);
  const q = useQuery({
    queryKey: ["sched-res", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const d = q.data;
  const rows = useMemo(() => (d?.resources ?? []).slice().sort((a, b) => b.occupancy - a.occupancy), [d]);

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={rows as unknown as Record<string, unknown>[]} exportName="scheduling-resources" />
      {d && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Hourly Appointment Load</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.hourly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Booked Minutes by Kind</CardTitle></CardHeader>
              <CardContent style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.by_kind}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="kind" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="booked_minutes" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => {
              const pct = Math.round(r.occupancy * 100);
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.kind}</div>
                      </div>
                      <Badge variant="outline">{r.appointment_count} appts</Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{r.booked_minutes}m booked · {r.idle_minutes}m idle</span>
                        <span>Peak: {r.peak_hour != null ? `${r.peak_hour}:00` : "—"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
