import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listReports, upsertReport, deleteReport, listReportRuns, queueReportRun,
} from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Play, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/reports")({
  component: ReportsPage,
});

type Report = { id: string; code: string; name: string; module: string | null; data_source: string; is_active: boolean; tenant_id: string | null };
type Run = { id: string; report_id: string; status: string; format: string; row_count: number | null; created_at: string; error: string | null };

const FORMATS = ["pdf", "excel", "csv", "json"] as const;

function ReportsPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const listFn = useServerFn(listReports);
  const saveFn = useServerFn(upsertReport);
  const delFn = useServerFn(deleteReport);
  const runsFn = useServerFn(listReportRuns);
  const queueFn = useServerFn(queueReportRun);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Report> & { columns?: string; filters?: string }>({});

  const { data: reports = [] } = useQuery({
    queryKey: ["data", "reports", activeTenantId],
    queryFn: () => listFn({ data: { tenantId: activeTenantId } }) as Promise<Report[]>,
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["data", "runs", activeTenantId],
    queryFn: () => runsFn({ data: { tenantId: activeTenantId! } }) as Promise<Run[]>,
    enabled: !!activeTenantId,
  });

  const save = useMutation({
    mutationFn: () => {
      let cols: unknown = [];
      let filters: unknown = [];
      try { cols = form.columns ? JSON.parse(form.columns) : []; } catch { throw new Error("Invalid columns JSON"); }
      try { filters = form.filters ? JSON.parse(form.filters) : []; } catch { throw new Error("Invalid filters JSON"); }
      return saveFn({ data: {
        tenant_id: activeTenantId, code: form.code!, name: form.name!,
        module: form.module ?? null, data_source: form.data_source!,
        columns: cols as never, filters: filters as never,
        group_by: [], sort: [], layout: {}, is_active: form.is_active ?? true,
      } });
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); setForm({}); qc.invalidateQueries({ queryKey: ["data", "reports"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["data", "reports"] }); },
  });
  const runReport = useMutation({
    mutationFn: ({ id, fmt }: { id: string; fmt: (typeof FORMATS)[number] }) =>
      queueFn({ data: { tenantId: activeTenantId!, reportId: id, format: fmt, params: {} } }),
    onSuccess: () => { toast.success("Run queued"); qc.invalidateQueries({ queryKey: ["data", "runs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Report definitions</h3>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New report</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Data source</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No reports yet.</TableCell></TableRow>}
            {reports.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium flex items-center gap-2"><FileBarChart className="h-4 w-4 text-muted-foreground" />{r.name}</TableCell>
                <TableCell>{r.module && <Badge variant="secondary">{r.module}</Badge>}</TableCell>
                <TableCell className="font-mono text-xs">{r.data_source}</TableCell>
                <TableCell><Badge variant="outline">{r.tenant_id ? "tenant" : "global"}</Badge></TableCell>
                <TableCell className="text-right space-x-1">
                  {FORMATS.map((fmt) => (
                    <Button key={fmt} size="sm" variant="ghost" onClick={() => runReport.mutate({ id: r.id, fmt })}>
                      <Play className="h-3 w-3 mr-1" />{fmt}
                    </Button>
                  ))}
                  {r.tenant_id && (
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Recent runs</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No runs.</TableCell></TableRow>}
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.report_id.slice(0, 8)}</TableCell>
                <TableCell><Badge variant={r.status === "failed" ? "destructive" : r.status === "completed" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>{r.format}</TableCell>
                <TableCell>{r.row_count ?? "—"}</TableCell>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-destructive truncate max-w-xs">{r.error}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Module</Label><Input value={form.module ?? ""} onChange={(e) => setForm({ ...form, module: e.target.value })} placeholder="crm, clinical…" /></div>
              <div><Label>Data source (table/view/RPC)</Label><Input value={form.data_source ?? ""} onChange={(e) => setForm({ ...form, data_source: e.target.value })} /></div>
            </div>
            <div><Label>Columns (JSON array)</Label>
              <Textarea rows={3} className="font-mono text-xs"
                value={form.columns ?? ""} onChange={(e) => setForm({ ...form, columns: e.target.value })}
                placeholder='[{"key":"name","label":"Name"},{"key":"total","label":"Total","agg":"sum"}]' />
            </div>
            <div><Label>Filters (JSON array)</Label>
              <Textarea rows={2} className="font-mono text-xs"
                value={form.filters ?? ""} onChange={(e) => setForm({ ...form, filters: e.target.value })}
                placeholder='[{"field":"created_at","op":"between"}]' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.code || !form.name || !form.data_source}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
