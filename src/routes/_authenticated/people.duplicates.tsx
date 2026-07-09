import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageContainer } from "@/components/app-shell";
import { DataGrid, FilterBar } from "@/components/standards";
import type { DataGridColumn } from "@/components/standards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { searchDuplicates, reviewDuplicate } from "@/lib/identity/dedup.functions";
import { previewMerge, executeMerge } from "@/lib/identity/merge.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { percent } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/people/duplicates")({
  component: DuplicateQueue,
});

type DuplicateRow = {
  id: string;
  person_a_id: string;
  person_b_id: string;
  score: number;
  status: string;
  reasons?: unknown;
  updated_at: string;
};

function DuplicateQueue() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("open");
  const [minScore, setMinScore] = useState<string>("0.45");
  const [offset, setOffset] = useState(0);
  const [previewFor, setPreviewFor] = useState<DuplicateRow | null>(null);
  const limit = 25;

  const searchFn = useServerFn(searchDuplicates);
  const reviewFn = useServerFn(reviewDuplicate);
  const previewFn = useServerFn(previewMerge);
  const executeFn = useServerFn(executeMerge);

  const q = useQuery({
    queryKey: ["duplicates", activeTenantId, status, minScore, offset],
    queryFn: () =>
      searchFn({
        data: {
          tenant_id: activeTenantId!,
          status: status as "open" | "reviewing" | "approved" | "rejected" | "deferred",
          min_score: Number(minScore),
          limit,
          offset,
        },
      }),
    enabled: !!activeTenantId,
  });

  const reviewMut = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" | "deferred" }) =>
      reviewFn({ data: { tenant_id: activeTenantId!, id: v.id, decision: v.decision } }),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["duplicates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewQ = useQuery({
    queryKey: ["merge-preview", previewFor?.person_a_id, previewFor?.person_b_id],
    queryFn: () =>
      previewFn({
        data: { source_id: previewFor!.person_a_id, target_id: previewFor!.person_b_id },
      }),
    enabled: !!previewFor,
  });

  const executeMut = useMutation({
    mutationFn: () =>
      executeFn({
        data: {
          source_id: previewFor!.person_a_id,
          target_id: previewFor!.person_b_id,
          reason: "Merged via duplicate queue",
        },
      }),
    onSuccess: () => {
      toast.success("Merge executed");
      setPreviewFor(null);
      qc.invalidateQueries({ queryKey: ["duplicates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (q.data?.rows ?? []) as DuplicateRow[];

  const columns: DataGridColumn<DuplicateRow>[] = [
    {
      id: "score",
      header: "Confidence",
      width: "140px",
      cell: (r) => {
        const s = Number(r.score);
        const tone = s >= 0.9 ? "bg-emerald-500" : s >= 0.7 ? "bg-amber-500" : "bg-sky-500";
        return (
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${tone}`} />
            <span className="tabular-nums font-medium">{percent(s)}</span>
          </div>
        );
      },
    },
    { id: "pair", header: "Pair", cell: (r) => (
      <div className="text-xs font-mono">
        <div className="truncate">A: {r.person_a_id.slice(0, 8)}…</div>
        <div className="truncate">B: {r.person_b_id.slice(0, 8)}…</div>
      </div>
    )},
    {
      id: "reasons",
      header: "Reasons",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(r.reasons) ? r.reasons : []).slice(0, 4).map((x, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">{String((x as { name?: string })?.name ?? x)}</Badge>
          ))}
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (r) => <Badge variant="secondary" className="capitalize">{r.status}</Badge> },
    {
      id: "actions",
      header: "Actions",
      cell: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setPreviewFor(r)}>Preview merge</Button>
          <Button size="sm" variant="ghost" onClick={() => reviewMut.mutate({ id: r.id, decision: "rejected" })}>Reject</Button>
          <Button size="sm" variant="ghost" onClick={() => reviewMut.mutate({ id: r.id, decision: "deferred" })}>Defer</Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="Duplicate queue" description="Review probable duplicate persons and merge or dismiss.">
      <div className="space-y-3">
        <FilterBar>
          <Select value={status} onValueChange={(v) => { setStatus(v); setOffset(0); }}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
          <Select value={minScore} onValueChange={(v) => { setMinScore(v); setOffset(0); }}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.45">Min score 45%</SelectItem>
              <SelectItem value="0.7">Min score 70%</SelectItem>
              <SelectItem value="0.9">Min score 90%</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          isLoading={q.isLoading}
          pagination={{ limit, offset, total: q.data?.total ?? null, onOffset: setOffset }}
        />
      </div>

      <Dialog open={!!previewFor} onOpenChange={(v) => !v && setPreviewFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Merge preview (dry-run)</DialogTitle>
          </DialogHeader>
          {previewQ.isLoading && <div className="text-sm text-muted-foreground">Running dry-run…</div>}
          {previewQ.data && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-4">
                <div><span className="text-muted-foreground">Blocked:</span> <strong>{String(previewQ.data.blocked)}</strong></div>
                <div><span className="text-muted-foreground">Rollback:</span> <strong>{String(previewQ.data.rollback_supported)}</strong></div>
                <div><span className="text-muted-foreground">Est.:</span> <strong>{previewQ.data.estimated_ms}ms</strong></div>
                <div><span className="text-muted-foreground">Rows:</span> <strong>{previewQ.data.total_affected_rows}</strong></div>
              </div>
              {previewQ.data.warnings && previewQ.data.warnings.length > 0 && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-amber-700 dark:text-amber-300">
                  {previewQ.data.warnings.map((w, i) => (<div key={i}>{w}</div>))}
                </div>
              )}
              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr><th className="text-left p-2">Table</th><th className="text-left p-2">Column</th><th className="text-right p-2">Rows</th></tr>
                  </thead>
                  <tbody>
                    {(previewQ.data.per_table ?? []).map((t, i) => (
                      <tr key={i} className="border-t"><td className="p-2 font-mono">{t.table}</td><td className="p-2 font-mono">{t.column}</td><td className="p-2 text-right tabular-nums">{t.candidate_count}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFor(null)}>Cancel</Button>
            <Button
              disabled={executeMut.isPending || previewQ.data?.blocked}
              onClick={() => executeMut.mutate()}
            >
              {executeMut.isPending ? "Merging…" : "Execute merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
