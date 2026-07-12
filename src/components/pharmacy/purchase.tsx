/**
 * Phase 2.6 Stage 5 — Purchase + GRN UI.
 *
 * All business logic (validation, stock ledger, approvals) lives in Stage 2
 * engines. This module ONLY collects inputs and renders server responses.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  createPurchaseOrder,
  approvePurchaseOrder,
  markPurchaseOrderSent,
  listPurchaseOrders,
  getPurchaseOrder,
  postGoodsReceipt,
} from "@/lib/pharmacy/purchase.functions";
import { listSuppliers } from "@/lib/pharmacy/supplier.functions";
import { listWarehouses } from "@/lib/pharmacy/warehouse.functions";
import { listDrugs } from "@/lib/pharmacy/masters.functions";
import { DataGrid } from "@/components/standards/data-grid";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { WizardShell } from "@/components/standards/wizard-shell";
import {
  TimelinePanel,
  type TimelineItem,
} from "@/components/standards/timeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Truck,
  CheckCircle2,
  Send,
  FileText,
  PackageCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types (loose — server owns the truth)
// ---------------------------------------------------------------------------
type PoRow = {
  id: string;
  po_number?: string | null;
  supplier_id: string;
  status: string;
  po_date: string | null;
  expected_date: string | null;
  currency: string | null;
  total_amount?: number | null;
  created_at: string;
};

type PoItem = {
  id: string;
  drug_id: string;
  quantity_ordered: number;
  quantity_received?: number | null;
  unit_code: string;
  unit_price?: number | null;
  tax_percent?: number | null;
  discount_percent?: number | null;
  notes?: string | null;
};

type Supplier = { id: string; name: string; code: string; lead_time_days: number | null };
type Warehouse = { id: string; name: string; warehouse_type: string };
type Drug = { id: string; code: string; name: string; base_unit_code: string };

// ---------------------------------------------------------------------------
// PurchaseDashboard
// ---------------------------------------------------------------------------
export function PurchaseDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listPurchaseOrders);
  const q = useQuery({
    queryKey: ["pharmacy-po-dash", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: PoRow[] } | undefined)?.rows ?? []) as PoRow[];
  const stats = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.status === s).length;
    return {
      total: rows.length,
      draft: by("draft"),
      pendingApproval: by("pending_approval"),
      approved: by("approved"),
      sent: by("sent"),
      received: by("received"),
    };
  }, [rows]);
  return (
    <KpiGrid>
      <KpiCard label="Total POs" value={stats.total} icon={FileText} />
      <KpiCard label="Draft" value={stats.draft} tone="default" />
      <KpiCard label="Pending approval" value={stats.pendingApproval} tone="warning" />
      <KpiCard label="Approved" value={stats.approved} tone="info" />
      <KpiCard label="Sent" value={stats.sent} icon={Send} tone="info" />
      <KpiCard label="Received" value={stats.received} icon={PackageCheck} tone="success" />
    </KpiGrid>
  );
}

// ---------------------------------------------------------------------------
// PurchaseOrderGrid
// ---------------------------------------------------------------------------
export function PurchaseOrderGrid({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<string>("");
  const fn = useServerFn(listPurchaseOrders);
  const q = useQuery({
    queryKey: ["pharmacy-po-list", tenantId, status],
    queryFn: () =>
      fn({ data: { tenantId, status: status || null, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: PoRow[] } | undefined)?.rows ?? []) as PoRow[];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Filter by status (draft, pending_approval, approved, sent, received)"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <DataGrid<PoRow>
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        emptyMessage="No purchase orders yet."
        columns={[
          {
            id: "no",
            header: "PO #",
            cell: (r) => (
              <Link
                to="/pharmacy/purchase/$id"
                params={{ id: r.id }}
                className="font-mono text-xs text-primary hover:underline"
              >
                {r.po_number ?? r.id.slice(0, 8)}
              </Link>
            ),
          },
          { id: "sup", header: "Supplier", cell: (r) => <span className="font-mono text-xs">{r.supplier_id.slice(0, 8)}</span> },
          {
            id: "date",
            header: "PO date",
            cell: (r) => (r.po_date ? new Date(r.po_date).toLocaleDateString() : "—"),
          },
          {
            id: "exp",
            header: "Expected",
            cell: (r) => (r.expected_date ? new Date(r.expected_date).toLocaleDateString() : "—"),
          },
          { id: "cur", header: "Currency", cell: (r) => r.currency ?? "—" },
          { id: "total", header: "Total", cell: (r) => (r.total_amount != null ? r.total_amount.toFixed(2) : "—") },
          { id: "status", header: "Status", cell: (r) => <PoStatusBadge status={r.status} /> },
        ]}
      />
    </div>
  );
}

function PoStatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "outline",
    pending_approval: "secondary",
    approved: "default",
    sent: "default",
    received: "default",
    cancelled: "destructive",
  };
  return <Badge variant={(tone[status] ?? "outline") as never}>{status}</Badge>;
}

// ---------------------------------------------------------------------------
// PurchaseApprovalCard — display-only. Invokes Stage 2 approve/send.
// ---------------------------------------------------------------------------
export function PurchaseApprovalCard({
  tenantId,
  po,
  onChange,
}: {
  tenantId: string;
  po: PoRow;
  onChange: () => void;
}) {
  const approve = useServerFn(approvePurchaseOrder);
  const send = useServerFn(markPurchaseOrderSent);
  const doApprove = useMutation({
    mutationFn: () => approve({ data: { tenantId, poId: po.id } as never }),
    onSuccess: () => { toast.success("PO approved"); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const doSend = useMutation({
    mutationFn: () => send({ data: { tenantId, poId: po.id } as never }),
    onSuccess: () => { toast.success("PO sent to supplier"); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Approval &amp; dispatch</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current status</span>
          <PoStatusBadge status={po.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          Approvals are gated by the platform Approval Engine. The buttons below invoke the
          Stage 2 server functions <code>approvePurchaseOrder</code> and
          <code> markPurchaseOrderSent</code> — no client-side gating.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={doApprove.isPending || !["draft", "pending_approval"].includes(po.status)}
            onClick={() => doApprove.mutate()}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={doSend.isPending || po.status !== "approved"}
            onClick={() => doSend.mutate()}
          >
            <Send className="h-4 w-4 mr-1" /> Mark sent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PurchaseStatusTimeline
// ---------------------------------------------------------------------------
export function PurchaseStatusTimeline({ po }: { po: PoRow }) {
  const items: TimelineItem[] = [
    { ts: po.created_at, event_type: "created", title: "PO created" },
    po.po_date ? { ts: po.po_date, event_type: "dated", title: "PO dated" } : null,
    po.expected_date
      ? { ts: po.expected_date, event_type: "expected", title: "Expected delivery" }
      : null,
    { ts: new Date().toISOString(), event_type: po.status, title: `Status: ${po.status}` },
  ].filter(Boolean) as TimelineItem[];
  return <TimelinePanel items={items} />;
}

// ---------------------------------------------------------------------------
// PurchaseSummaryPanel
// ---------------------------------------------------------------------------
export function PurchaseSummaryPanel({ po, items }: { po: PoRow; items: PoItem[] }) {
  const subtotal = items.reduce((s, i) => s + Number(i.quantity_ordered) * Number(i.unit_price ?? 0), 0);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Line items</span><span>{items.length}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{po.currency ?? "INR"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total (server)</span><span className="font-mono">{po.total_amount != null ? po.total_amount.toFixed(2) : "—"}</span></div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// PurchaseOrderWizard — draft new PO.
// ---------------------------------------------------------------------------
type WizardItem = { key: string; drugId: string; qty: string; unit: string; price: string; tax: string };

export function PurchaseOrderWizard({
  tenantId,
  onCreated,
}: {
  tenantId: string;
  onCreated?: (poId: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [expected, setExpected] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<WizardItem[]>([]);

  const supFn = useServerFn(listSuppliers);
  const whFn = useServerFn(listWarehouses);
  const drugFn = useServerFn(listDrugs);
  const create = useServerFn(createPurchaseOrder);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const suppliers = useQuery({
    queryKey: ["pharmacy-sup-picker", tenantId],
    queryFn: () => supFn({ data: { tenantId, search: "", activeOnly: true } as never }),
    enabled: !!tenantId,
  });
  const warehouses = useQuery({
    queryKey: ["pharmacy-wh-picker", tenantId],
    queryFn: () => whFn({ data: { tenantId, activeOnly: true } as never }),
    enabled: !!tenantId,
  });
  const drugs = useQuery({
    queryKey: ["pharmacy-drug-picker", tenantId],
    queryFn: () => drugFn({ data: { tenantId, search: "", activeOnly: true, limit: 500 } as never }),
    enabled: !!tenantId,
  });

  const supList = ((suppliers.data as { rows?: Supplier[] } | undefined)?.rows ?? []) as Supplier[];
  const whList = ((warehouses.data as { rows?: Warehouse[] } | undefined)?.rows ?? []) as Warehouse[];
  const drugList = ((drugs.data as { rows?: Drug[] } | undefined)?.rows ?? []) as Drug[];

  const submit = useMutation({
    mutationFn: async () =>
      create({
        data: {
          tenantId,
          supplierId,
          warehouseId: warehouseId || null,
          expectedDate: expected || null,
          currency,
          notes: notes || null,
          items: items.map((i) => ({
            drugId: i.drugId,
            quantityOrdered: Number(i.qty),
            unitCode: i.unit,
            unitPrice: i.price ? Number(i.price) : null,
            taxPercent: i.tax ? Number(i.tax) : null,
          })),
        } as never,
      }),
    onSuccess: (res: unknown) => {
      const po = (res as { po?: { id: string } }).po;
      toast.success("Purchase order created");
      qc.invalidateQueries({ queryKey: ["pharmacy-po-list"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-po-dash"] });
      if (po?.id) {
        onCreated?.(po.id);
        navigate({ to: "/pharmacy/purchase/$id", params: { id: po.id } });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canProceed = step === 0 ? !!supplierId : step === 1 ? items.length > 0 && items.every((i) => i.drugId && Number(i.qty) > 0 && i.unit) : true;

  return (
    <WizardShell
      steps={[
        { id: "supplier", label: "Supplier & warehouse" },
        { id: "items", label: "Line items" },
        { id: "review", label: "Review & create" },
      ]}
      currentIndex={step}
      onStep={setStep}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(2, s + 1))}
      onFinish={() => submit.mutate()}
      canProceed={canProceed}
      isSubmitting={submit.isPending}
      finishLabel="Create PO"
    >
      {step === 0 && (
        <div className="space-y-3">
          <div>
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {supList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deliver to warehouse (optional)</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                {whList.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Expected date</Label>
              <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
            <div>
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { key: crypto.randomUUID(), drugId: "", qty: "1", unit: "unit", price: "", tax: "" },
                ])
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Add line
            </Button>
          </div>
          {items.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No line items yet.
            </div>
          )}
          {items.map((it, idx) => (
            <div key={it.key} className="grid grid-cols-12 gap-2 items-end rounded-md border p-2">
              <div className="col-span-5">
                <Label className="text-xs">Drug</Label>
                <Select
                  value={it.drugId}
                  onValueChange={(v) => {
                    const d = drugList.find((x) => x.id === v);
                    setItems((prev) => prev.map((r, i) => i === idx ? { ...r, drugId: v, unit: d?.base_unit_code ?? r.unit } : r));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select drug" /></SelectTrigger>
                  <SelectContent>
                    {drugList.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Qty</Label>
                <Input value={it.qty} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))} />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Unit</Label>
                <Input value={it.unit} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, unit: e.target.value } : r))} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Unit price</Label>
                <Input value={it.price} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, price: e.target.value } : r))} />
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Tax %</Label>
                <Input value={it.tax} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, tax: e.target.value } : r))} />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3 text-sm">
          <div>Supplier: <span className="font-mono">{supplierId || "—"}</span></div>
          <div>Warehouse: <span className="font-mono">{warehouseId || "—"}</span></div>
          <div>Expected: {expected || "—"}</div>
          <div>Currency: {currency}</div>
          <div>{items.length} line item(s)</div>
          <div className="text-xs text-muted-foreground">
            The Stage 2 <code>createPurchaseOrder</code> engine will validate the payload,
            compute totals, and route through the platform Approval Engine.
          </div>
        </div>
      )}
    </WizardShell>
  );
}

// ---------------------------------------------------------------------------
// PurchaseOrderWorkspace — for /pharmacy/purchase/$id
// ---------------------------------------------------------------------------
export function PurchaseOrderWorkspace({ tenantId, poId }: { tenantId: string; poId: string }) {
  const fn = useServerFn(getPurchaseOrder);
  const q = useQuery({
    queryKey: ["pharmacy-po", tenantId, poId],
    queryFn: () => fn({ data: { tenantId, poId } as never }),
    enabled: !!tenantId && !!poId,
  });
  const data = q.data as { po?: PoRow; items?: PoItem[] } | undefined;
  if (q.isLoading) return <div className="text-sm text-muted-foreground p-8">Loading purchase order…</div>;
  if (!data?.po) return <div className="text-sm text-muted-foreground p-8">Purchase order not found.</div>;
  const { po, items = [] } = data;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 min-w-0">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> PO {po.po_number ?? po.id.slice(0, 8)}
              <PoStatusBadge status={po.status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataGrid<PoItem>
              rows={items}
              getRowId={(r) => r.id}
              emptyMessage="No line items."
              columns={[
                { id: "drug", header: "Drug", cell: (r) => <span className="font-mono text-xs">{r.drug_id.slice(0, 8)}</span> },
                { id: "ord", header: "Ordered", cell: (r) => `${r.quantity_ordered} ${r.unit_code}` },
                { id: "rec", header: "Received", cell: (r) => `${r.quantity_received ?? 0}` },
                { id: "price", header: "Price", cell: (r) => r.unit_price ?? "—" },
                { id: "tax", header: "Tax %", cell: (r) => r.tax_percent ?? "—" },
              ]}
            />
          </CardContent>
        </Card>
        <PurchaseStatusTimeline po={po} />
      </div>
      <div className="space-y-4">
        <PurchaseApprovalCard tenantId={tenantId} po={po} onChange={() => q.refetch()} />
        <PurchaseSummaryPanel po={po} items={items} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GRN — Goods Receipt
// ---------------------------------------------------------------------------
type GrnRow = {
  id: string;
  grn_number?: string | null;
  po_id: string | null;
  supplier_id: string | null;
  warehouse_id: string;
  grn_date: string | null;
  invoice_number: string | null;
  status?: string | null;
  created_at: string;
};

// Since listGoodsReceipts is not exposed as its own Stage 2 fn, we present the
// entry UI only. Historical GRNs are visible on their originating PO's audit trail.
export function GoodsReceiptGrid({ tenantId }: { tenantId: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Goods Receipts</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          Post a Goods Receipt Note (GRN) against a Purchase Order. All batches, ledger
          movements, and invoice reconciliation are handled server-side by the Stage 2
          <code> PurchaseEngine.postGrn</code> function — no client-side inventory math.
        </p>
        <GoodsReceiptWizardDialog tenantId={tenantId} />
      </CardContent>
    </Card>
  );
}

export function GoodsReceiptWizardDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New GRN</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Post Goods Receipt</DialogTitle></DialogHeader>
        <GoodsReceiptWizard tenantId={tenantId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

type GrnItem = {
  key: string;
  drugId: string;
  quantityReceived: string;
  unitCode: string;
  batchNo: string;
  expiryDate: string;
  unitCost: string;
  mrp: string;
};

export function GoodsReceiptWizard({ tenantId, onDone }: { tenantId: string; onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [poId, setPoId] = useState<string>("");
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [items, setItems] = useState<GrnItem[]>([]);

  const poFn = useServerFn(listPurchaseOrders);
  const whFn = useServerFn(listWarehouses);
  const drugFn = useServerFn(listDrugs);
  const supFn = useServerFn(listSuppliers);
  const post = useServerFn(postGoodsReceipt);
  const qc = useQueryClient();

  const pos = useQuery({
    queryKey: ["pharmacy-po-grn-picker", tenantId],
    queryFn: () => poFn({ data: { tenantId, status: "sent", limit: 100 } as never }),
    enabled: !!tenantId,
  });
  const warehouses = useQuery({
    queryKey: ["pharmacy-wh-picker", tenantId],
    queryFn: () => whFn({ data: { tenantId, activeOnly: true } as never }),
    enabled: !!tenantId,
  });
  const drugs = useQuery({
    queryKey: ["pharmacy-drug-picker", tenantId],
    queryFn: () => drugFn({ data: { tenantId, search: "", activeOnly: true, limit: 500 } as never }),
    enabled: !!tenantId,
  });
  const suppliers = useQuery({
    queryKey: ["pharmacy-sup-picker", tenantId],
    queryFn: () => supFn({ data: { tenantId, search: "", activeOnly: true } as never }),
    enabled: !!tenantId,
  });

  const poList = ((pos.data as { rows?: PoRow[] } | undefined)?.rows ?? []) as PoRow[];
  const whList = ((warehouses.data as { rows?: Warehouse[] } | undefined)?.rows ?? []) as Warehouse[];
  const drugList = ((drugs.data as { rows?: Drug[] } | undefined)?.rows ?? []) as Drug[];
  const supList = ((suppliers.data as { rows?: Supplier[] } | undefined)?.rows ?? []) as Supplier[];

  const submit = useMutation({
    mutationFn: () =>
      post({
        data: {
          tenantId,
          poId: poId || null,
          supplierId: supplierId || null,
          warehouseId,
          invoiceNumber: invoiceNumber || null,
          invoiceDate: invoiceDate || null,
          items: items.map((i) => ({
            drugId: i.drugId,
            quantityReceived: Number(i.quantityReceived),
            unitCode: i.unitCode,
            batchNo: i.batchNo || null,
            expiryDate: i.expiryDate || null,
            unitCost: i.unitCost ? Number(i.unitCost) : null,
            mrp: i.mrp ? Number(i.mrp) : null,
          })),
        } as never,
      }),
    onSuccess: () => {
      toast.success("GRN posted — inventory ledger updated");
      qc.invalidateQueries({ queryKey: ["pharmacy-po"] });
      qc.invalidateQueries({ queryKey: ["pharmacy-po-list"] });
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canProceed = step === 0 ? !!warehouseId : step === 1 ? items.length > 0 && items.every((i) => i.drugId && Number(i.quantityReceived) > 0) : true;

  return (
    <WizardShell
      steps={[
        { id: "hdr", label: "Header" },
        { id: "batches", label: "Batches" },
        { id: "review", label: "Review" },
      ]}
      currentIndex={step}
      onStep={setStep}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(2, s + 1))}
      onFinish={() => submit.mutate()}
      canProceed={canProceed}
      isSubmitting={submit.isPending}
      finishLabel="Post GRN"
    >
      {step === 0 && (
        <div className="space-y-3">
          <div>
            <Label>Warehouse</Label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>
                {whList.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Against PO (optional)</Label>
            <Select value={poId} onValueChange={setPoId}>
              <SelectTrigger><SelectValue placeholder="Direct GRN (no PO)" /></SelectTrigger>
              <SelectContent>
                {poList.map((p) => (<SelectItem key={p.id} value={p.id}>{p.po_number ?? p.id.slice(0, 8)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {!poId && (
            <div>
              <Label>Supplier (for direct GRN)</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {supList.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          <InvoiceUploadPanel
            invoiceNumber={invoiceNumber}
            invoiceDate={invoiceDate}
            onInvoiceNumber={setInvoiceNumber}
            onInvoiceDate={setInvoiceDate}
          />
        </div>
      )}
      {step === 1 && (
        <BatchReceivingPanel items={items} setItems={setItems} drugs={drugList} />
      )}
      {step === 2 && (
        <div className="space-y-2 text-sm">
          <div>Warehouse: <span className="font-mono">{warehouseId}</span></div>
          <div>PO: {poId || "direct"}</div>
          <div>Invoice: {invoiceNumber || "—"} · {invoiceDate || "—"}</div>
          <div>{items.length} batch line(s)</div>
          <div className="text-xs text-muted-foreground">
            Batch creation and ledger writes are performed atomically by the Stage 2
            <code> postGrn</code> engine.
          </div>
        </div>
      )}
    </WizardShell>
  );
}

export function BatchReceivingPanel({
  items,
  setItems,
  drugs,
}: {
  items: GrnItem[];
  setItems: (u: (prev: GrnItem[]) => GrnItem[]) => void;
  drugs: Drug[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setItems((prev) => [
              ...prev,
              { key: crypto.randomUUID(), drugId: "", quantityReceived: "1", unitCode: "unit", batchNo: "", expiryDate: "", unitCost: "", mrp: "" },
            ])
          }
        >
          <Plus className="h-4 w-4 mr-1" /> Add batch
        </Button>
      </div>
      {items.map((it, idx) => (
        <div key={it.key} className="grid grid-cols-12 gap-2 items-end rounded-md border p-2">
          <div className="col-span-4">
            <Label className="text-xs">Drug</Label>
            <Select
              value={it.drugId}
              onValueChange={(v) => {
                const d = drugs.find((x) => x.id === v);
                setItems((prev) => prev.map((r, i) => i === idx ? { ...r, drugId: v, unitCode: d?.base_unit_code ?? r.unitCode } : r));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Drug" /></SelectTrigger>
              <SelectContent>
                {drugs.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Batch #</Label>
            <Input value={it.batchNo} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, batchNo: e.target.value } : r))} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Expiry</Label>
            <Input type="date" value={it.expiryDate} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, expiryDate: e.target.value } : r))} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">Qty</Label>
            <Input value={it.quantityReceived} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantityReceived: e.target.value } : r))} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">Cost</Label>
            <Input value={it.unitCost} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, unitCost: e.target.value } : r))} />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">MRP</Label>
            <Input value={it.mrp} onChange={(e) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, mrp: e.target.value } : r))} />
          </div>
          <div className="col-span-1 flex justify-end">
            <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvoiceUploadPanel({
  invoiceNumber,
  invoiceDate,
  onInvoiceNumber,
  onInvoiceDate,
}: {
  invoiceNumber: string;
  invoiceDate: string;
  onInvoiceNumber: (v: string) => void;
  onInvoiceDate: (v: string) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Upload className="h-4 w-4" /> Supplier invoice
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Invoice #</Label>
          <Input value={invoiceNumber} onChange={(e) => onInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Invoice date</Label>
          <Input type="date" value={invoiceDate} onChange={(e) => onInvoiceDate(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Upload &amp; OCR are handled by the platform Documents module; attach post-creation.
      </p>
    </div>
  );
}

export function GoodsReceiptWorkspace({ tenantId }: { tenantId: string }) {
  return <GoodsReceiptGrid tenantId={tenantId} />;
}

export { Truck as TruckIcon };
