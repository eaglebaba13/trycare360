/**
 * Laboratory workspaces — Phase 2.8 Stage 3 UI.
 * All data flows through Stage 2 server functions via useServerFn.
 * NO direct Supabase queries and NO business logic here.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  listOrders, placeOrder, cancelOrder, getOrder,
} from "@/lib/laboratory/orders.functions";
import { listTests, listPanels } from "@/lib/laboratory/catalog.functions";
import {
  collectSpecimen, trackSpecimen, rejectSpecimen, getSpecimen, printBarcode,
} from "@/lib/laboratory/specimens.functions";
import { createAccession } from "@/lib/laboratory/accessions.functions";
import { enterResult, listResults, amendResult, listResultVersions } from "@/lib/laboratory/results.functions";
import { autoVerify, manualVerify } from "@/lib/laboratory/verification.functions";
import { releaseResult } from "@/lib/laboratory/release.functions";
import { recordQcRun, listRecentQc } from "@/lib/laboratory/qc.functions";
import { recordCalibration, listCalibrations } from "@/lib/laboratory/calibration.functions";
import {
  listInstruments, enqueueAnalyzerJob, ingestAnalyzerResult, listAnalyzerQueue,
} from "@/lib/laboratory/instrument.functions";
import {
  startMicrobiology, reportCulture, reportSensitivity, listCultures,
} from "@/lib/laboratory/microbiology.functions";
import {
  createPathologyCase, transitionPathologyCase, reportPathologyCase, listPathologyCases,
} from "@/lib/laboratory/pathology.functions";
import {
  placeRadiologyOrder, scheduleRadiologyOrder, recordStudy, reportStudy,
  attachImagingMetadata, listRadiologyOrders, listStudyMetadata,
} from "@/lib/laboratory/radiology.functions";
import { sendDistribution, listDistribution } from "@/lib/laboratory/distribution.functions";
import { submitExternalOrder, ingestExternalResult } from "@/lib/laboratory/external.functions";
import {
  orderVolumeSnapshot, resultStatusSnapshot, turnaroundSnapshot,
} from "@/lib/laboratory/analytics.functions";
import { DataGrid, type DataGridColumn } from "@/components/standards/data-grid";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Barcode, ClipboardCheck, FlaskConical, Microscope, Radiation, Send, ShieldCheck, TimerReset, Beaker } from "lucide-react";
import { LaboratoryFilterBar, LaboratoryActionBar, OrderStatusBadge, LaboratoryStatusBar, LaboratoryDashboardCards } from "./shell";

type Row = Record<string, unknown>;
const asRows = (data: unknown) => (((data as { rows?: Row[] } | undefined)?.rows) ?? []) as Row[];
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (v == null ? 0 : Number(v));

/* ============================================================
 * PATIENT / ORDER SUMMARY
 * ============================================================ */
export function PatientSummaryCard({ order }: { order: Row | null }) {
  if (!order) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Patient / Encounter</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-1">
        <div><span className="text-muted-foreground text-xs">Person ID:</span> <span className="font-mono">{str(order.person_id).slice(0, 8) || "—"}</span></div>
        <div><span className="text-muted-foreground text-xs">Encounter:</span> <span className="font-mono">{str(order.encounter_id).slice(0, 8) || "—"}</span></div>
        <div><span className="text-muted-foreground text-xs">Provider:</span> <span className="font-mono">{str(order.ordering_provider_id).slice(0, 8) || "—"}</span></div>
      </CardContent>
    </Card>
  );
}

export function OrderSummaryCard({ order }: { order: Row | null }) {
  if (!order) return null;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Order {str(order.order_no) || str(order.id).slice(0, 8)}</CardTitle>
        <OrderStatusBadge status={str(order.status)} />
      </CardHeader>
      <CardContent className="text-sm grid grid-cols-2 gap-2">
        <div><div className="text-muted-foreground text-xs">Priority</div><div>{str(order.priority)}</div></div>
        <div><div className="text-muted-foreground text-xs">Fasting</div><div>{order.fasting ? "Yes" : "No"}</div></div>
        <div><div className="text-muted-foreground text-xs">Ordered at</div><div>{str(order.ordered_at)}</div></div>
        <div><div className="text-muted-foreground text-xs">External ref</div><div className="font-mono">{str(order.external_order_ref) || "—"}</div></div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * ORDERS
 * ============================================================ */
export function OrderGrid({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const fn = useServerFn(listOrders);
  const q = useQuery({
    queryKey: ["lab-orders", tenantId, status],
    queryFn: () => fn({ data: { tenantId, status: status || undefined, limit: 200 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data).filter((r) =>
    !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
  );
  const columns: DataGridColumn<Row>[] = [
    { id: "no", header: "Order #", cell: (r) => <span className="font-mono">{str(r.order_no) || str(r.id).slice(0, 8)}</span> },
    { id: "priority", header: "Priority", cell: (r) => <Badge variant="outline">{str(r.priority)}</Badge> },
    { id: "status", header: "Status", cell: (r) => <OrderStatusBadge status={str(r.status)} /> },
    { id: "person", header: "Person", cell: (r) => <span className="font-mono text-xs">{str(r.person_id).slice(0, 8)}</span> },
    { id: "ordered_at", header: "Ordered", cell: (r) => str(r.ordered_at).slice(0, 16) },
    {
      id: "action", header: "", cell: (r) => (
        <Link to="/laboratory/orders/$id" params={{ id: str(r.id) }} className="text-primary text-xs underline">Open</Link>
      ),
    },
  ];
  return (
    <div className="space-y-3">
      <LaboratoryFilterBar>
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["ordered", "collected", "received", "in_progress", "resulted", "verified", "released", "cancelled"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LaboratoryActionBar><NewOrderDialog tenantId={tenantId} /></LaboratoryActionBar>
      </LaboratoryFilterBar>
      <DataGrid rows={rows} columns={columns} getRowId={(r) => str(r.id)} isLoading={q.isLoading} emptyMessage="No lab orders yet." />
    </div>
  );
}

function NewOrderDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
  const [notes, setNotes] = useState("");
  const [testId, setTestId] = useState("");
  const qc = useQueryClient();
  const call = useServerFn(placeOrder);
  const tests = useServerFn(listTests);
  const qTests = useQuery({
    queryKey: ["lab-tests", tenantId],
    queryFn: () => tests({ data: { tenantId, activeOnly: true, limit: 200 } }),
    enabled: open && !!tenantId,
  });
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, priority, notes: notes || null, items: [{ itemKind: "test", testId }] } }),
    onSuccess: () => {
      toast.success("Order placed");
      qc.invalidateQueries({ queryKey: ["lab-orders", tenantId] });
      setOpen(false); setNotes(""); setTestId("");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const testRows = asRows(qTests.data);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Beaker className="mr-1 h-4 w-4" />New order</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Place laboratory order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Test</Label>
            <Select value={testId} onValueChange={setTestId}>
              <SelectTrigger><SelectValue placeholder="Choose a test…" /></SelectTrigger>
              <SelectContent>
                {testRows.map((t) => (
                  <SelectItem key={str(t.id)} value={str(t.id)}>{str(t.code)} — {str(t.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as never)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="stat">STAT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!testId || mut.isPending} onClick={() => mut.mutate()}>Place order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrderWorkspace({ tenantId, orderId }: { tenantId: string; orderId: string }) {
  const fn = useServerFn(getOrder);
  const cancel = useServerFn(cancelOrder);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-order", tenantId, orderId],
    queryFn: () => fn({ data: { tenantId, orderId } }),
    enabled: !!tenantId && !!orderId,
  });
  const order = (q.data as { order?: Row } | undefined)?.order ?? null;
  const items = (q.data as { items?: Row[] } | undefined)?.items ?? [];
  const mut = useMutation({
    mutationFn: (reason: string) => cancel({ data: { tenantId, orderId, reason } }),
    onSuccess: () => {
      toast.success("Order cancelled");
      qc.invalidateQueries({ queryKey: ["lab-order", tenantId, orderId] });
      qc.invalidateQueries({ queryKey: ["lab-orders", tenantId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="space-y-3 md:col-span-2">
        <OrderSummaryCard order={order} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Order items</CardTitle></CardHeader>
          <CardContent>
            <DataGrid
              rows={items}
              columns={[
                { id: "kind", header: "Kind", cell: (r) => str(r.item_kind) },
                { id: "test", header: "Test / Panel", cell: (r) => <span className="font-mono text-xs">{str(r.test_id || r.panel_id).slice(0, 8)}</span> },
                { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              ]}
              getRowId={(r) => str(r.id)}
              isLoading={q.isLoading}
              emptyMessage="No items."
            />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        <PatientSummaryCard order={order} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="destructive" size="sm" className="w-full"
              onClick={() => {
                const reason = window.prompt("Cancellation reason?");
                if (reason) mut.mutate(reason);
              }}
              disabled={mut.isPending || !order || str(order.status) === "cancelled"}
            >
              Cancel order
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
 * SPECIMENS
 * ============================================================ */
export function SpecimenCollectionPanel({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [site, setSite] = useState("");
  const [volume, setVolume] = useState<string>("");
  const call = useServerFn(collectSpecimen);
  const mut = useMutation({
    mutationFn: () => call({
      data: {
        tenantId, orderId,
        collectionSite: site || null,
        volumeMl: volume ? Number(volume) : null,
      },
    }),
    onSuccess: () => { toast.success("Specimen collected"); setOrderId(""); setSite(""); setVolume(""); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Collect specimen</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="UUID" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Site</Label><Input value={site} onChange={(e) => setSite(e.target.value)} /></div>
          <div><Label>Volume (mL)</Label><Input value={volume} onChange={(e) => setVolume(e.target.value)} type="number" /></div>
        </div>
        <Button disabled={!orderId || mut.isPending} onClick={() => mut.mutate()}>Collect</Button>
      </CardContent>
    </Card>
  );
}

export function SpecimenTrackingPanel({ tenantId }: { tenantId: string }) {
  const [specimenId, setSpecimenId] = useState("");
  const [event, setEvent] = useState<"received" | "in_transit" | "stored" | "disposed">("received");
  const [location, setLocation] = useState("");
  const call = useServerFn(trackSpecimen);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, specimenId, event, location: location || null } }),
    onSuccess: () => { toast.success("Tracking event logged"); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Chain of custody</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><Label>Specimen ID</Label><Input value={specimenId} onChange={(e) => setSpecimenId(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Event</Label>
            <Select value={event} onValueChange={(v) => setEvent(v as never)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["received", "in_transit", "stored", "disposed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        </div>
        <Button disabled={!specimenId || mut.isPending} onClick={() => mut.mutate()}>Log event</Button>
      </CardContent>
    </Card>
  );
}

export function BarcodePanel({ tenantId }: { tenantId: string }) {
  const [specimenId, setSpecimenId] = useState("");
  const call = useServerFn(printBarcode);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, specimenId, symbology: "code128" } }),
    onSuccess: () => toast.success("Barcode printed"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Print barcode</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><Label>Specimen ID</Label><Input value={specimenId} onChange={(e) => setSpecimenId(e.target.value)} /></div>
        <Button size="sm" disabled={!specimenId || mut.isPending} onClick={() => mut.mutate()}>
          <Barcode className="mr-1 h-4 w-4" />Print
        </Button>
      </CardContent>
    </Card>
  );
}

export function SpecimenTimeline({ tenantId, specimenId }: { tenantId: string; specimenId: string }) {
  const fn = useServerFn(getSpecimen);
  const q = useQuery({
    queryKey: ["lab-specimen", tenantId, specimenId],
    queryFn: () => fn({ data: { tenantId, specimenId } }),
    enabled: !!tenantId && !!specimenId,
  });
  const tracking = ((q.data as { tracking?: Row[] } | undefined)?.tracking ?? []) as Row[];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Specimen timeline</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? <div className="text-xs text-muted-foreground">Loading…</div> :
          tracking.length === 0 ? <div className="text-xs text-muted-foreground">No tracking events.</div> :
          <ol className="space-y-2 text-sm">
            {tracking.map((t) => (
              <li key={str(t.id)} className="flex gap-3">
                <span className="text-muted-foreground text-xs w-32 shrink-0">{str(t.event_at).slice(0, 16)}</span>
                <Badge variant="outline">{str(t.event)}</Badge>
                <span className="text-xs">{str(t.location)}</span>
              </li>
            ))}
          </ol>
        }
      </CardContent>
    </Card>
  );
}

export function SpecimenGrid({ tenantId }: { tenantId: string }) {
  // Specimens are per-order; without a list endpoint we show recent orders and inline sub-actions.
  const fn = useServerFn(listOrders);
  const q = useQuery({
    queryKey: ["lab-orders-for-specimens", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 100 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <SpecimenCollectionPanel tenantId={tenantId} />
        <SpecimenTrackingPanel tenantId={tenantId} />
        <BarcodePanel tenantId={tenantId} />
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent orders (collect from here)</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "no", header: "Order", cell: (r) => <span className="font-mono">{str(r.order_no) || str(r.id).slice(0, 8)}</span> },
              { id: "status", header: "Status", cell: (r) => <OrderStatusBadge status={str(r.status)} /> },
              { id: "ordered", header: "Ordered", cell: (r) => str(r.ordered_at).slice(0, 16) },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
            emptyMessage="No orders yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * ACCESSIONS
 * ============================================================ */
export function AccessionPanel({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [location, setLocation] = useState("");
  const call = useServerFn(createAccession);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, orderId, receivedLocation: location || null } }),
    onSuccess: () => { toast.success("Accession created"); setOrderId(""); setLocation(""); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Create accession</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
        <div><Label>Received location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
        <Button disabled={!orderId || mut.isPending} onClick={() => mut.mutate()}>Accession</Button>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * RESULTS + VERIFY + RELEASE
 * ============================================================ */
export function ReferenceRangeCard({ range }: { range?: { low?: number | null; high?: number | null; unit?: string | null } | null }) {
  if (!range) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs">Reference range</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {range.low ?? "—"} – {range.high ?? "—"} {range.unit ?? ""}
      </CardContent>
    </Card>
  );
}

export function DeltaCheckCard({ delta }: { delta?: { previous?: number | null; current?: number | null; percent?: number | null } | null }) {
  if (!delta) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs">Delta check</CardTitle></CardHeader>
      <CardContent className="text-sm">
        Prev {delta.previous ?? "—"} → Curr {delta.current ?? "—"} ({delta.percent != null ? `${delta.percent.toFixed(1)}%` : "—"})
      </CardContent>
    </Card>
  );
}

export function CriticalValueBanner({ critical }: { critical?: boolean | null }) {
  if (!critical) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4" />
      Critical value flagged. Notify treating physician and acknowledge per policy.
    </div>
  );
}

export function ResultEntryWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [orderItemId, setOrderItemId] = useState("");
  const [testId, setTestId] = useState("");
  const [numeric, setNumeric] = useState("");
  const [text, setText] = useState("");
  const [unit, setUnit] = useState("");
  const call = useServerFn(enterResult);
  const list = useServerFn(listResults);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-results", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 100 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => call({
      data: {
        tenantId, orderId, orderItemId, testId,
        numericValue: numeric ? Number(numeric) : null,
        textValue: text || null,
        unitCode: unit || null,
      },
    }),
    onSuccess: () => {
      toast.success("Result entered");
      qc.invalidateQueries({ queryKey: ["lab-results", tenantId] });
      setNumeric(""); setText("");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const selected = rows[0] ?? null;
  const flagged = selected ? Boolean(selected.critical_flag || selected.abnormal_flag) : false;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Enter result</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
            <div><Label>Order item ID</Label><Input value={orderItemId} onChange={(e) => setOrderItemId(e.target.value)} /></div>
            <div><Label>Test ID</Label><Input value={testId} onChange={(e) => setTestId(e.target.value)} /></div>
            <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} /></div>
            <div><Label>Numeric</Label><Input value={numeric} onChange={(e) => setNumeric(e.target.value)} type="number" step="any" /></div>
            <div><Label>Text</Label><Input value={text} onChange={(e) => setText(e.target.value)} /></div>
          </div>
          <Button disabled={!orderId || !orderItemId || !testId || mut.isPending} onClick={() => mut.mutate()}>Save result</Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        <CriticalValueBanner critical={flagged} />
        <ReferenceRangeCard range={{ low: null, high: null, unit }} />
        <DeltaCheckCard delta={null} />
      </div>
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent results</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "test", header: "Test", cell: (r) => <span className="font-mono text-xs">{str(r.test_id).slice(0, 8)}</span> },
              { id: "value", header: "Value", cell: (r) => str(r.numeric_value ?? r.text_value ?? r.coded_value) },
              { id: "unit", header: "Unit", cell: (r) => str(r.unit_code) },
              { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              { id: "flag", header: "Flag", cell: (r) => str(r.abnormal_flag) || "—" },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function VerificationWorkspace({ tenantId }: { tenantId: string }) {
  const [resultId, setResultId] = useState("");
  const auto = useServerFn(autoVerify);
  const manual = useServerFn(manualVerify);
  const list = useServerFn(listResults);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-results-verify", tenantId],
    queryFn: () => list({ data: { tenantId, status: "resulted", limit: 100 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mutAuto = useMutation({
    mutationFn: () => auto({ data: { tenantId, resultId } }),
    onSuccess: () => { toast.success("Auto-verified"); qc.invalidateQueries({ queryKey: ["lab-results-verify", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mutManual = useMutation({
    mutationFn: () => manual({ data: { tenantId, resultId } }),
    onSuccess: () => { toast.success("Manually verified"); qc.invalidateQueries({ queryKey: ["lab-results-verify", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <LaboratoryFilterBar>
        <Input placeholder="Result ID…" value={resultId} onChange={(e) => setResultId(e.target.value)} className="max-w-md" />
        <Button size="sm" onClick={() => mutAuto.mutate()} disabled={!resultId || mutAuto.isPending}>
          <ShieldCheck className="mr-1 h-4 w-4" />Auto-verify
        </Button>
        <Button size="sm" variant="outline" onClick={() => mutManual.mutate()} disabled={!resultId || mutManual.isPending}>
          <ClipboardCheck className="mr-1 h-4 w-4" />Manual verify
        </Button>
      </LaboratoryFilterBar>
      <DataGrid
        rows={rows}
        columns={[
          { id: "id", header: "Result ID", cell: (r) => <span className="font-mono text-xs">{str(r.id).slice(0, 8)}</span> },
          { id: "test", header: "Test", cell: (r) => <span className="font-mono text-xs">{str(r.test_id).slice(0, 8)}</span> },
          { id: "value", header: "Value", cell: (r) => str(r.numeric_value ?? r.text_value) },
          { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
        ]}
        getRowId={(r) => str(r.id)}
        onRowClick={(r) => setResultId(str(r.id))}
        isLoading={q.isLoading}
        emptyMessage="Nothing waiting for verification."
      />
    </div>
  );
}

export function ReleaseWorkspace({ tenantId }: { tenantId: string }) {
  const [resultId, setResultId] = useState("");
  const call = useServerFn(releaseResult);
  const list = useServerFn(listResults);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-results-release", tenantId],
    queryFn: () => list({ data: { tenantId, status: "verified", limit: 100 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, resultId } }),
    onSuccess: () => { toast.success("Result released"); qc.invalidateQueries({ queryKey: ["lab-results-release", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <LaboratoryFilterBar>
        <Input value={resultId} onChange={(e) => setResultId(e.target.value)} placeholder="Result ID…" className="max-w-md" />
        <Button size="sm" disabled={!resultId || mut.isPending} onClick={() => mut.mutate()}>
          <Send className="mr-1 h-4 w-4" />Release
        </Button>
      </LaboratoryFilterBar>
      <DataGrid
        rows={rows}
        columns={[
          { id: "id", header: "Result ID", cell: (r) => <span className="font-mono text-xs">{str(r.id).slice(0, 8)}</span> },
          { id: "test", header: "Test", cell: (r) => <span className="font-mono text-xs">{str(r.test_id).slice(0, 8)}</span> },
          { id: "value", header: "Value", cell: (r) => str(r.numeric_value ?? r.text_value) },
          { id: "status", header: "Status", cell: (r) => <OrderStatusBadge status={str(r.status)} /> },
        ]}
        getRowId={(r) => str(r.id)}
        onRowClick={(r) => setResultId(str(r.id))}
        isLoading={q.isLoading}
        emptyMessage="Nothing to release."
      />
    </div>
  );
}

/* ============================================================
 * QC + CALIBRATION + INSTRUMENTS
 * ============================================================ */
export function WestgardPanel({ points }: { points: Array<{ ts: string; value: number; flag?: string | null }> }) {
  if (points.length === 0) return <div className="text-xs text-muted-foreground p-4">No QC data yet.</div>;
  const values = points.map((p) => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Westgard rule status</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div>Points: {points.length}, mean {mean.toFixed(2)}</div>
        <div className="max-h-40 overflow-y-auto text-xs">
          {points.map((p, i) => (
            <div key={i} className="flex justify-between border-b py-0.5">
              <span>{p.ts.slice(0, 16)}</span>
              <span>{p.value}</span>
              <span className={p.flag ? "text-destructive" : "text-muted-foreground"}>{p.flag ?? "ok"}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function QCWorkspace({ tenantId }: { tenantId: string }) {
  const [instrumentId, setInstrumentId] = useState("");
  const [testId, setTestId] = useState("");
  const [value, setValue] = useState("");
  const call = useServerFn(recordQcRun);
  const list = useServerFn(listRecentQc);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-qc", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 100 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => call({
      data: {
        tenantId,
        instrumentId: instrumentId || null,
        testId: testId || null,
        observedValue: Number(value),
      },
    }),
    onSuccess: () => { toast.success("QC run recorded"); qc.invalidateQueries({ queryKey: ["lab-qc", tenantId] }); setValue(""); },
    onError: (e) => toast.error((e as Error).message),
  });
  const points = rows.map((r) => ({ ts: str(r.performed_at), value: num(r.observed_value), flag: str(r.flag) || null }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Record QC run</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Instrument ID</Label><Input value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} /></div>
          <div><Label>Test ID</Label><Input value={testId} onChange={(e) => setTestId(e.target.value)} /></div>
          <div><Label>Observed value</Label><Input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="any" /></div>
          <Button disabled={!value || mut.isPending} onClick={() => mut.mutate()}><FlaskConical className="mr-1 h-4 w-4" />Record</Button>
        </CardContent>
      </Card>
      <WestgardPanel points={points} />
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent QC</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "ts", header: "At", cell: (r) => str(r.performed_at).slice(0, 16) },
              { id: "instr", header: "Instrument", cell: (r) => <span className="font-mono text-xs">{str(r.instrument_id).slice(0, 8)}</span> },
              { id: "test", header: "Test", cell: (r) => <span className="font-mono text-xs">{str(r.test_id).slice(0, 8)}</span> },
              { id: "val", header: "Value", cell: (r) => str(r.observed_value) },
              { id: "flag", header: "Flag", cell: (r) => str(r.flag) || "—" },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function CalibrationWorkspace({ tenantId }: { tenantId: string }) {
  const [instrumentId, setInstrumentId] = useState("");
  const [testId, setTestId] = useState("");
  const [result, setResult] = useState<"pass" | "fail">("pass");
  const call = useServerFn(recordCalibration);
  const list = useServerFn(listCalibrations);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-cal", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 100 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, instrumentId, testId: testId || null, result } }),
    onSuccess: () => { toast.success("Calibration recorded"); qc.invalidateQueries({ queryKey: ["lab-cal", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Record calibration</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Instrument ID</Label><Input value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} /></div>
          <div><Label>Test ID (optional)</Label><Input value={testId} onChange={(e) => setTestId(e.target.value)} /></div>
          <div>
            <Label>Result</Label>
            <Select value={result} onValueChange={(v) => setResult(v as never)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!instrumentId || mut.isPending} onClick={() => mut.mutate()}>Record</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent calibrations</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "ts", header: "At", cell: (r) => str(r.performed_at).slice(0, 16) },
              { id: "instr", header: "Instrument", cell: (r) => <span className="font-mono text-xs">{str(r.instrument_id).slice(0, 8)}</span> },
              { id: "res", header: "Result", cell: (r) => <Badge variant={str(r.result) === "fail" ? "destructive" : "outline"}>{str(r.result)}</Badge> },
              { id: "next", header: "Next due", cell: (r) => str(r.next_due_at).slice(0, 10) || "—" },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyzerInstrumentPanel({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listInstruments);
  const q = useQuery({
    queryKey: ["lab-instr", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 100 } as never }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  return (
    <DataGrid
      rows={rows}
      columns={[
        { id: "code", header: "Code", cell: (r) => str(r.code) },
        { id: "name", header: "Name", cell: (r) => str(r.name) },
        { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
        { id: "loc", header: "Location", cell: (r) => str(r.location) },
      ]}
      getRowId={(r) => str(r.id)}
      isLoading={q.isLoading}
      emptyMessage="No instruments registered."
    />
  );
}

export function AnalyzerQueuePanel({ tenantId }: { tenantId: string }) {
  const [instrumentId, setInstrumentId] = useState("");
  const list = useServerFn(listAnalyzerQueue);
  const enqueue = useServerFn(enqueueAnalyzerJob);
  const ingest = useServerFn(ingestAnalyzerResult);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-queue", tenantId, instrumentId],
    queryFn: () => list({ data: { tenantId, instrumentId: instrumentId || undefined, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mutEnq = useMutation({
    mutationFn: () => enqueue({ data: { tenantId, instrumentId } }),
    onSuccess: () => { toast.success("Enqueued"); qc.invalidateQueries({ queryKey: ["lab-queue", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mutIngest = useMutation({
    mutationFn: (queueId: string) => ingest({ data: { tenantId, instrumentId, queueId } }),
    onSuccess: () => { toast.success("Result ingested"); qc.invalidateQueries({ queryKey: ["lab-queue", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <LaboratoryFilterBar>
        <Input placeholder="Instrument ID" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} className="max-w-md" />
        <Button size="sm" disabled={!instrumentId || mutEnq.isPending} onClick={() => mutEnq.mutate()}>Enqueue</Button>
      </LaboratoryFilterBar>
      <DataGrid
        rows={rows}
        columns={[
          { id: "id", header: "Queue", cell: (r) => <span className="font-mono text-xs">{str(r.id).slice(0, 8)}</span> },
          { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
          { id: "ts", header: "At", cell: (r) => str(r.created_at).slice(0, 16) },
          {
            id: "act", header: "", cell: (r) => (
              <Button size="sm" variant="outline" onClick={() => mutIngest.mutate(str(r.id))}>Ingest</Button>
            ),
          },
        ]}
        getRowId={(r) => str(r.id)}
        isLoading={q.isLoading}
        emptyMessage="Analyzer queue is empty."
      />
    </div>
  );
}

/* ============================================================
 * MICROBIOLOGY
 * ============================================================ */
export function CulturePanel({ tenantId }: { tenantId: string }) {
  const [microbiologyOrderId, setMicroId] = useState("");
  const [growth, setGrowth] = useState<"no_growth" | "positive" | "mixed" | "contaminated" | "pending">("pending");
  const [organism, setOrganism] = useState("");
  const call = useServerFn(reportCulture);
  const mut = useMutation({
    mutationFn: () => call({
      data: {
        tenantId, microbiologyOrderId,
        growthStatus: growth,
        organismName: organism || null,
      },
    }),
    onSuccess: () => { toast.success("Culture reported"); setOrganism(""); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Report culture</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><Label>Microbiology order ID</Label><Input value={microbiologyOrderId} onChange={(e) => setMicroId(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Growth</Label>
            <Select value={growth} onValueChange={(v) => setGrowth(v as never)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pending", "no_growth", "positive", "mixed", "contaminated"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Organism</Label><Input value={organism} onChange={(e) => setOrganism(e.target.value)} /></div>
        </div>
        <Button disabled={!microbiologyOrderId || mut.isPending} onClick={() => mut.mutate()}>Save</Button>
      </CardContent>
    </Card>
  );
}

export function SensitivityPanel({ tenantId }: { tenantId: string }) {
  const [cultureId, setCultureId] = useState("");
  const [rows, setRows] = useState([{ antibioticCode: "", antibioticName: "", interpretation: "S" as "S" | "I" | "R" | "SDD" }]);
  const call = useServerFn(reportSensitivity);
  const mut = useMutation({
    mutationFn: () => call({
      data: {
        tenantId, cultureId,
        entries: rows.filter((r) => r.antibioticCode && r.antibioticName),
      },
    }),
    onSuccess: () => toast.success("Sensitivity saved"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Sensitivity panel</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div><Label>Culture ID</Label><Input value={cultureId} onChange={(e) => setCultureId(e.target.value)} /></div>
        <div className="space-y-2">
          {rows.map((r, idx) => (
            <div key={idx} className="grid grid-cols-3 gap-2">
              <Input placeholder="Code" value={r.antibioticCode} onChange={(e) => {
                const next = [...rows]; next[idx] = { ...r, antibioticCode: e.target.value }; setRows(next);
              }} />
              <Input placeholder="Name" value={r.antibioticName} onChange={(e) => {
                const next = [...rows]; next[idx] = { ...r, antibioticName: e.target.value }; setRows(next);
              }} />
              <Select value={r.interpretation} onValueChange={(v) => {
                const next = [...rows]; next[idx] = { ...r, interpretation: v as never }; setRows(next);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["S", "I", "R", "SDD"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setRows([...rows, { antibioticCode: "", antibioticName: "", interpretation: "S" }])}>+ Row</Button>
        </div>
        <Button disabled={!cultureId || mut.isPending} onClick={() => mut.mutate()}>Save panel</Button>
      </CardContent>
    </Card>
  );
}

export function MicrobiologyWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const start = useServerFn(startMicrobiology);
  const list = useServerFn(listCultures);
  const q = useQuery({
    queryKey: ["lab-cultures", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => start({ data: { tenantId, orderId, requestKind: "culture" } }),
    onSuccess: () => toast.success("Microbiology started"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Start microbiology workup</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
          <Button disabled={!orderId || mut.isPending} onClick={() => mut.mutate()}><Microscope className="mr-1 h-4 w-4" />Start</Button>
        </CardContent>
      </Card>
      <CulturePanel tenantId={tenantId} />
      <SensitivityPanel tenantId={tenantId} />
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cultures</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "id", header: "ID", cell: (r) => <span className="font-mono text-xs">{str(r.id).slice(0, 8)}</span> },
              { id: "growth", header: "Growth", cell: (r) => <Badge variant="outline">{str(r.growth_status)}</Badge> },
              { id: "organism", header: "Organism", cell: (r) => str(r.organism_name) },
              { id: "at", header: "Reported", cell: (r) => str(r.reported_at).slice(0, 16) },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * PATHOLOGY
 * ============================================================ */
export function PathologyWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const create = useServerFn(createPathologyCase);
  const report = useServerFn(reportPathologyCase);
  const transition = useServerFn(transitionPathologyCase);
  const list = useServerFn(listPathologyCases);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-path", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mCreate = useMutation({
    mutationFn: () => create({ data: { tenantId, orderId: orderId || null, caseKind: "histopathology" } }),
    onSuccess: () => { toast.success("Case created"); qc.invalidateQueries({ queryKey: ["lab-path", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mReport = useMutation({
    mutationFn: () => report({ data: { tenantId, caseId, diagnosis: diagnosis || null } }),
    onSuccess: () => { toast.success("Case reported"); qc.invalidateQueries({ queryKey: ["lab-path", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mTransition = useMutation({
    mutationFn: (status: string) => transition({ data: { tenantId, caseId, status } as never }),
    onSuccess: () => { toast.success("Case transitioned"); qc.invalidateQueries({ queryKey: ["lab-path", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Create case</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Order ID (optional)</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
          <Button disabled={mCreate.isPending} onClick={() => mCreate.mutate()}>Create</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Report case</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Case ID</Label><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} /></div>
          <div><Label>Diagnosis</Label><Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3} /></div>
          <div className="flex gap-2">
            <Button disabled={!caseId || mReport.isPending} onClick={() => mReport.mutate()}>Report</Button>
            <Button variant="outline" size="sm" disabled={!caseId} onClick={() => mTransition.mutate("signed_out")}>Sign out</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cases</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "id", header: "Case", cell: (r) => <span className="font-mono text-xs">{str(r.id).slice(0, 8)}</span> },
              { id: "kind", header: "Kind", cell: (r) => str(r.case_kind) },
              { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              { id: "diag", header: "Diagnosis", cell: (r) => <span className="truncate max-w-xs">{str(r.diagnosis)}</span> },
            ]}
            getRowId={(r) => str(r.id)}
            onRowClick={(r) => setCaseId(str(r.id))}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * RADIOLOGY
 * ============================================================ */
export function StudyViewerPlaceholder() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Study viewer</CardTitle></CardHeader>
      <CardContent className="h-64 grid place-items-center bg-muted/40 text-sm text-muted-foreground rounded-md border border-dashed">
        <div className="text-center space-y-1">
          <Radiation className="h-6 w-6 mx-auto" />
          <div>DICOM viewer placeholder</div>
          <div className="text-xs">Wire in DICOM viewer integration in a later phase.</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImagingMetadataPanel({ tenantId, studyId }: { tenantId: string; studyId: string }) {
  const list = useServerFn(listStudyMetadata);
  const attach = useServerFn(attachImagingMetadata);
  const q = useQuery({
    queryKey: ["lab-imaging", tenantId, studyId],
    queryFn: () => list({ data: { tenantId, studyId } as never }),
    enabled: !!tenantId && !!studyId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => attach({ data: { tenantId, studyId } as never }),
    onSuccess: () => toast.success("Metadata attached"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Imaging metadata</CardTitle>
        <Button variant="outline" size="sm" disabled={!studyId || mut.isPending} onClick={() => mut.mutate()}>Attach</Button>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <div className="text-xs">Loading…</div> :
          rows.length === 0 ? <div className="text-xs text-muted-foreground">No metadata.</div> :
          <ul className="text-xs space-y-1">
            {rows.map((r) => <li key={str(r.id)} className="font-mono">{str(r.series_uid)} / {str(r.instance_uid)}</li>)}
          </ul>
        }
      </CardContent>
    </Card>
  );
}

export function RadiologyWorkspace({ tenantId }: { tenantId: string }) {
  const [radOrderId, setRadOrderId] = useState("");
  const [studyId, setStudyId] = useState("");
  const [reportText, setReportText] = useState("");
  const place = useServerFn(placeRadiologyOrder);
  const schedule = useServerFn(scheduleRadiologyOrder);
  const record = useServerFn(recordStudy);
  const report = useServerFn(reportStudy);
  const list = useServerFn(listRadiologyOrders);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-rad", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mPlace = useMutation({
    mutationFn: () => place({ data: { tenantId, priority: "routine" } }),
    onSuccess: () => { toast.success("Radiology order placed"); qc.invalidateQueries({ queryKey: ["lab-rad", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mSchedule = useMutation({
    mutationFn: () => schedule({ data: { tenantId, radOrderId, scheduledAt: new Date().toISOString() } as never }),
    onSuccess: () => toast.success("Scheduled"),
    onError: (e) => toast.error((e as Error).message),
  });
  const mRecord = useMutation({
    mutationFn: () => record({ data: { tenantId, radOrderId } }),
    onSuccess: () => toast.success("Study recorded"),
    onError: (e) => toast.error((e as Error).message),
  });
  const mReport = useMutation({
    mutationFn: () => report({ data: { tenantId, studyId, reportText } }),
    onSuccess: () => toast.success("Report saved"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">New radiology order</CardTitle></CardHeader>
        <CardContent>
          <Button disabled={mPlace.isPending} onClick={() => mPlace.mutate()}>Place order</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Scheduling</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Order ID</Label><Input value={radOrderId} onChange={(e) => setRadOrderId(e.target.value)} /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => mSchedule.mutate()} disabled={!radOrderId}>Schedule now</Button>
            <Button size="sm" variant="outline" onClick={() => mRecord.mutate()} disabled={!radOrderId}>Record study</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Report study</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Study ID</Label><Input value={studyId} onChange={(e) => setStudyId(e.target.value)} /></div>
          <Textarea rows={3} value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Findings…" />
          <Button size="sm" disabled={!studyId || !reportText || mReport.isPending} onClick={() => mReport.mutate()}>Save report</Button>
        </CardContent>
      </Card>
      <div className="lg:col-span-2"><StudyViewerPlaceholder /></div>
      <ImagingMetadataPanel tenantId={tenantId} studyId={studyId} />
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Radiology orders</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "id", header: "Order", cell: (r) => <span className="font-mono text-xs">{str(r.id).slice(0, 8)}</span> },
              { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              { id: "priority", header: "Priority", cell: (r) => str(r.priority) },
              { id: "sched", header: "Scheduled", cell: (r) => str(r.scheduled_at).slice(0, 16) || "—" },
            ]}
            getRowId={(r) => str(r.id)}
            onRowClick={(r) => setRadOrderId(str(r.id))}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * DISTRIBUTION + EXTERNAL
 * ============================================================ */
export function DistributionWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "sms" | "print" | "portal" | "fhir" | "hl7">("email");
  const [recipient, setRecipient] = useState("");
  const call = useServerFn(sendDistribution);
  const list = useServerFn(listDistribution);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-dist", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, orderId, channel, recipient: recipient || null } }),
    onSuccess: () => { toast.success("Distribution queued"); qc.invalidateQueries({ queryKey: ["lab-dist", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Send report</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["email", "whatsapp", "sms", "print", "portal", "fhir", "hl7"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Recipient</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} /></div>
          </div>
          <Button disabled={!orderId || mut.isPending} onClick={() => mut.mutate()}><Send className="mr-1 h-4 w-4" />Send</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Distribution log</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "ch", header: "Channel", cell: (r) => <Badge variant="outline">{str(r.channel)}</Badge> },
              { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              { id: "recip", header: "Recipient", cell: (r) => str(r.recipient) },
              { id: "at", header: "At", cell: (r) => str(r.sent_at).slice(0, 16) || str(r.created_at).slice(0, 16) },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function ExternalLabWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [vendor, setVendor] = useState("");
  const [externalOrderId, setExternalOrderId] = useState("");
  const [payload, setPayload] = useState("{}");
  const submit = useServerFn(submitExternalOrder);
  const ingest = useServerFn(ingestExternalResult);
  const mSubmit = useMutation({
    mutationFn: () => submit({ data: { tenantId, orderId, vendorCode: vendor, currency: "INR" } }),
    onSuccess: () => toast.success("Submitted to vendor"),
    onError: (e) => toast.error((e as Error).message),
  });
  const mIngest = useMutation({
    mutationFn: () => {
      let parsed: Record<string, unknown> = {};
      try { parsed = JSON.parse(payload); } catch { throw new Error("Invalid JSON payload"); }
      return ingest({ data: { tenantId, externalOrderId, payload: parsed } });
    },
    onSuccess: () => toast.success("Ingested"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Submit to external lab</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} /></div>
          <div><Label>Vendor code</Label><Input value={vendor} onChange={(e) => setVendor(e.target.value)} /></div>
          <Button disabled={!orderId || !vendor || mSubmit.isPending} onClick={() => mSubmit.mutate()}>Submit</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ingest external result</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>External order ID</Label><Input value={externalOrderId} onChange={(e) => setExternalOrderId(e.target.value)} /></div>
          <div><Label>Payload (JSON)</Label><Textarea rows={4} value={payload} onChange={(e) => setPayload(e.target.value)} /></div>
          <Button disabled={!externalOrderId || mIngest.isPending} onClick={() => mIngest.mutate()}>Ingest</Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================
 * TURNAROUND
 * ============================================================ */
export function TurnaroundCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(turnaroundSnapshot);
  const q = useQuery({
    queryKey: ["lab-tat", tenantId],
    queryFn: () => fn({ data: { tenantId } }),
    enabled: !!tenantId,
  });
  const data = (q.data as { meanMinutes?: number | null; medianMinutes?: number | null; sample?: number } | undefined) ?? {};
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TimerReset className="h-4 w-4" />Turnaround</CardTitle></CardHeader>
      <CardContent className="text-sm">
        <div>Mean: {data.meanMinutes != null ? `${Number(data.meanMinutes).toFixed(0)} min` : "—"}</div>
        <div>Median: {data.medianMinutes != null ? `${Number(data.medianMinutes).toFixed(0)} min` : "—"}</div>
        <div className="text-xs text-muted-foreground mt-1">Sample size: {data.sample ?? 0}</div>
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * OVERVIEW DASHBOARD
 * ============================================================ */
export function LaboratoryOverview({ tenantId }: { tenantId: string }) {
  const orderSnap = useServerFn(orderVolumeSnapshot);
  const resSnap = useServerFn(resultStatusSnapshot);
  const qcList = useServerFn(listRecentQc);
  const qOrder = useQuery({ queryKey: ["lab-overview-orders", tenantId], queryFn: () => orderSnap({ data: { tenantId } }), enabled: !!tenantId });
  const qRes = useQuery({ queryKey: ["lab-overview-results", tenantId], queryFn: () => resSnap({ data: { tenantId } }), enabled: !!tenantId });
  const qQc = useQuery({ queryKey: ["lab-overview-qc", tenantId], queryFn: () => qcList({ data: { tenantId, limit: 100 } }), enabled: !!tenantId });
  const oData = (qOrder.data ?? {}) as { total?: number };
  const rData = (qRes.data ?? {}) as { pending?: number; released?: number; critical?: number };
  const meanTatData = useServerFn(turnaroundSnapshot);
  const qTat = useQuery({ queryKey: ["lab-overview-tat", tenantId], queryFn: () => meanTatData({ data: { tenantId } }), enabled: !!tenantId });
  const tData = (qTat.data ?? {}) as { meanMinutes?: number | null };
  const qcRows = asRows(qQc.data);
  const activeTenant = useMemo(() => tenantId, [tenantId]);
  if (!activeTenant) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <LaboratoryStatusBar status="Live analytics from Stage 2 snapshots" tone="info" />
      <LaboratoryDashboardCards
        totalOrders={oData.total ?? 0}
        pendingResults={rData.pending ?? 0}
        releasedResults={rData.released ?? 0}
        criticalPending={rData.critical ?? 0}
        meanTat={tData.meanMinutes ?? null}
        qcRecent={qcRows.length}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <TurnaroundCard tenantId={tenantId} />
        <KpiCard label="Recent QC events" value={qcRows.length} icon={FlaskConical} />
        <KpiCard label="Critical flags" value={rData.critical ?? 0} icon={AlertTriangle} tone="danger" />
      </div>
    </div>
  );
}

/* ============================================================
 * AMEND / VERSIONS helpers (exposed for use)
 * ============================================================ */
export function AmendResultDialog({ tenantId, resultId }: { tenantId: string; resultId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [numeric, setNumeric] = useState("");
  const call = useServerFn(amendResult);
  const versions = useServerFn(listResultVersions);
  const qV = useQuery({
    queryKey: ["lab-result-versions", tenantId, resultId],
    queryFn: () => versions({ data: { tenantId, resultId } }),
    enabled: open && !!resultId,
  });
  const rows = asRows(qV.data);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, resultId, reason, numericValue: numeric ? Number(numeric) : null } }),
    onSuccess: () => { toast.success("Amended"); setOpen(false); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Amend</Button>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader><SheetTitle>Amend result</SheetTitle></SheetHeader>
        <div className="space-y-2 mt-3">
          <div><Label>Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div>
          <div><Label>New numeric value</Label><Input type="number" step="any" value={numeric} onChange={(e) => setNumeric(e.target.value)} /></div>
          <Button onClick={() => mut.mutate()} disabled={!reason || mut.isPending}>Save amendment</Button>
        </div>
        <div className="mt-6">
          <div className="text-xs uppercase text-muted-foreground mb-2">Versions</div>
          {rows.length === 0 ? <div className="text-xs">No versions yet.</div> :
            <ul className="text-xs space-y-1">
              {rows.map((v) => (
                <li key={str(v.id)} className="flex justify-between border-b py-1">
                  <span>v{str(v.version)}</span>
                  <span>{str(v.reason)}</span>
                  <span className="text-muted-foreground">{str(v.created_at).slice(0, 16)}</span>
                </li>
              ))}
            </ul>
          }
        </div>
      </SheetContent>
    </Sheet>
  );
}
