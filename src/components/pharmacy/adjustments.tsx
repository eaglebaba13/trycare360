import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adjustStock, listInventoryLedger } from "@/lib/pharmacy/inventory.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid } from "@/components/standards/data-grid";
import { toast } from "sonner";

type LedgerRow = {
  id: string;
  posted_at: string;
  movement_type: string;
  drug_id: string;
  warehouse_id: string;
  quantity_delta: number;
  unit_code: string;
  reason_code: string | null;
};

export function AdjustmentDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [drugId, setDrugId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unit, setUnit] = useState("unit");
  const [reason, setReason] = useState("cycle_count");
  const qc = useQueryClient();
  const fn = useServerFn(adjustStock);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          tenantId,
          warehouseId,
          drugId,
          batchId: batchId || null,
          quantity: Number(quantity),
          unitCode: unit,
          reasonCode: reason,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Adjustment posted");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pharmacy-ledger-all"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-stock"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to post adjustment"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Post adjustment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Post stock adjustment</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Warehouse ID</Label><Input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="uuid" /></div>
          <div className="col-span-2"><Label>Drug ID</Label><Input value={drugId} onChange={(e) => setDrugId(e.target.value)} placeholder="uuid" /></div>
          <div className="col-span-2"><Label>Batch ID (optional)</Label><Input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="uuid" /></div>
          <div><Label>Quantity (± signed)</Label><Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" /></div>
          <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          <div className="col-span-2"><Label>Reason code</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !warehouseId || !drugId || !reason}>
            {mut.isPending ? "Posting…" : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustmentHistory({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listInventoryLedger);
  const q = useQuery({
    queryKey: ["pharmacy-ledger-all", tenantId],
    queryFn: () => fn({ data: { tenantId, movementType: "adjustment", limit: 100 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: LedgerRow[] } | undefined)?.rows ?? []) as LedgerRow[];
  return (
    <DataGrid<LedgerRow>
      rows={rows}
      getRowId={(r) => r.id}
      isLoading={q.isLoading}
      emptyMessage="No adjustments recorded."
      columns={[
        { id: "when", header: "Posted at", cell: (r) => <span className="text-xs">{new Date(r.posted_at).toLocaleString()}</span> },
        { id: "type", header: "Type", cell: (r) => r.movement_type },
        { id: "drug", header: "Drug", cell: (r) => <span className="font-mono text-xs">{r.drug_id?.slice(0, 8)}</span> },
        { id: "wh", header: "Warehouse", cell: (r) => <span className="font-mono text-xs">{r.warehouse_id?.slice(0, 8)}</span> },
        { id: "qty", header: "Δ Qty", cell: (r) => <span className="tabular-nums">{r.quantity_delta} {r.unit_code}</span> },
        { id: "reason", header: "Reason", cell: (r) => r.reason_code ?? "—" },
      ]}
    />
  );
}
