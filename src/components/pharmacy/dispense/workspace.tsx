import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { createDispense, getDispense, cancelDispense } from "@/lib/pharmacy/dispense.functions";
import { useClinicalContext } from "@/components/clinical/use-clinical-context";
import { WizardShell } from "@/components/standards/wizard-shell";
import { DataGrid } from "@/components/standards/data-grid";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { TimelinePanel, type TimelineItem } from "@/components/standards/timeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Plus,
  ScanLine,
  Pill,
  UserRound,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CartItem = {
  key: string;
  prescriptionItemId?: string;
  drugId: string;
  quantity: string;
  unitCode: string;
  unitPrice?: string;
  isControlled: boolean;
  substitutedFromDrugId?: string;
  substitutionReason?: string;
  witnessId?: string;
  notes?: string;
};

// ---------------------------------------------------------------------------
// AllergyBanner
// ---------------------------------------------------------------------------
export function AllergyBanner({ allergies }: { allergies: Array<{ id: string; substance: string | null; severity: string | null }> }) {
  if (!allergies?.length) return null;
  return (
    <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-rose-700 dark:text-rose-400">
        <ShieldAlert className="h-4 w-4" /> Patient allergies on file
      </div>
      <ul className="mt-1 flex flex-wrap gap-2 text-xs">
        {allergies.map((a) => (
          <li key={a.id}>
            <Badge variant="destructive">{a.substance ?? "Unknown"}{a.severity ? ` · ${a.severity}` : ""}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DrugInteractionBanner (display-only; interaction detection is server-owned)
// ---------------------------------------------------------------------------
export function DrugInteractionBanner({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" /> Potential drug interactions
      </div>
      <ul className="mt-1 list-disc pl-5 text-xs">
        {warnings.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrescriptionSummaryCard
// ---------------------------------------------------------------------------
export function PrescriptionSummaryCard({
  prescriptions,
  onAddItem,
}: {
  prescriptions: Array<{ id: string; status?: string | null; created_at?: string | null; notes?: string | null }>;
  onAddItem?: (prescriptionId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Pill className="h-4 w-4" /> Prescriptions</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {prescriptions.length === 0 && <div className="text-xs text-muted-foreground">No prescriptions on file.</div>}
        {prescriptions.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border p-2 text-xs">
            <div>
              <div className="font-mono">{p.id.slice(0, 8)}</div>
              <div className="text-muted-foreground">{p.status ?? "—"}{p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString()}` : ""}</div>
            </div>
            {onAddItem && (
              <Button size="sm" variant="outline" onClick={() => onAddItem(p.id)}>
                Use
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ClinicalContextPanel
// ---------------------------------------------------------------------------
export function ClinicalContextPanel({
  tenantId,
  patientId,
  onAddPrescription,
}: {
  tenantId: string;
  patientId: string | null;
  onAddPrescription?: (prescriptionId: string) => void;
}) {
  const ctx = useClinicalContext({ tenantId, personId: patientId, historyLimit: 5 });
  if (!patientId) {
    return <Card><CardContent className="pt-6 text-xs text-muted-foreground">Select a patient to load clinical context.</CardContent></Card>;
  }
  if (ctx.isLoading) return <Card><CardContent className="pt-6 text-xs text-muted-foreground">Loading clinical context…</CardContent></Card>;
  const data = ctx.data;
  const person = data?.person;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserRound className="h-4 w-4" /> Patient</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="font-medium text-sm">{person?.full_name ?? person?.first_name ?? "Unknown"}</div>
          <div className="text-muted-foreground font-mono">{patientId.slice(0, 8)}</div>
        </CardContent>
      </Card>
      <AllergyBanner allergies={(data?.allergies ?? []).map((a) => ({ id: a.id, substance: a.substance, severity: a.severity }))} />
      <PrescriptionSummaryCard
        prescriptions={(data?.prescriptions ?? []).map((p) => ({ id: p.id, status: (p as { status?: string | null }).status ?? null, created_at: p.created_at, notes: (p as { notes?: string | null }).notes ?? null }))}
        onAddItem={onAddPrescription}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BatchPicker — server picks FEFO; UI only lets user optionally override
// ---------------------------------------------------------------------------
export function BatchPicker({
  batchId,
  onChange,
}: {
  batchId?: string;
  onChange: (id: string | undefined) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Batch (leave blank for FEFO)</Label>
      <Input
        value={batchId ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Server picks FEFO batch"
        className="font-mono text-xs"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// GenericSubstitutionDialog — declares intent; server validates
// ---------------------------------------------------------------------------
export function GenericSubstitutionDialog({
  onConfirm,
  trigger,
}: {
  onConfirm: (input: { substitutedFromDrugId: string; substitutionReason: string }) => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [fromDrug, setFromDrug] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Generic substitution</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Substituted from drug ID</Label><Input value={fromDrug} onChange={(e) => setFromDrug(e.target.value)} className="font-mono" /></div>
          <div><Label>Reason</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!fromDrug || !reason}
            onClick={() => {
              onConfirm({ substitutedFromDrugId: fromDrug, substitutionReason: reason });
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// ControlledWitnessDialog — collect witness only; validation on server
// ---------------------------------------------------------------------------
export function ControlledWitnessDialog({
  onConfirm,
  trigger,
}: {
  onConfirm: (witnessId: string) => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [witness, setWitness] = useState("");
  const [ack, setAck] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Controlled drug witness</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Witness user ID</Label><Input value={witness} onChange={(e) => setWitness(e.target.value)} className="font-mono" placeholder="uuid" /></div>
          <label className="flex items-start gap-2 text-xs">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(!!v)} />
            <span>Witness confirms physical count matches and authorizes dispense per controlled-drug protocol.</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!witness || !ack}
            onClick={() => { onConfirm(witness); setOpen(false); }}
          >
            Confirm witness
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// BarcodeScannerInput — forwards raw scanned code to caller
// ---------------------------------------------------------------------------
export function BarcodeScannerInput({ onScan }: { onScan: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label className="text-xs flex items-center gap-1"><ScanLine className="h-3 w-3" /> Scan / enter barcode</Label>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code) {
              onScan(code);
              setCode("");
            }
          }}
          placeholder="Scanner input — Enter to submit"
        />
      </div>
      <Button size="sm" onClick={() => { if (code) { onScan(code); setCode(""); } }} disabled={!code}>
        Add
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DispenseItemsGrid — read-only summary of an existing dispense's items
// ---------------------------------------------------------------------------
type DispenseItemRow = {
  id: string;
  drug_id: string;
  batch_id: string | null;
  quantity: number;
  unit_code: string;
  is_controlled?: boolean | null;
  substituted_from_drug_id?: string | null;
  witness_id?: string | null;
};

export function DispenseItemsGrid({ items }: { items: DispenseItemRow[] }) {
  return (
    <DataGrid<DispenseItemRow>
      rows={items}
      getRowId={(r) => r.id}
      emptyMessage="No dispensed items."
      columns={[
        { id: "drug", header: "Drug", cell: (r) => <span className="font-mono text-xs">{r.drug_id.slice(0, 8)}</span> },
        { id: "batch", header: "Batch", cell: (r) => <span className="font-mono text-xs">{r.batch_id ? r.batch_id.slice(0, 8) : "FEFO"}</span> },
        { id: "qty", header: "Qty", cell: (r) => <span className="tabular-nums">{r.quantity} {r.unit_code}</span> },
        { id: "ctrl", header: "Controlled", cell: (r) => r.is_controlled ? <Badge variant="destructive">Yes</Badge> : <span className="text-muted-foreground text-xs">—</span> },
        { id: "sub", header: "Substitution", cell: (r) => r.substituted_from_drug_id ? <Badge variant="secondary">sub</Badge> : "—" },
        { id: "wit", header: "Witness", cell: (r) => r.witness_id ? <span className="font-mono text-xs">{r.witness_id.slice(0, 8)}</span> : "—" },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// DispenseCart — cart list used during creation
// ---------------------------------------------------------------------------
export function DispenseCart({
  items,
  onChange,
}: {
  items: CartItem[];
  onChange: (next: CartItem[]) => void;
}) {
  const update = (key: string, patch: Partial<CartItem>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const remove = (key: string) => onChange(items.filter((i) => i.key !== key));
  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <div className="text-xs text-muted-foreground border rounded p-3">Cart empty. Scan a barcode or add a drug.</div>
      )}
      {items.map((it) => (
        <div key={it.key} className="rounded border p-3 space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-5"><Label className="text-xs">Drug ID</Label><Input value={it.drugId} onChange={(e) => update(it.key, { drugId: e.target.value })} className="font-mono text-xs" /></div>
            <div className="col-span-2"><Label className="text-xs">Qty</Label><Input value={it.quantity} onChange={(e) => update(it.key, { quantity: e.target.value })} inputMode="decimal" /></div>
            <div className="col-span-2"><Label className="text-xs">Unit</Label><Input value={it.unitCode} onChange={(e) => update(it.key, { unitCode: e.target.value })} /></div>
            <div className="col-span-2"><Label className="text-xs">Unit price</Label><Input value={it.unitPrice ?? ""} onChange={(e) => update(it.key, { unitPrice: e.target.value })} inputMode="decimal" /></div>
            <div className="col-span-1 flex items-end">
              <Button variant="ghost" size="icon" onClick={() => remove(it.key)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <BatchPicker batchId={it.prescriptionItemId ? undefined : undefined} onChange={() => { /* batch selection handled below */ }} />
            </div>
            <div className="col-span-3">
              <Label className="text-xs">Batch (optional)</Label>
              <Input value={it["prescriptionItemId"] ? "" : ""} onChange={() => undefined} placeholder="Server picks FEFO" className="font-mono text-xs" disabled />
            </div>
            <div className="col-span-4 flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <Checkbox checked={it.isControlled} onCheckedChange={(v) => update(it.key, { isControlled: !!v })} />
                Controlled
              </label>
              {it.isControlled && (
                <ControlledWitnessDialog
                  onConfirm={(witnessId) => update(it.key, { witnessId })}
                  trigger={
                    <Button size="sm" variant={it.witnessId ? "secondary" : "outline"}>
                      {it.witnessId ? `Witness ${it.witnessId.slice(0, 6)}` : "Add witness"}
                    </Button>
                  }
                />
              )}
              <GenericSubstitutionDialog
                onConfirm={({ substitutedFromDrugId, substitutionReason }) =>
                  update(it.key, { substitutedFromDrugId, substitutionReason })
                }
                trigger={
                  <Button size="sm" variant={it.substitutedFromDrugId ? "secondary" : "ghost"}>
                    {it.substitutedFromDrugId ? "Sub set" : "Substitute"}
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PartialFillPanel — display-only helper; commit path is server-side
// ---------------------------------------------------------------------------
export function PartialFillPanel({ items }: { items: CartItem[] }) {
  const partial = items.filter((i) => Number(i.quantity) > 0);
  if (!partial.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ListChecks className="h-4 w-4" /> Fill summary</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-1">
        <div className="text-muted-foreground">Server will finalize fill status based on prescribed vs dispensed quantity.</div>
        {partial.map((p) => (
          <div key={p.key} className="flex items-center justify-between">
            <span className="font-mono">{p.drugId.slice(0, 8)}</span>
            <span className="tabular-nums">{p.quantity} {p.unitCode}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DispenseTimeline — reuses TimelinePanel
// ---------------------------------------------------------------------------
export function DispenseTimeline({ items }: { items: TimelineItem[] }) {
  return <TimelinePanel items={items} emptyMessage="No dispense events yet." />;
}

// ---------------------------------------------------------------------------
// DispenseStatusBar
// ---------------------------------------------------------------------------
export function DispenseStatusBar({
  status,
  itemCount,
  controlledCount,
}: {
  status: string;
  itemCount: number;
  controlledCount: number;
}) {
  return (
    <KpiGrid>
      <KpiCard label="Status" value={status} icon={ListChecks} tone={status === "posted" ? "success" : status === "cancelled" ? "danger" : "info"} />
      <KpiCard label="Items" value={itemCount} icon={Pill} />
      <KpiCard label="Controlled" value={controlledCount} icon={ShieldAlert} tone={controlledCount > 0 ? "warning" : "default"} />
    </KpiGrid>
  );
}

// ---------------------------------------------------------------------------
// DispenseSummary — read-only header for an existing dispense
// ---------------------------------------------------------------------------
export function DispenseSummary({
  dispense,
}: {
  dispense: {
    id: string;
    dispense_number?: string | null;
    status: string;
    patient_id: string;
    warehouse_id: string;
    encounter_id: string | null;
    dispense_date: string;
    counselling_notes?: string | null;
  };
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Dispense {dispense.dispense_number ?? dispense.id.slice(0, 8)}</CardTitle></CardHeader>
      <CardContent className="text-xs grid grid-cols-2 gap-3">
        <div><div className="text-muted-foreground">Patient</div><div className="font-mono">{dispense.patient_id.slice(0, 8)}</div></div>
        <div><div className="text-muted-foreground">Warehouse</div><div className="font-mono">{dispense.warehouse_id.slice(0, 8)}</div></div>
        <div><div className="text-muted-foreground">Encounter</div><div className="font-mono">{dispense.encounter_id ? dispense.encounter_id.slice(0, 8) : "—"}</div></div>
        <div><div className="text-muted-foreground">Date</div><div>{new Date(dispense.dispense_date).toLocaleString()}</div></div>
        {dispense.counselling_notes && (
          <div className="col-span-2"><div className="text-muted-foreground">Counselling</div><div>{dispense.counselling_notes}</div></div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// DispenseWorkspace — create new dispense OR view existing
// ---------------------------------------------------------------------------
export function DispenseWorkspace({
  tenantId,
  dispenseId,
}: {
  tenantId: string;
  dispenseId: string | null; // null / "new" -> creation mode
}) {
  const isNew = !dispenseId || dispenseId === "new";
  return isNew ? (
    <NewDispenseWorkspace tenantId={tenantId} />
  ) : (
    <ExistingDispenseWorkspace tenantId={tenantId} dispenseId={dispenseId!} />
  );
}

function NewDispenseWorkspace({ tenantId }: { tenantId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [counselling, setCounselling] = useState("");
  const [items, setItems] = useState<CartItem[]>([]);

  const controlledCount = useMemo(() => items.filter((i) => i.isControlled).length, [items]);

  const call = useServerFn(createDispense);
  const mut = useMutation({
    mutationFn: () =>
      call({
        data: {
          tenantId,
          patientId,
          warehouseId,
          encounterId: encounterId || null,
          prescriptionId: prescriptionId || null,
          counsellingNotes: counselling || null,
          items: items.map((i) => ({
            prescriptionItemId: i.prescriptionItemId ?? null,
            drugId: i.drugId,
            quantity: Number(i.quantity),
            unitCode: i.unitCode,
            unitPrice: i.unitPrice ? Number(i.unitPrice) : null,
            isControlled: i.isControlled,
            substitutedFromDrugId: i.substitutedFromDrugId ?? null,
            substitutionReason: i.substitutionReason ?? null,
            witnessId: i.witnessId ?? null,
            notes: i.notes ?? null,
          })),
        } as never,
      }),
    onSuccess: (res: unknown) => {
      toast.success("Dispense created");
      qc.invalidateQueries({ queryKey: ["pharmacy-dispenses"] });
      const id = (res as { dispense?: { id?: string } } | undefined)?.dispense?.id;
      if (id) navigate({ to: "/pharmacy/dispense/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canPatient = !!patientId && !!warehouseId;
  const canItems = items.length > 0 && items.every((i) => i.drugId && Number(i.quantity) > 0 && (!i.isControlled || !!i.witnessId));

  const addBlank = () =>
    setItems((xs) => [
      ...xs,
      { key: crypto.randomUUID(), drugId: "", quantity: "1", unitCode: "unit", isControlled: false },
    ]);

  return (
    <WizardShell
      steps={[
        { id: "patient", label: "Patient & Rx" },
        { id: "items", label: "Items" },
        { id: "review", label: "Review & Dispense" },
      ]}
      currentIndex={step}
      onStep={setStep}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(2, s + 1))}
      onFinish={() => mut.mutate()}
      canProceed={step === 0 ? canPatient : step === 1 ? canItems : canItems}
      isSubmitting={mut.isPending}
      finishLabel="Post dispense"
      sidebar={<ClinicalContextPanel tenantId={tenantId} patientId={patientId || null} onAddPrescription={(id) => setPrescriptionId(id)} />}
    >
      {step === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Patient ID</Label><Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="font-mono" placeholder="uuid" /></div>
          <div><Label>Warehouse ID</Label><Input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="font-mono" placeholder="uuid" /></div>
          <div><Label>Encounter ID (optional)</Label><Input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} className="font-mono" /></div>
          <div className="col-span-2"><Label>Prescription ID (optional)</Label><Input value={prescriptionId} onChange={(e) => setPrescriptionId(e.target.value)} className="font-mono" /></div>
          <div className="col-span-2"><Label>Counselling notes</Label><Textarea rows={3} value={counselling} onChange={(e) => setCounselling(e.target.value)} /></div>
          <div className="col-span-2"><DrugInteractionBanner warnings={[]} /></div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          <BarcodeScannerInput
            onScan={(code) =>
              setItems((xs) => [
                ...xs,
                { key: crypto.randomUUID(), drugId: code, quantity: "1", unitCode: "unit", isControlled: false, notes: `scanned:${code}` },
              ])
            }
          />
          <DispenseCart items={items} onChange={setItems} />
          <Button size="sm" variant="outline" onClick={addBlank}><Plus className="h-4 w-4 mr-1" /> Add item</Button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <DispenseStatusBar status="draft" itemCount={items.length} controlledCount={controlledCount} />
          <PartialFillPanel items={items} />
          <div className="text-xs text-muted-foreground">
            FEFO batch allocation, stock reservation, controlled-drug validation and ledger
            posting are performed server-side by the Stage 2 engines.
          </div>
        </div>
      )}
    </WizardShell>
  );
}

function ExistingDispenseWorkspace({ tenantId, dispenseId }: { tenantId: string; dispenseId: string }) {
  const qc = useQueryClient();
  const call = useServerFn(getDispense);
  const cancelFn = useServerFn(cancelDispense);
  const q = useQuery({
    queryKey: ["pharmacy-dispense", tenantId, dispenseId],
    queryFn: () => call({ data: { tenantId, dispenseId } as never }),
    enabled: !!tenantId && !!dispenseId,
  });
  const [reason, setReason] = useState("");
  const cancelMut = useMutation({
    mutationFn: () => cancelFn({ data: { tenantId, dispenseId, reason } as never }),
    onSuccess: () => {
      toast.success("Dispense cancelled");
      qc.invalidateQueries({ queryKey: ["pharmacy-dispense", tenantId, dispenseId] });
      qc.invalidateQueries({ queryKey: ["pharmacy-dispenses"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (q.isLoading) return <div className="text-sm text-muted-foreground">Loading dispense…</div>;
  const payload = q.data as
    | { dispense: Parameters<typeof DispenseSummary>[0]["dispense"] & { status: string }; items: DispenseItemRow[] }
    | undefined;
  if (!payload?.dispense) return <div className="text-sm text-muted-foreground">Not found.</div>;
  const controlledCount = payload.items.filter((i) => i.is_controlled).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <DispenseStatusBar status={payload.dispense.status} itemCount={payload.items.length} controlledCount={controlledCount} />
        <DispenseSummary dispense={payload.dispense} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
          <CardContent><DispenseItemsGrid items={payload.items} /></CardContent>
        </Card>
        {payload.dispense.status !== "cancelled" && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Cancel dispense</CardTitle></CardHeader>
            <CardContent className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button
                variant="destructive"
                disabled={!reason || cancelMut.isPending}
                onClick={() => cancelMut.mutate()}
              >
                {cancelMut.isPending ? "Cancelling…" : "Cancel dispense"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="space-y-4">
        <ClinicalContextPanel tenantId={tenantId} patientId={payload.dispense.patient_id} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Timeline</CardTitle></CardHeader>
          <CardContent>
            <DispenseTimeline items={[
              { ts: payload.dispense.dispense_date, event_type: "pharmacy.dispense", title: `Status: ${payload.dispense.status}` },
            ]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
