import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Timer, Clock, Activity, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenant } from "@/hooks/use-tenant";
import { getQueueAnalytics } from "@/lib/scheduling/queue-lists.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/queue")({
  component: QueueTab,
});

function QueueTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getQueueAnalytics);
  const q = useQuery({
    queryKey: ["sched-queue-an", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const d = q.data;

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={(d?.queues ?? []) as unknown as Record<string, unknown>[]} exportName="scheduling-queue" />
      {d && (
        <>
          <KpiGrid>
            <KpiCard label="Total Tokens" value={d.overall.total_tokens} icon={Activity} />
            <KpiCard label="Avg Wait" value={`${d.overall.avg_wait_minutes}m`} icon={Timer} tone="info" />
            <KpiCard label="Avg Service Time" value={`${d.overall.avg_service_minutes}m`} icon={Clock} tone="info" />
            <KpiCard label="Queues Tracked" value={d.queues.length} icon={ShieldCheck} />
          </KpiGrid>
          <Card>
            <CardHeader><CardTitle>Per-Queue Performance</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Queue</TableHead><TableHead>Total</TableHead><TableHead>Waiting</TableHead>
                  <TableHead>Avg Wait (m)</TableHead><TableHead>Avg Service (m)</TableHead><TableHead>SLA Breaches</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {d.queues.map((r) => (
                    <TableRow key={r.queue_id}>
                      <TableCell className="font-mono text-xs">{r.queue_id.slice(0, 8)}</TableCell>
                      <TableCell>{r.total}</TableCell>
                      <TableCell>{r.waiting_now}</TableCell>
                      <TableCell>{r.avg_wait}</TableCell>
                      <TableCell>{r.avg_service}</TableCell>
                      <TableCell>{r.sla_breaches}</TableCell>
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
