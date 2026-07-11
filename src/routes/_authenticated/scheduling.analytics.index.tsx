import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KpiCard, KpiGrid } from "@/components/standards";
import { CalendarCheck, XCircle, Repeat, UserX, Timer, Percent, Clock, Activity } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { getSchedulingExecutiveKpis } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/")({
  component: ExecutiveTab,
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function ExecutiveTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getSchedulingExecutiveKpis);
  const q = useQuery({
    queryKey: ["sched-exec", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const k = q.data;

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={k ? [k as unknown as Record<string, unknown>] : []} exportName="scheduling-executive" />
      {k && (
        <>
          <KpiGrid>
            <KpiCard label="Total Appointments" value={k.total} icon={CalendarCheck} />
            <KpiCard label="Completed" value={k.completed} tone="success" icon={CalendarCheck} />
            <KpiCard label="Cancelled" value={k.cancelled} tone="warning" icon={XCircle} />
            <KpiCard label="Rescheduled" value={k.rescheduled} tone="info" icon={Repeat} />
            <KpiCard label="No-show" value={k.no_show} tone="danger" icon={UserX} />
            <KpiCard label="Check-in Rate" value={pct(k.check_in_rate)} tone="info" icon={Percent} />
            <KpiCard label="Completion Rate" value={pct(k.completion_rate)} tone="success" icon={Percent} />
            <KpiCard label="Fill Rate" value={pct(k.fill_rate)} tone="info" icon={Percent} hint="booked / capacity" />
          </KpiGrid>
          <KpiGrid>
            <KpiCard label="Avg Wait" value={`${k.avg_wait_minutes}m`} icon={Timer} />
            <KpiCard label="Avg Consultation" value={`${k.avg_consultation_minutes}m`} icon={Clock} />
            <KpiCard label="On-time Rate" value={pct(k.on_time_rate)} tone="success" icon={Percent} />
            <KpiCard label="Avg Lead Time" value={`${k.avg_lead_time_hours}h`} icon={Clock} />
            <KpiCard label="Reschedule Delay" value={`${k.avg_reschedule_delay_hours}h`} icon={Repeat} />
            <KpiCard label="Walk-in Conversion" value={pct(k.walk_in_conversion_rate)} tone="info" icon={Percent} />
            <KpiCard label="Queue Abandonment" value={pct(k.queue_abandonment_rate)} tone="warning" icon={Activity} />
          </KpiGrid>
        </>
      )}
    </div>
  );
}
