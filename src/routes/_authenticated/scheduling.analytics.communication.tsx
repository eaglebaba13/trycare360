import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, BellOff, CalendarCheck, CalendarX, Video, Percent } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { getCommunicationAnalytics } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/communication")({
  component: CommunicationTab,
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function CommunicationTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getCommunicationAnalytics);
  const q = useQuery({
    queryKey: ["sched-comm", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const d = q.data;

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={(d?.reminders.by_channel ?? []) as unknown as Record<string, unknown>[]} exportName="scheduling-communication" />
      {d && (
        <>
          <KpiGrid>
            <KpiCard label="Reminders Sent" value={d.reminders.sent} icon={Bell} tone="success" />
            <KpiCard label="Reminder Delivery" value={pct(d.reminders.delivery_rate)} icon={Percent} tone="success" />
            <KpiCard label="Reminder Failures" value={d.reminders.failed} icon={BellOff} tone="danger" />
            <KpiCard label="Reminder Failure Rate" value={pct(d.reminders.failure_rate)} icon={Percent} tone="warning" />
            <KpiCard label="Calendar Sync Success" value={pct(d.calendar_sync.success_rate)} icon={CalendarCheck} tone="success" hint={`${d.calendar_sync.success}/${d.calendar_sync.total}`} />
            <KpiCard label="Calendar Sync Failures" value={d.calendar_sync.failed} icon={CalendarX} tone="danger" />
            <KpiCard label="Video Consultations" value={d.video.total} icon={Video} tone="info" />
            <KpiCard label="Video Completed" value={d.video.completed} icon={Video} tone="success" />
          </KpiGrid>
          <Card>
            <CardHeader><CardTitle>Reminder Channel Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Channel</TableHead><TableHead>Total</TableHead><TableHead>Sent</TableHead><TableHead>Failed</TableHead><TableHead>Delivery</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {d.reminders.by_channel.map((c) => (
                    <TableRow key={c.channel}>
                      <TableCell className="capitalize">{c.channel}</TableCell>
                      <TableCell>{c.total}</TableCell>
                      <TableCell>{c.sent}</TableCell>
                      <TableCell>{c.failed}</TableCell>
                      <TableCell>{c.total > 0 ? pct(c.sent / c.total) : "—"}</TableCell>
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
