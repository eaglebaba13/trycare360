/**
 * Commission Workspace — accruals by status with breakdown & actions.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { listAccruals, updateAccrualStatus, recomputeCommissionsForEvent } from "@/lib/commissions/commissions.functions";
import { KpiCard } from "@/components/standards/kpi-card";

export const Route = createFileRoute("/_authenticated/revenue/commissions")({
  component: CommissionWorkspace,
});

const STATUSES = ["draft", "calculated", "under_review", "approved", "locked"] as const;
type Status = (typeof STATUSES)[number];

const NEXT: Record<Status, Status | null> = {
  draft: "calculated",
  calculated: "under_review",
  under_review: "approved",
  approved: "locked",
  locked: null,
};

function fmt(n: number, cur = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function CommissionWorkspace() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const listFn = useServerFn(listAccruals);
  const statusFn = useServerFn(updateAccrualStatus);
  const recomputeFn = useServerFn(recomputeCommissionsForEvent);
  const [status, setStatus] = useState<Status>("calculated");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const q = useQuery({
    queryKey: ["accruals", activeTenantId, status],
    queryFn: () => listFn({ data: { tenant_id: activeTenantId!, status, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId,
  });

  const rows = (q.data?.rows ?? []) as any[];
  const totals = useMemo(() => {
    const sum = rows.reduce((s, r) => s + Number(r.calc_amount ?? 0), 0);
    return { count: rows.length, sum };
  }, [rows]);

  const advanceM = useMutation({
    mutationFn: (payload: { ids: string[]; s: Status }) =>
      statusFn({ data: { tenant_id: activeTenantId!, accrual_ids: payload.ids, status: payload.s } }),
    onSuccess: (r) => {
      toast.success(`Updated ${r.updated} accruals`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["accruals"] });
    },
  });
  const recomputeM = useMutation({
    mutationFn: (revenue_event_id: string) => recomputeFn({ data: { revenue_event_id } }),
    onSuccess: () => {
      toast.success("Recomputed");
      qc.invalidateQueries({ queryKey: ["accruals"] });
    },
  });

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const nextStatus = NEXT[status];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setSelected(new Set()); }}
            className={`text-left rounded-md border p-3 hover:bg-muted/40 ${status === s ? "border-primary bg-muted/40" : ""}`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.replace("_", " ")}</div>
            <div className="mt-1 text-sm font-medium">{status === s ? q.data?.count ?? 0 : "—"}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label={`${status.replace("_"," ")} accruals`} value={totals.count} />
        <KpiCard label={`${status.replace("_"," ")} total`} value={fmt(totals.sum)} tone="info" />
        <KpiCard label="Next transition" value={nextStatus ?? "—"} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Accruals ({status.replace("_"," ")})</CardTitle>
          <div className="flex gap-2">
            {nextStatus && (
              <Button size="sm" disabled={selected.size === 0 || advanceM.isPending}
                onClick={() => advanceM.mutate({ ids: [...selected], s: nextStatus })}>
                Move to {nextStatus.replace("_"," ")}
              </Button>
            )}
            <Button size="sm" variant="outline" disabled={selected.size === 0 || advanceM.isPending}
              onClick={() => advanceM.mutate({ ids: [...selected], s: "hold" as any })}>
              Hold
            </Button>
            <Button size="sm" variant="destructive" disabled={selected.size === 0 || advanceM.isPending}
              onClick={() => advanceM.mutate({ ids: [...selected], s: "reversed" as any })}>
              Reverse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="p-2 w-8"></th>
                  <th className="p-2 text-left">Beneficiary</th>
                  <th className="p-2 text-left">Period</th>
                  <th className="p-2 text-right">Base</th>
                  <th className="p-2 text-right">Commission</th>
                  <th className="p-2 text-left">Computed</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/20">
                    <td className="p-2"><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                    <td className="p-2">
                      <div className="text-xs">
                        <Badge variant="outline">{r.beneficiary_type}</Badge>
                        <div className="text-muted-foreground mt-1 font-mono truncate max-w-[180px]">{r.beneficiary_id}</div>
                      </div>
                    </td>
                    <td className="p-2 font-mono text-xs">{r.period_key}</td>
                    <td className="p-2 text-right tabular-nums">{fmt(Number(r.base_amount), r.currency)}</td>
                    <td className="p-2 text-right tabular-nums font-medium">{fmt(Number(r.calc_amount), r.currency)}</td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(r.computed_at).toLocaleString()}</td>
                    <td className="p-2">
                      <Button size="sm" variant="ghost" onClick={() => recomputeM.mutate(r.revenue_event_id)}>
                        Recompute
                      </Button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No accruals in this bucket.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
