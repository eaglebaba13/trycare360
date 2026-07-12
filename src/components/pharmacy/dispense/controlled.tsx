import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { postControlledEntry, listControlledRegister } from "@/lib/pharmacy/controlled.functions";
import { DataGrid } from "@/components/standards/data-grid";
import { TimelinePanel, type TimelineItem } from "@/components/standards/timeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, Plus } from "lucide-react";
import { toast } from "sonner";

type EntryType = "receipt" | "dispense" | "adjustment" | "destroy" | "transfer_in" | "transfer_out";

type RegisterRow = {
  id: string;
  posted_at: string;
  schedule_code: string;
  entry_type: string;
  drug_id: string;
  warehouse_id: string;
  batch_id: string | null;
  quantity_in: number;
  quantity_out: number;
  balance_after: number | null;
  witness_id: string | null;
  patient_id: string | null;
  discrepancy: boolean | null;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// VarianceAlert
// ---------------------------------------------------------------------------
export function VarianceAlert({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm flex items-center gap-2 text-rose-700 dark:text-rose-400">
      <AlertTriangle className="h-4 w-4" />
      <span>{count} controlled-drug variance {count === 1 ? "entry" : "entries"} pending review.</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WitnessPanel — display witness assignment for an entry
// ---------------------------------------------------------------------------
export function WitnessPanel({ witnessId }: { witnessId: string | null }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <ShieldAlert className="h-3 w-3 text-muted-foreground" />
      {witnessId ? (
        <>
          <span className="text-muted-foreground">Witness</span>
          <span className="font-mono">{witnessId.slice(0, 8)}</span>
        </>
      ) : (
        <span className="text-muted-foreground italic">No witness</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ControlledTransactionPanel — post a controlled entry
// ---------------------------------------------------------------------------
export function ControlledTransactionPanel({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState("");
  const [drugId, setDrugId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [scheduleCode, setScheduleCode] = useState("H1");
  const [entryType, setEntryType] = useState<EntryType>("dispense");
  const [qtyIn, setQtyIn] = useState("0");
  const [qtyOut, setQtyOut] = useState("0");
  const [unit, setUnit] = useState("unit");
  const [witnessId, setWitnessId] = useState("");
  const [ack, setAck] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [prescriberId, setPrescriberId] = useState("");
  const qc = useQueryClient();
  const fn = useServerFn(postControlledEntry);
  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          tenantId,
          warehouseId,
          drugId,
          batchId: batchId || null,
          scheduleCode,
          entryType,
          quantityIn: Number(qtyIn),
          quantityOut: Number(qtyOut),
          unitCode: unit,
          witnessId,
          patientId: patientId || null,
          prescriberId: prescriberId || null,
        } as never,
      }),
    onSuccess: () => {
      toast.success("Controlled entry posted");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["pharmacy-controlled"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const canSubmit = warehouseId && drugId && witnessId && ack && (Number(qtyIn) > 0 || Number(qtyOut) > 0);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Post entry</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Post controlled register entry</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Warehouse ID</Label><Input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="font-mono" /></div>
          <div><Label>Drug ID</Label><Input value={drugId} onChange={(e) => setDrugId(e.target.value)} className="font-mono" /></div>
          <div><Label>Batch ID (optional)</Label><Input value={batchId} onChange={(e) => setBatchId(e.target.value)} className="font-mono" /></div>
          <div><Label>Schedule</Label><Input value={scheduleCode} onChange={(e) => setScheduleCode(e.target.value)} /></div>
          <div>
            <Label>Entry type</Label>
            <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="dispense">Dispense</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="destroy">Destroy</SelectItem>
                <SelectItem value="transfer_in">Transfer in</SelectItem>
                <SelectItem value="transfer_out">Transfer out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
          <div><Label>Quantity in</Label><Input value={qtyIn} onChange={(e) => setQtyIn(e.target.value)} inputMode="decimal" /></div>
          <div><Label>Quantity out</Label><Input value={qtyOut} onChange={(e) => setQtyOut(e.target.value)} inputMode="decimal" /></div>
          <div><Label>Patient ID (optional)</Label><Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="font-mono" /></div>
          <div><Label>Prescriber ID (optional)</Label><Input value={prescriberId} onChange={(e) => setPrescriberId(e.target.value)} className="font-mono" /></div>
          <div className="col-span-2"><Label>Witness user ID</Label><Input value={witnessId} onChange={(e) => setWitnessId(e.target.value)} className="font-mono" /></div>
          <label className="col-span-2 flex items-start gap-2 text-xs">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} />
            <span>Witness confirms physical count and authorizes this controlled-drug entry.</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!canSubmit || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Posting…" : "Post entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ControlledRegisterGrid
// ---------------------------------------------------------------------------
export function ControlledRegisterGrid({ tenantId }: { tenantId: string }) {
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const fn = useServerFn(listControlledRegister);
  const q = useQuery({
    queryKey: ["pharmacy-controlled", tenantId, discrepancyOnly],
    queryFn: () => fn({ data: { tenantId, discrepancyOnly, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: RegisterRow[] } | undefined)?.rows ?? []) as RegisterRow[];
  const varianceCount = rows.filter((r) => r.discrepancy).length;
  return (
    <div className="space-y-3">
      <VarianceAlert count={varianceCount} />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={discrepancyOnly} onCheckedChange={(v) => setDiscrepancyOnly(!!v)} />
          Show variance only
        </label>
        <div className="ml-auto"><ControlledTransactionPanel tenantId={tenantId} /></div>
      </div>
      <DataGrid<RegisterRow>
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        emptyMessage="No controlled register entries."
        columns={[
          { id: "when", header: "Posted", cell: (r) => <span className="text-xs">{new Date(r.posted_at).toLocaleString()}</span> },
          { id: "sched", header: "Schedule", cell: (r) => <Badge variant="outline">{r.schedule_code}</Badge> },
          { id: "type", header: "Type", cell: (r) => r.entry_type },
          { id: "drug", header: "Drug", cell: (r) => <span className="font-mono text-xs">{r.drug_id.slice(0, 8)}</span> },
          { id: "in", header: "In", cell: (r) => <span className="tabular-nums">{r.quantity_in}</span> },
          { id: "out", header: "Out", cell: (r) => <span className="tabular-nums">{r.quantity_out}</span> },
          { id: "bal", header: "Balance", cell: (r) => <span className="tabular-nums">{r.balance_after ?? "—"}</span> },
          { id: "wit", header: "Witness", cell: (r) => <WitnessPanel witnessId={r.witness_id} /> },
          { id: "flag", header: "Flag", cell: (r) => r.discrepancy ? <Badge variant="destructive">Variance</Badge> : <span className="text-muted-foreground text-xs">—</span> },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ControlledAuditTimeline
// ---------------------------------------------------------------------------
export function ControlledAuditTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Controlled audit trail</CardTitle></CardHeader>
      <CardContent>
        <TimelinePanel items={items} emptyMessage="No controlled events yet." />
      </CardContent>
    </Card>
  );
}
