import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createReturn, listReturns } from "@/lib/pharmacy/returns.functions";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataGrid } from "@/components/standards/data-grid";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Disposition = "restock" | "quarantine" | "destroy";
type ReturnKind = "patient" | "supplier";

type ItemDraft = {
  key: string;
  drugId: string;
  batchId: string;
  quantity: string;
  unitCode: string;
  disposition: Disposition;
  notes: string;
};

type ReturnRow = {
  id: string;
  return_number?: string | null;
  return_type: string;
  warehouse_id: string;
  patient_id: string | null;
  supplier_id: string | null;
  reason_code: string | null;
  return_date: string;
  status: string;
};

// ---------------------------------------------------------------------------
// ReturnReasonDialog — reusable prompt for a reason string
// ---------------------------------------------------------------------------
export function ReturnReasonDialog({
  onConfirm,
  trigger,
  title = "Return reason",
}: {
  onConfirm: (reason: string) => void;
  trigger: ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Reason code</Label>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!reason} onClick={() => { onConfirm(reason); setOpen(false); }}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ReturnItemsGrid — editable item lines during creation
// ---------------------------------------------------------------------------
export function ReturnItemsGrid({
  items,
  onChange,
}: {
  items: ItemDraft[];
  onChange: (next: ItemDraft[]) => void;
}) {
  const update = (key: string, patch: Partial<ItemDraft>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const remove = (key: string) => onChange(items.filter((i) => i.key !== key));
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.key} className="grid grid-cols-12 gap-2 items-end rounded border p-2">
          <div className="col-span-3"><Label className="text-xs">Drug ID</Label><Input value={it.drugId} onChange={(e) => update(it.key, { drugId: e.target.value })} className="font-mono text-xs" /></div>
          <div className="col-span-3"><Label className="text-xs">Batch ID</Label><Input value={it.batchId} onChange={(e) => update(it.key, { batchId: e.target.value })} className="font-mono text-xs" /></div>
          <div className="col-span-1"><Label className="text-xs">Qty</Label><Input value={it.quantity} onChange={(e) => update(it.key, { quantity: e.target.value })} inputMode="decimal" /></div>
          <div className="col-span-1"><Label className="text-xs">Unit</Label><Input value={it.unitCode} onChange={(e) => update(it.key, { unitCode: e.target.value })} /></div>
          <div className="col-span-3">
            <Label className="text-xs">Disposition</Label>
            <Select value={it.disposition} onValueChange={(v) => update(it.key, { disposition: v as Disposition })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock</SelectItem>
                <SelectItem value="quarantine">Quarantine</SelectItem>
                <SelectItem value="destroy">Destroy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-1 flex justify-end">
            <Button variant="ghost" size="icon" onClick={() => remove(it.key)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReturnDialog — create patient / supplier return
// ---------------------------------------------------------------------------
export function ReturnDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReturnKind>("patient");
  const [warehouseId, setWarehouseId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([
    { key: crypto.randomUUID(), drugId: "", batchId: "", quantity: "1", unitCode: "unit", disposition: "restock", notes: "" },
  ]);

  const qc = useQueryClient();
  const fn = useServerFn(createReturn);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          tenantId,
          warehouseId,
          returnType: kind,
          patientId: kind === "patient" ? patientId : null,
          supplierId: kind === "supplier" ? supplierId : null,
          reasonCode: reason || null,
          notes: notes || null,
          items: items.map((i) => ({
            drugId: i.drugId,
            batchId: i.batchId || null,
            quantity: Number(i.quantity),
            unitCode: i.unitCode,
            disposition: i.disposition,
            notes: i.notes || null,
          })),
        } as never,
      }),
    onSuccess: () => {
      toast.success("Return recorded");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pharmacy-returns"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canSubmit =
    !!warehouseId &&
    (kind === "patient" ? !!patientId : !!supplierId) &&
    items.every((i) => i.drugId && Number(i.quantity) > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New return</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Record return</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Return type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as ReturnKind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient return</SelectItem>
                  <SelectItem value="supplier">Supplier return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warehouse ID</Label>
              <Input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="font-mono" />
            </div>
            {kind === "patient" ? (
              <div>
                <Label>Patient ID</Label>
                <Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="font-mono" />
              </div>
            ) : (
              <div>
                <Label>Supplier ID</Label>
                <Input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="font-mono" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Reason code</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <ReturnItemsGrid items={items} onChange={setItems} />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setItems((xs) => [
                ...xs,
                { key: crypto.randomUUID(), drugId: "", batchId: "", quantity: "1", unitCode: "unit", disposition: "restock", notes: "" },
              ])
            }
          >
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Saving…" : "Record return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ReturnsList
// ---------------------------------------------------------------------------
export function ReturnsList({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listReturns);
  const q = useQuery({
    queryKey: ["pharmacy-returns", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 100 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: ReturnRow[] } | undefined)?.rows ?? []) as ReturnRow[];
  return (
    <DataGrid<ReturnRow>
      rows={rows}
      getRowId={(r) => r.id}
      isLoading={q.isLoading}
      emptyMessage="No returns recorded."
      columns={[
        { id: "no", header: "Return #", cell: (r) => <span className="font-mono text-xs">{r.return_number ?? r.id.slice(0, 8)}</span> },
        { id: "type", header: "Type", cell: (r) => <Badge variant="outline">{r.return_type}</Badge> },
        { id: "party", header: "Party", cell: (r) => <span className="font-mono text-xs">{(r.patient_id ?? r.supplier_id ?? "—").slice(0, 8)}</span> },
        { id: "wh", header: "Warehouse", cell: (r) => <span className="font-mono text-xs">{r.warehouse_id.slice(0, 8)}</span> },
        { id: "reason", header: "Reason", cell: (r) => r.reason_code ?? "—" },
        { id: "date", header: "Date", cell: (r) => new Date(r.return_date).toLocaleDateString() },
        { id: "status", header: "Status", cell: (r) => <Badge>{r.status}</Badge> },
      ]}
    />
  );
}
