import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Users, Repeat, UserX, Star, ThumbsUp, XCircle, Percent } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { getPatientAnalytics } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/patients")({
  component: PatientsTab,
});

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function PatientsTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const fn = useServerFn(getPatientAnalytics);
  const q = useQuery({
    queryKey: ["sched-pat", activeTenantId, win.from, win.to, win.branch_id],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });
  const k = q.data;

  return (
    <div className="space-y-4">
      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={k ? [k as unknown as Record<string, unknown>] : []} exportName="scheduling-patients" />
      {k && (
        <KpiGrid>
          <KpiCard label="Distinct Patients" value={k.distinct_patients} icon={Users} />
          <KpiCard label="Total Appointments" value={k.total_appointments} icon={Users} />
          <KpiCard label="Repeat Visit Rate" value={pct(k.repeat_visit_rate)} icon={Repeat} tone="success" />
          <KpiCard label="Cancellation Rate" value={pct(k.cancellation_rate)} icon={XCircle} tone="warning" />
          <KpiCard label="No-show Rate" value={pct(k.no_show_rate)} icon={UserX} tone="danger" />
          <KpiCard label="Reschedule Rate" value={pct(k.reschedule_rate)} icon={Repeat} tone="info" />
          <KpiCard label="Feedback Avg" value={k.feedback_avg_rating || "—"} icon={Star} hint={`${k.feedback_count} responses`} />
          <KpiCard label="NPS" value={k.nps || "—"} icon={ThumbsUp} tone={k.nps >= 50 ? "success" : k.nps >= 0 ? "info" : "danger"} />
          <KpiCard label="—" value="" icon={Percent} hint="Additional patient KPIs surface as feedback volume grows" />
        </KpiGrid>
      )}
    </div>
  );
}
