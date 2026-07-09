import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { assessmentAnalytics } from "@/lib/assessment/assessment.functions";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/consultations/analytics")({
  component: Analytics,
});

function Analytics() {
  const fn = useServerFn(assessmentAnalytics);
  const { data } = useQuery({ queryKey: ["assessment-analytics"], queryFn: () => fn({ data: {} }) });

  const totals = data ?? { total: 0, completed: 0, conversion: 0, byStatus: {}, byCategory: {}, bySource: {} };

  return (
    <div className="space-y-6">
      <KpiGrid>
        <KpiCard label="Total consultations" value={totals.total} icon={Users} />
        <KpiCard label="Completed" value={totals.completed} tone="success" icon={CheckCircle2} />
        <KpiCard label="Completion rate" value={`${totals.conversion}%`} tone="info" icon={TrendingUp} />
        <KpiCard label="In progress" value={totals.byStatus?.in_progress ?? 0} icon={Activity} />
      </KpiGrid>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">By category</CardTitle></CardHeader>
          <CardContent><Breakdown data={totals.byCategory} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By status</CardTitle></CardHeader>
          <CardContent><Breakdown data={totals.byStatus} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">By source</CardTitle></CardHeader>
          <CardContent><Breakdown data={totals.bySource} /></CardContent>
        </Card>
      </div>
    </div>
  );
}

function Breakdown({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data ?? {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <div className="text-sm text-muted-foreground">No data</div>;
  return (
    <ul className="space-y-2">
      {entries.map(([k, v]) => (
        <li key={k} className="text-sm">
          <div className="flex justify-between"><span className="capitalize">{k.replace(/_/g, " ")}</span><span className="tabular-nums text-muted-foreground">{v}</span></div>
          <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
