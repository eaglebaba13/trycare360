import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listWorkflowRuns, retryWorkflowRun, cancelWorkflowRun,
} from "@/lib/api/automation.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCcw, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/automation/runs")({
  component: RunsPage,
});

type Run = {
  id: string; status: string; started_at: string; finished_at: string | null;
  error: string | null; trigger_source: string | null;
  workflow: { name: string; code: string } | null;
};

const STATUS_TONE: Record<string, string> = {
  queued: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  running: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  waiting: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

function RunsPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const list = useServerFn(listWorkflowRuns);
  const retry = useServerFn(retryWorkflowRun);
  const cancel = useServerFn(cancelWorkflowRun);

  const { data = [], isLoading } = useQuery({
    queryKey: ["automation", "runs", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId! } }) as Promise<Run[]>,
    enabled: !!activeTenantId,
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => retry({ data: { id } }),
    onSuccess: () => { toast.success("Requeued"); qc.invalidateQueries({ queryKey: ["automation", "runs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["automation", "runs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!activeTenantId) {
    return <div className="text-sm text-muted-foreground">Select a tenant to view runs.</div>;
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">Workflow runs</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every triggered or manual run for this tenant. Failed runs can be requeued from here.
        </p>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workflow</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32">Source</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Finished</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No runs yet.</TableCell></TableRow>
            ) : data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.workflow?.name ?? "—"}
                  <div className="text-xs font-mono text-muted-foreground">{r.workflow?.code ?? ""}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className={STATUS_TONE[r.status] ?? ""}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs capitalize">{r.trigger_source ?? "—"}</TableCell>
                <TableCell className="text-xs">{new Date(r.started_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs">{r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs text-destructive max-w-xs truncate">{r.error ?? ""}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {(r.status === "failed" || r.status === "cancelled") && (
                      <Button variant="ghost" size="icon" title="Retry"
                        onClick={() => retryMut.mutate(r.id)} disabled={retryMut.isPending}>
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(r.status === "queued" || r.status === "running" || r.status === "waiting") && (
                      <Button variant="ghost" size="icon" title="Cancel"
                        onClick={() => cancelMut.mutate(r.id)} disabled={cancelMut.isPending}>
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
