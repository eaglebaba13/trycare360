import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageContainer } from "@/components/app-shell";
import { DataGrid } from "@/components/standards";
import type { DataGridColumn } from "@/components/standards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { listMergeHistory, unmergePerson } from "@/lib/identity/merge.functions";
import { formatDateTime } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/people/merges")({
  component: MergeHistoryPage,
});

type Row = {
  id: string;
  action: string;
  source_person_id: string;
  target_person_id: string;
  performed_at: string;
  performed_by: string | null;
  execution_ms: number | null;
  reason: string | null;
};

function MergeHistoryPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const listFn = useServerFn(listMergeHistory);
  const unmergeFn = useServerFn(unmergePerson);

  const q = useQuery({
    queryKey: ["merges", activeTenantId, offset],
    queryFn: () => listFn({ data: { tenant_id: activeTenantId!, limit, offset } }),
    enabled: !!activeTenantId,
  });

  const unmergeMut = useMutation({
    mutationFn: (id: string) => unmergeFn({ data: { history_id: id, reason: "Rolled back from UI" } }),
    onSuccess: () => {
      toast.success("Unmerge complete");
      qc.invalidateQueries({ queryKey: ["merges"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (q.data?.rows ?? []) as Row[];

  const columns: DataGridColumn<Row>[] = [
    { id: "action", header: "Action", cell: (r) => <Badge variant={r.action === "merge" ? "default" : "secondary"} className="capitalize">{r.action}</Badge> },
    { id: "pair", header: "Source → Target", cell: (r) => (
      <div className="text-xs font-mono">{r.source_person_id.slice(0, 8)}… → {r.target_person_id.slice(0, 8)}…</div>
    )},
    { id: "when", header: "When", cell: (r) => formatDateTime(r.performed_at) },
    { id: "ms", header: "Exec (ms)", cell: (r) => <span className="tabular-nums">{r.execution_ms ?? "—"}</span> },
    { id: "by", header: "By", cell: (r) => <span className="text-xs font-mono">{r.performed_by?.slice(0, 8) ?? "—"}…</span> },
    { id: "reason", header: "Reason", cell: (r) => r.reason ?? <span className="text-muted-foreground">—</span> },
    {
      id: "actions",
      header: "",
      cell: (r) => r.action === "merge" ? (
        <Button size="sm" variant="outline" disabled={unmergeMut.isPending} onClick={() => unmergeMut.mutate(r.id)}>
          Unmerge
        </Button>
      ) : null,
    },
  ];

  return (
    <PageContainer title="Merge history" description="Audit trail of merge and unmerge operations across the registry.">
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        pagination={{ limit, offset, total: q.data?.total ?? null, onOffset: setOffset }}
      />
    </PageContainer>
  );
}
