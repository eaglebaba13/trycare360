/** Patient Portal — Health goals & metrics workspace. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import { listHealthGoals, listHealthMetrics, recordHealthMetric } from "@/lib/patient/health.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Goal = { id: string; title?: string | null; goal_type: string; target_value?: number | null; status?: string | null };
type Metric = { id: string; metric_type: string; value: number; unit?: string | null; recorded_at: string };

export function HealthGoalsWorkspace() {
  const fn = useServerFn(listHealthGoals);
  const q = useQuery<Goal[]>({ queryKey: ["patient-goals"], queryFn: () => fn({ data: {} }) as unknown as Promise<Goal[]> });
  const rows = q.data ?? [];
  if (rows.length === 0) return <div className="text-sm text-muted-foreground py-6 text-center">No goals yet.</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((g) => (
        <Card key={g.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">{g.title ?? g.goal_type}</CardTitle>
              {g.status && <Badge variant="outline">{g.status}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {g.target_value != null ? <>Target: <span className="text-foreground">{g.target_value}</span></> : "No target set"}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function HealthMetricsWorkspace() {
  const qc = useQueryClient();
  const listFn = useServerFn(listHealthMetrics);
  const recFn = useServerFn(recordHealthMetric);
  const q = useQuery<Metric[]>({ queryKey: ["patient-metrics"], queryFn: () => listFn({ data: {} }) as unknown as Promise<Metric[]> });
  const [form, setForm] = useState({ metricType: "weight", value: "", unit: "kg" });
  const mut = useMutation({
    mutationFn: () => recFn({ data: { metricType: form.metricType, value: Number(form.value), unit: form.unit, recordedAt: new Date().toISOString() } }),
    onSuccess: () => { toast.success("Recorded"); qc.invalidateQueries({ queryKey: ["patient-metrics"] }); setForm({ ...form, value: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Health Metrics</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-4 items-end">
          <div><Label>Metric</Label><Input value={form.metricType} onChange={(e) => setForm({ ...form, metricType: e.target.value })} /></div>
          <div><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !form.value}>Log</Button>
        </div>
        <DataGrid
          rows={q.data ?? []}
          getRowId={(r) => r.id}
          isLoading={q.isLoading}
          emptyMessage="No metrics recorded yet."
          columns={[
            { id: "when", header: "When", cell: (r) => formatDateTime(r.recorded_at) },
            { id: "type", header: "Metric", cell: (r) => r.metric_type },
            { id: "val", header: "Value", cell: (r) => `${r.value} ${r.unit ?? ""}`, className: "text-right tabular-nums" },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function ProgressCards() {
  return null;
}

export function PatientHealthPage() {
  return (
    <PatientShell title="Health" description="Goals, vitals and progress.">
      <div className="space-y-4">
        <HealthGoalsWorkspace />
        <HealthMetricsWorkspace />
      </div>
    </PatientShell>
  );
}
