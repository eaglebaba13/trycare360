import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, Package, Repeat, Percent } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { getServiceAnalytics } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/services")({
  component: ServicesTab,
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function ServicesTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getServiceAnalytics);
  const q = useQuery({
    queryKey: ["sched-svc", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const d = q.data;

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={(d?.services ?? []) as unknown as Record<string, unknown>[]} exportName="scheduling-services" />
      {d && (
        <>
          <KpiGrid>
            <KpiCard label="Total Revenue" value={money(d.revenue_total)} icon={IndianRupee} tone="success" />
            <KpiCard label="Revenue / Appointment" value={money(Math.round(d.revenue_per_appointment))} icon={IndianRupee} />
            <KpiCard label="Package Plans" value={d.package_progress.plans} icon={Package} />
            <KpiCard label="Package Completion" value={pct(d.package_progress.completion_rate)} icon={Percent} tone="info" />
            <KpiCard label="Recurring (occurrences)" value={d.recurring.total} icon={Repeat} />
            <KpiCard label="Recurring Adherence" value={pct(d.recurring.adherence)} icon={Percent} tone="success" />
          </KpiGrid>
          <Card>
            <CardHeader><CardTitle>Service Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Service</TableHead><TableHead>Count</TableHead><TableHead>Completed</TableHead>
                  <TableHead>Completion</TableHead><TableHead>Minutes</TableHead><TableHead>Revenue</TableHead><TableHead>Rev / Appt</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {d.services.map((s) => (
                    <TableRow key={s.service_id}>
                      <TableCell className="font-mono text-xs">{s.service_id.slice(0, 8)}</TableCell>
                      <TableCell>{s.count}</TableCell>
                      <TableCell>{s.completed}</TableCell>
                      <TableCell>{pct(s.completion_rate)}</TableCell>
                      <TableCell>{s.minutes}</TableCell>
                      <TableCell>{money(s.revenue)}</TableCell>
                      <TableCell>{money(Math.round(s.revenue_per_appointment))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Doctor Revenue</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Doctor</TableHead><TableHead>Appointments</TableHead><TableHead>Revenue</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {d.doctors.map((r) => (
                    <TableRow key={r.doctor_id}>
                      <TableCell className="font-mono text-xs">{r.doctor_id.slice(0, 8)}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell>{money(r.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
