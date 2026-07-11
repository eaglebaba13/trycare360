import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { Timer, Users, Stethoscope, AlertTriangle, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  getQueueAnalytics,
  listQueues,
} from "@/lib/scheduling/queue-lists.functions";

export const Route = createFileRoute(
  "/_authenticated/scheduling/queue-analytics",
)({
  component: QueueAnalyticsPage,
});

function QueueAnalyticsPage() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);

  const range = useMemo(
    () => ({
      from: startOfDay(subDays(date, 6)).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const analyticsFn = useServerFn(getQueueAnalytics);
  const queuesFn = useServerFn(listQueues);

  const analyticsQ = useQuery({
    queryKey: ["queue-analytics", activeTenantId, branchId, range.from],
    queryFn: () =>
      analyticsFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          from: range.from,
          to: range.to,
        },
      }),
    enabled: !!activeTenantId,
  });

  const queuesQ = useQuery({
    queryKey: ["queues-all", activeTenantId, branchId],
    queryFn: () =>
      queuesFn({
        data: { tenant_id: activeTenantId!, branch_id: branchId },
      }),
    enabled: !!activeTenantId,
  });
  const queueMap = new Map(
    (queuesQ.data?.rows ?? []).map((q) => [q.id, q]),
  );

  const overall = analyticsQ.data?.overall;
  const queues = analyticsQ.data?.queues ?? [];

  const KPIS = [
    {
      label: "Avg wait",
      value: `${overall?.avg_wait_minutes ?? 0}m`,
      Icon: Timer,
      tone: "text-amber-600",
    },
    {
      label: "Avg service",
      value: `${overall?.avg_service_minutes ?? 0}m`,
      Icon: Stethoscope,
      tone: "text-emerald-600",
    },
    {
      label: "Total tokens",
      value: overall?.total_tokens ?? 0,
      Icon: Users,
      tone: "text-blue-600",
    },
    {
      label: "SLA breaches",
      value: queues.reduce((s, q) => s + q.sla_breaches, 0),
      Icon: AlertTriangle,
      tone: "text-rose-600",
    },
    {
      label: "Active queues",
      value: queues.length,
      Icon: Activity,
      tone: "text-violet-600",
    },
  ];

  return (
    <SchedulerShell
      title="Queue Analytics"
      subtitle="Wait times, service times, doctor throughput and SLA trends."
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {KPIS.map(({ label, value, Icon, tone }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-muted-foreground">
                  {label}
                </div>
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {analyticsQ.isLoading ? "…" : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 text-sm font-medium">
            Per-queue performance (last 7 days)
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2">Queue</th>
                <th className="text-right px-4 py-2">Total</th>
                <th className="text-right px-4 py-2">Waiting now</th>
                <th className="text-right px-4 py-2">Avg wait</th>
                <th className="text-right px-4 py-2">Avg service</th>
                <th className="text-right px-4 py-2">SLA breaches</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((q) => {
                const meta = queueMap.get(q.queue_id);
                return (
                  <tr key={q.queue_id} className="border-t">
                    <td className="px-4 py-2">
                      {meta?.name ?? q.queue_id.slice(0, 8)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {meta?.code}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {q.total}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {q.waiting_now}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {q.avg_wait}m
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {q.avg_service}m
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {q.sla_breaches}
                    </td>
                  </tr>
                );
              })}
              {queues.length === 0 && !analyticsQ.isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No queue activity in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </SchedulerShell>
  );
}
