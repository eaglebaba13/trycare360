/**
 * Phase 2.8 Stage 4 — Laboratory Reporting components.
 *
 * Presentational + workspace components that consume Stage 2 server functions.
 * NO business logic here — Stage 2 engines own delta checks, critical value
 * evaluation, verification transitions, release, distribution, and reporting.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle, Check, ClipboardCheck, FileSignature, FileText,
  MessageSquare, Microscope, Printer, Radiation, Send, ShieldCheck,
  History, PenLine, Barcode as BarcodeIcon, ArrowRight, Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import { DataGrid, type DataGridColumn } from "@/components/standards/data-grid";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { PermissionGuard } from "@/components/permission-guard";
import { ClinicalDocumentViewer } from "@/components/clinical/clinical-document-viewer";

import { listResults, listResultVersions, amendResult } from "@/lib/laboratory/results.functions";
import { autoVerify, manualVerify } from "@/lib/laboratory/verification.functions";
import { releaseResult } from "@/lib/laboratory/release.functions";
import { sendDistribution, listDistribution } from "@/lib/laboratory/distribution.functions";
import {
  reportCulture, reportSensitivity, listCultures, startMicrobiology,
} from "@/lib/laboratory/microbiology.functions";
import {
  reportPathologyCase, listPathologyCases, transitionPathologyCase,
} from "@/lib/laboratory/pathology.functions";
import {
  reportStudy, attachImagingMetadata, listRadiologyOrders, listStudyMetadata,
} from "@/lib/laboratory/radiology.functions";

/* ------------------------------------------------------------------ */
type Row = Record<string, unknown>;
const asRows = (data: unknown) => (((data as { rows?: Row[] } | undefined)?.rows) ?? []) as Row[];
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));
const short = (v: unknown) => str(v).slice(0, 8);

/* ============================================================
 * STATUS RIBBON
 * ============================================================ */
export function ResultStatusRibbon({ status, critical, deltaFlag }: {
  status?: string | null; critical?: boolean | null; deltaFlag?: string | null;
}) {
  const s = str(status) || "pending";
  const tone =
    s === "released" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40" :
    s === "verified" ? "bg-sky-500/10 text-sky-700 border-sky-500/40" :
    s === "amended" ? "bg-amber-500/10 text-amber-700 border-amber-500/40" :
    s === "cancelled" ? "bg-destructive/10 text-destructive border-destructive/40" :
    "bg-muted text-muted-foreground border-border";
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium ${tone}`}>
      <ShieldCheck className="h-4 w-4" />
      <span className="uppercase tracking-wide">{s}</span>
      {critical ? (
        <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Critical</Badge>
      ) : null}
      {deltaFlag ? <Badge variant="outline">Δ {str(deltaFlag)}</Badge> : null}
    </div>
  );
}

/* ============================================================
 * REFERENCE RANGE + DELTA + CRITICAL
 * ============================================================ */
export function ReferenceRangeViewer({ result }: { result: Row | null }) {
  if (!result) return null;
  const text = str(result.reference_range_text);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs">Reference range</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {text ? text : <span className="text-muted-foreground text-xs">Not resolved by engine.</span>}
        {result.unit_code ? <span className="text-muted-foreground text-xs ml-1">{str(result.unit_code)}</span> : null}
      </CardContent>
    </Card>
  );
}

export function DeltaCheckViewer({ result }: { result: Row | null }) {
  if (!result) return null;
  const flag = str(result.delta_flag);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs">Delta check</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {flag ? <Badge variant="outline">Δ {flag}</Badge> : <span className="text-xs text-muted-foreground">No delta flag.</span>}
      </CardContent>
    </Card>
  );
}

export function CriticalValueWorkflow({ result }: { result: Row | null }) {
  if (!result || !result.is_critical) return null;
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <div className="font-medium">Critical value — physician notification required</div>
        <div className="text-xs">
          The Stage 2 CriticalAlertEngine flagged this result. Acknowledge per SOP and record read-back
          with the ordering provider. Notification tracking is handled by the Workflow Engine.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * APPROVAL / VERIFICATION / RELEASE
 * ============================================================ */
export function ApprovalStatusCard({ result }: { result: Row | null }) {
  if (!result) return null;
  const items: Array<[string, string]> = [
    ["Entered", str(result.performed_at) || str(result.created_at)],
    ["Verified", str(result.verified_at) || "—"],
    ["Released", str(result.released_at) || "—"],
    ["Amended", str(result.amended_reason) ? str(result.updated_at) : "—"],
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Approval status</CardTitle></CardHeader>
      <CardContent className="text-sm grid grid-cols-2 gap-2">
        {items.map(([k, v]) => (
          <div key={k}>
            <div className="text-muted-foreground text-xs">{k}</div>
            <div className="truncate">{v || "—"}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ResultVerificationPanel({ tenantId, result, onDone }: {
  tenantId: string; result: Row | null; onDone?: () => void;
}) {
  const auto = useServerFn(autoVerify);
  const manual = useServerFn(manualVerify);
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lab-results-review", tenantId] });
    qc.invalidateQueries({ queryKey: ["lab-results-verify", tenantId] });
    qc.invalidateQueries({ queryKey: ["lab-results-release", tenantId] });
    onDone?.();
  };
  const mAuto = useMutation({
    mutationFn: () => auto({ data: { tenantId, resultId: str(result?.id) } }),
    onSuccess: () => { toast.success("Auto-verified"); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mManual = useMutation({
    mutationFn: () => manual({ data: { tenantId, resultId: str(result?.id) } }),
    onSuccess: () => { toast.success("Manually verified"); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });
  const disabled = !result || str(result.status) !== "pending" && str(result.status) !== "amended";
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Verification</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">
          Auto-verification runs Stage 2 rules — QC, Westgard, delta, critical. Manual verification records a
          reviewer signoff. All logic is server-side.
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => mAuto.mutate()} disabled={disabled || mAuto.isPending}>
            <ShieldCheck className="mr-1 h-4 w-4" /> Auto-verify
          </Button>
          <Button size="sm" variant="outline" onClick={() => mManual.mutate()} disabled={disabled || mManual.isPending}>
            <ClipboardCheck className="mr-1 h-4 w-4" /> Manual verify
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReleaseChecklist({ result }: { result: Row | null }) {
  const status = str(result?.status);
  const verified = status === "verified" || status === "released" || status === "amended";
  const noCritical = !result?.is_critical || Boolean(result?.verified_at);
  const noDelta = !result?.delta_flag || verified;
  const items: Array<[boolean, string]> = [
    [Boolean(result), "Result exists"],
    [verified, "Verified by qualified reviewer"],
    [noCritical, "Critical value acknowledged (if any)"],
    [noDelta, "Delta check reviewed"],
    [Boolean(result?.reference_range_text), "Reference range attached"],
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Release checklist</CardTitle></CardHeader>
      <CardContent className="space-y-1 text-sm">
        {items.map(([ok, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span className={ok ? "text-emerald-600" : "text-muted-foreground"}>
              {ok ? <Check className="h-4 w-4" /> : <span className="inline-block h-4 w-4 rounded-full border border-dashed" />}
            </span>
            <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DigitalSignaturePlaceholder({ signer }: { signer?: string | null }) {
  return (
    <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <PenLine className="h-4 w-4" /> Digital signature placeholder
      </div>
      <div className="mt-1">
        {signer ? <>Signed by <span className="font-medium text-foreground">{signer}</span></> : "Pending signer"}
        {" "}— cryptographic signing will be wired via the platform signature service in a later phase.
      </div>
    </div>
  );
}

export function DoctorSignoffPanel({ result }: { result: Row | null }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileSignature className="h-4 w-4" />Doctor signoff</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Signoff is captured by the Stage 2 VerificationEngine (manual verify). Once verified,
          the reviewer's identity is recorded in the audit trail.
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground text-xs">Verified by:</span>{" "}
          <span className="font-mono">{short(result?.verified_by) || "—"}</span>
        </div>
        <DigitalSignaturePlaceholder signer={short(result?.verified_by) || null} />
      </CardContent>
    </Card>
  );
}

export function ReleaseConfirmationDialog({ tenantId, result, onDone }: {
  tenantId: string; result: Row | null; onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const call = useServerFn(releaseResult);
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, resultId: str(result?.id) } }),
    onSuccess: () => {
      toast.success("Result released to clinician");
      qc.invalidateQueries({ queryKey: ["lab-results-release", tenantId] });
      qc.invalidateQueries({ queryKey: ["lab-results-review", tenantId] });
      setOpen(false); setAck(false);
      onDone?.();
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const disabled = !result || (str(result.status) !== "verified" && str(result.status) !== "amended");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <Send className="mr-1 h-4 w-4" /> Release
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Release result to clinician</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <ReleaseChecklist result={result} />
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={ack} onCheckedChange={(v) => setAck(Boolean(v))} />
            <span>I confirm the checklist above and take responsibility for clinical release.</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!ack || mut.isPending} onClick={() => mut.mutate()}>Release now</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * VERSIONS / AMENDMENTS
 * ============================================================ */
export function ResultVersionTimeline({ tenantId, resultId }: { tenantId: string; resultId: string }) {
  const fn = useServerFn(listResultVersions);
  const q = useQuery({
    queryKey: ["lab-result-versions", tenantId, resultId],
    queryFn: () => fn({ data: { tenantId, resultId } }),
    enabled: !!tenantId && !!resultId,
  });
  const rows = ((q.data as { versions?: Row[] } | undefined)?.versions ?? []) as Row[];
  return (
    <TimelinePanel
      items={rows.map((v) => ({
        ts: str(v.created_at),
        event_type: `v${str(v.version)}`,
        title: str(v.reason) || `Version ${str(v.version)}`,
        body: `Actor ${short(v.actor_id) || "system"}`,
      }))}
      emptyMessage="No versions recorded."
    />
  );
}

export function AmendmentHistoryPanel({ tenantId, result }: { tenantId: string; result: Row | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [numeric, setNumeric] = useState("");
  const [text, setText] = useState("");
  const call = useServerFn(amendResult);
  const qc = useQueryClient();
  const resultId = str(result?.id);
  const mut = useMutation({
    mutationFn: () => call({
      data: {
        tenantId,
        resultId,
        reason,
        numericValue: numeric ? Number(numeric) : null,
        textValue: text || null,
      },
    }),
    onSuccess: () => {
      toast.success("Amendment saved");
      qc.invalidateQueries({ queryKey: ["lab-result-versions"] });
      qc.invalidateQueries({ queryKey: ["lab-results-review"] });
      setOpen(false); setReason(""); setNumeric(""); setText("");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" />Amendment history</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={!result}>Amend</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Amend result</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <div><Label>Reason</Label><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Numeric</Label><Input type="number" step="any" value={numeric} onChange={(e) => setNumeric(e.target.value)} /></div>
                <div><Label>Text</Label><Input value={text} onChange={(e) => setText(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!reason || mut.isPending} onClick={() => mut.mutate()}>Save amendment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {resultId ? (
          <ResultVersionTimeline tenantId={tenantId} resultId={resultId} />
        ) : (
          <div className="text-xs text-muted-foreground">Select a result to view versions.</div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * COMPARISON + COMMENTS + BARCODE + PDF
 * ============================================================ */
export function ResultComparisonPanel({ current, previous }: {
  current: Row | null; previous: Row | null;
}) {
  const rows: Array<[string, unknown, unknown]> = [
    ["Numeric", current?.numeric_value ?? null, previous?.numeric_value ?? null],
    ["Text", current?.text_value ?? null, previous?.text_value ?? null],
    ["Unit", current?.unit_code ?? null, previous?.unit_code ?? null],
    ["Flag", current?.flag ?? null, previous?.flag ?? null],
    ["Status", current?.status ?? null, previous?.status ?? null],
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Comparison</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr><th className="text-left py-1">Field</th><th className="text-left">Current</th><th className="text-left">Previous</th></tr>
          </thead>
          <tbody>
            {rows.map(([k, a, b]) => {
              const changed = str(a) !== str(b);
              return (
                <tr key={k} className={changed ? "bg-amber-500/10" : ""}>
                  <td className="py-1 text-muted-foreground">{k}</td>
                  <td>{str(a) || "—"}</td>
                  <td>{str(b) || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function ClinicalCommentsPanel({ comments }: { comments?: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" />Clinical comments</CardTitle></CardHeader>
      <CardContent className="text-sm whitespace-pre-wrap">
        {comments && comments.trim().length > 0 ? comments : <span className="text-xs text-muted-foreground">No comments recorded.</span>}
      </CardContent>
    </Card>
  );
}

export function BarcodeVerificationPanel({ specimenId, containerNo }: {
  specimenId?: string | null; containerNo?: string | null;
}) {
  const [scan, setScan] = useState("");
  const expected = str(containerNo) || str(specimenId);
  const ok = scan && expected && scan.trim() === expected.trim();
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BarcodeIcon className="h-4 w-4" />Barcode verification</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Expected: <span className="font-mono">{expected || "—"}</span></div>
        <Input placeholder="Scan barcode…" value={scan} onChange={(e) => setScan(e.target.value)} />
        {scan ? (
          ok
            ? <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40" variant="outline">Match</Badge>
            : <Badge variant="destructive">Mismatch</Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PdfReportViewer({ url, mime, title }: {
  url?: string | null; mime?: string | null; title?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />{title ?? "Report"}</CardTitle>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-xs underline">Open</a>
        ) : null}
      </CardHeader>
      <CardContent>
        <ClinicalDocumentViewer url={url} mime={mime ?? "application/pdf"} title={title} />
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * PATIENT / REPORT SUMMARIES
 * ============================================================ */
export function PatientReportSummary({ order, result }: { order?: Row | null; result?: Row | null }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4" />Patient report summary</CardTitle></CardHeader>
      <CardContent className="text-sm grid grid-cols-2 gap-2">
        <div><div className="text-xs text-muted-foreground">Person</div><div className="font-mono">{short(order?.person_id) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Encounter</div><div className="font-mono">{short(order?.encounter_id) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Test</div><div className="font-mono">{short(result?.test_id) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Value</div><div>{str(result?.numeric_value ?? result?.text_value ?? "—")} {str(result?.unit_code)}</div></div>
        <div><div className="text-xs text-muted-foreground">Reference</div><div>{str(result?.reference_range_text) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Status</div><div>{str(result?.status)}</div></div>
      </CardContent>
    </Card>
  );
}

export function ClinicalReportViewer({ order, result, comments, url }: {
  order?: Row | null; result?: Row | null; comments?: string | null; url?: string | null;
}) {
  return (
    <div className="space-y-3">
      <ResultStatusRibbon
        status={str(result?.status)}
        critical={Boolean(result?.is_critical)}
        deltaFlag={str(result?.delta_flag) || null}
      />
      <PatientReportSummary order={order} result={result} />
      <ClinicalCommentsPanel comments={comments} />
      <PdfReportViewer url={url ?? null} title="Clinical report" />
    </div>
  );
}

/* ============================================================
 * DISTRIBUTION / DELIVERY
 * ============================================================ */
export function DistributionStatusPanel({ tenantId, orderId }: { tenantId: string; orderId: string }) {
  const [channel, setChannel] = useState<"email" | "whatsapp" | "sms" | "print" | "portal" | "fhir" | "hl7">("email");
  const [recipient, setRecipient] = useState("");
  const call = useServerFn(sendDistribution);
  const list = useServerFn(listDistribution);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-dist", tenantId, orderId],
    queryFn: () => list({ data: { tenantId, orderId } }),
    enabled: !!tenantId && !!orderId,
  });
  const rows = asRows(q.data);
  const mut = useMutation({
    mutationFn: () => call({ data: { tenantId, orderId, channel, recipient: recipient || null } }),
    onSuccess: () => { toast.success("Distribution queued"); qc.invalidateQueries({ queryKey: ["lab-dist", tenantId, orderId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const channels: Array<typeof channel> = ["email", "whatsapp", "sms", "print", "portal", "fhir", "hl7"];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Distribution</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <Button key={c} size="sm" variant={c === channel ? "default" : "outline"} onClick={() => setChannel(c)}>
              {c}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Recipient (email / phone / address)" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Button disabled={!orderId || mut.isPending} onClick={() => mut.mutate()}>
            <Send className="mr-1 h-4 w-4" />Send
          </Button>
        </div>
        <DeliveryHistoryPanel rows={rows} loading={q.isLoading} />
      </CardContent>
    </Card>
  );
}

export function DeliveryHistoryPanel({ rows, loading }: { rows: Row[]; loading?: boolean }) {
  const columns: DataGridColumn<Row>[] = [
    { id: "ch", header: "Channel", cell: (r) => <Badge variant="outline">{str(r.channel)}</Badge> },
    { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
    { id: "recip", header: "Recipient", cell: (r) => str(r.recipient) || "—" },
    { id: "at", header: "At", cell: (r) => str(r.sent_at).slice(0, 16) || str(r.created_at).slice(0, 16) },
  ];
  return <DataGrid rows={rows} columns={columns} getRowId={(r) => str(r.id)} isLoading={loading} emptyMessage="No deliveries." />;
}

/* ============================================================
 * MICROBIOLOGY viewers + workspace
 * ============================================================ */
export function CultureResultViewer({ culture }: { culture: Row | null }) {
  if (!culture) return <div className="text-xs text-muted-foreground">Select a culture.</div>;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Microscope className="h-4 w-4" />Culture</CardTitle></CardHeader>
      <CardContent className="text-sm grid grid-cols-2 gap-2">
        <div><div className="text-xs text-muted-foreground">Growth</div><Badge variant="outline">{str(culture.growth_status)}</Badge></div>
        <div><div className="text-xs text-muted-foreground">Gram stain</div><div>{str(culture.gram_stain) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Organism</div><div>{str(culture.organism_name) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Colony count</div><div>{str(culture.colony_count) || "—"}</div></div>
        <div className="col-span-2"><div className="text-xs text-muted-foreground">Notes</div><div className="whitespace-pre-wrap">{str(culture.notes) || "—"}</div></div>
      </CardContent>
    </Card>
  );
}

export function SensitivityResultViewer({ entries }: { entries: Row[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Sensitivity panel</CardTitle></CardHeader>
      <CardContent>
        <DataGrid
          rows={entries}
          columns={[
            { id: "code", header: "Antibiotic", cell: (r) => <span className="font-mono text-xs">{str(r.antibiotic_code)}</span> },
            { id: "name", header: "Name", cell: (r) => str(r.antibiotic_name) },
            { id: "mic", header: "MIC", cell: (r) => str(r.mic) || "—" },
            {
              id: "int", header: "Interpretation",
              cell: (r) => {
                const i = str(r.interpretation);
                const tone = i === "S" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40" :
                  i === "R" ? "bg-destructive/10 text-destructive border-destructive/40" :
                  "bg-amber-500/10 text-amber-700 border-amber-500/40";
                return <Badge variant="outline" className={tone}>{i || "—"}</Badge>;
              },
            },
          ]}
          getRowId={(r) => str(r.id) || `${str(r.antibiotic_code)}-${str(r.antibiotic_name)}`}
          emptyMessage="No sensitivity results yet."
        />
      </CardContent>
    </Card>
  );
}

export function MicrobiologyReportWorkspace({ tenantId }: { tenantId: string }) {
  const [microId, setMicroId] = useState("");
  const [growth, setGrowth] = useState<"pending" | "no_growth" | "positive" | "mixed" | "contaminated">("pending");
  const [organism, setOrganism] = useState("");
  const [notes, setNotes] = useState("");
  const [cultureId, setCultureId] = useState("");
  const [entries, setEntries] = useState<Array<{ antibioticCode: string; antibioticName: string; interpretation: "S" | "I" | "R" | "SDD" }>>([
    { antibioticCode: "", antibioticName: "", interpretation: "S" },
  ]);

  const startFn = useServerFn(startMicrobiology);
  const cultureFn = useServerFn(reportCulture);
  const sensFn = useServerFn(reportSensitivity);
  const listFn = useServerFn(listCultures);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["lab-cultures", tenantId, microId],
    queryFn: () => listFn({ data: { tenantId, microbiologyOrderId: microId } }),
    enabled: !!tenantId && !!microId,
  });
  const cultures = asRows(q.data);
  const selected = cultures.find((c) => str(c.id) === cultureId) ?? cultures[0] ?? null;

  const mReport = useMutation({
    mutationFn: () => cultureFn({
      data: { tenantId, microbiologyOrderId: microId, growthStatus: growth, organismName: organism || null, notes: notes || null },
    }),
    onSuccess: () => { toast.success("Culture reported"); qc.invalidateQueries({ queryKey: ["lab-cultures", tenantId, microId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mSens = useMutation({
    mutationFn: () => sensFn({
      data: {
        tenantId,
        cultureId: str(selected?.id) || cultureId,
        entries: entries.filter((e) => e.antibioticCode && e.antibioticName),
      },
    }),
    onSuccess: () => toast.success("Sensitivity saved"),
    onError: (e) => toast.error((e as Error).message),
  });
  const mStart = useMutation({
    mutationFn: (orderId: string) => startFn({ data: { tenantId, orderId, requestKind: "culture" } }),
    onSuccess: (res) => {
      const created = (res as { order?: Row } | undefined)?.order;
      if (created?.id) setMicroId(String(created.id));
      toast.success("Microbiology started");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Microbiology order</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="grow min-w-[240px]"><Label>Microbiology order ID</Label>
            <Input value={microId} onChange={(e) => setMicroId(e.target.value)} placeholder="UUID of started micro order" />
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Order ID to start from…" onKeyDown={(e) => {
              if (e.key === "Enter") mStart.mutate((e.target as HTMLInputElement).value);
            }} />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Report culture</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Growth</Label>
              <select
                className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                value={growth}
                onChange={(e) => setGrowth(e.target.value as typeof growth)}
              >
                {["pending", "no_growth", "positive", "mixed", "contaminated"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div><Label>Organism</Label><Input value={organism} onChange={(e) => setOrganism(e.target.value)} /></div>
          </div>
          <div><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <Button size="sm" disabled={!microId || mReport.isPending} onClick={() => mReport.mutate()}>Save culture</Button>
        </CardContent>
      </Card>

      <CultureResultViewer culture={selected} />

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Sensitivity entries</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Culture ID</Label><Input value={cultureId} onChange={(e) => setCultureId(e.target.value)} placeholder={str(selected?.id) || "select from list"} /></div>
          <div className="space-y-2">
            {entries.map((r, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-2">
                <Input placeholder="Code" value={r.antibioticCode} onChange={(e) => {
                  const next = [...entries]; next[idx] = { ...r, antibioticCode: e.target.value }; setEntries(next);
                }} />
                <Input placeholder="Name" value={r.antibioticName} onChange={(e) => {
                  const next = [...entries]; next[idx] = { ...r, antibioticName: e.target.value }; setEntries(next);
                }} />
                <select
                  className="rounded-md border bg-background px-2 py-1 text-sm"
                  value={r.interpretation}
                  onChange={(e) => {
                    const next = [...entries]; next[idx] = { ...r, interpretation: e.target.value as "S" | "I" | "R" | "SDD" }; setEntries(next);
                  }}
                >
                  {["S", "I", "R", "SDD"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={() => setEntries(entries.filter((_, i) => i !== idx))}>Remove</Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setEntries([...entries, { antibioticCode: "", antibioticName: "", interpretation: "S" }])}>+ Row</Button>
          </div>
          <Button size="sm" disabled={mSens.isPending || !(selected?.id || cultureId)} onClick={() => mSens.mutate()}>Save sensitivity</Button>
        </CardContent>
      </Card>

      <div className="lg:col-span-3">
        <SensitivityResultViewer entries={cultures.length > 0 ? cultures : []} />
      </div>
    </div>
  );
}

/* ============================================================
 * PATHOLOGY viewers + workspace
 * ============================================================ */
export function GrossDescriptionPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Gross description</CardTitle></CardHeader>
      <CardContent><Textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Macroscopic examination…" /></CardContent>
    </Card>
  );
}

export function MicroscopicDescriptionPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Microscopic description</CardTitle></CardHeader>
      <CardContent><Textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Histological findings…" /></CardContent>
    </Card>
  );
}

export function DiagnosisPanel({ value, icd, onChange, onIcdChange }: {
  value: string; icd: string; onChange: (v: string) => void; onIcdChange: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Diagnosis</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Final diagnosis…" />
        <div><Label>ICD-O code</Label><Input value={icd} onChange={(e) => onIcdChange(e.target.value)} /></div>
      </CardContent>
    </Card>
  );
}

export function PathologyReportWorkspace({ tenantId }: { tenantId: string }) {
  const [caseId, setCaseId] = useState("");
  const [gross, setGross] = useState("");
  const [micro, setMicro] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [icd, setIcd] = useState("");

  const report = useServerFn(reportPathologyCase);
  const transition = useServerFn(transitionPathologyCase);
  const list = useServerFn(listPathologyCases);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["lab-path-cases", tenantId],
    queryFn: () => list({ data: { tenantId } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const selected = rows.find((r) => str(r.id) === caseId) ?? null;

  const mReport = useMutation({
    mutationFn: () => report({
      data: {
        tenantId, caseId,
        grossDescription: gross || null,
        microscopicDescription: micro || null,
        diagnosis: diagnosis || null,
        icdOCode: icd || null,
      },
    }),
    onSuccess: () => { toast.success("Report saved"); qc.invalidateQueries({ queryKey: ["lab-path-cases", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mSignoff = useMutation({
    mutationFn: () => transition({ data: { tenantId, caseId, to: "reported" } }),
    onSuccess: () => { toast.success("Case signed out"); qc.invalidateQueries({ queryKey: ["lab-path-cases", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pathology cases</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "id", header: "Case", cell: (r) => <span className="font-mono text-xs">{short(r.id)}</span> },
              { id: "kind", header: "Kind", cell: (r) => str(r.case_kind) },
              { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              { id: "diag", header: "Diagnosis", cell: (r) => <span className="truncate max-w-xs inline-block">{str(r.diagnosis)}</span> },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={q.isLoading}
            onRowClick={(r) => {
              setCaseId(str(r.id));
              setGross(str(r.gross_description));
              setMicro(str(r.microscopic_description));
              setDiagnosis(str(r.diagnosis));
              setIcd(str(r.icd_o_code));
            }}
          />
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-3">
        <GrossDescriptionPanel value={gross} onChange={setGross} />
        <MicroscopicDescriptionPanel value={micro} onChange={setMicro} />
        <DiagnosisPanel value={diagnosis} icd={icd} onChange={setDiagnosis} onIcdChange={setIcd} />
        <ClinicalCommentsPanel comments={str(selected?.notes) || null} />
      </div>

      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Case controls</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Case ID</Label><Input value={caseId} onChange={(e) => setCaseId(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!caseId || mReport.isPending} onClick={() => mReport.mutate()}>Save report</Button>
              <Button size="sm" variant="outline" disabled={!caseId || mSignoff.isPending} onClick={() => mSignoff.mutate()}>Sign out</Button>
            </div>
          </CardContent>
        </Card>
        <DoctorSignoffPanel result={selected} />
      </div>
    </div>
  );
}

/* ============================================================
 * RADIOLOGY viewers + workspace
 * ============================================================ */
export function StudySummaryPanel({ study }: { study: Row | null }) {
  if (!study) return <div className="text-xs text-muted-foreground">No study selected.</div>;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radiation className="h-4 w-4" />Study summary</CardTitle></CardHeader>
      <CardContent className="text-sm grid grid-cols-2 gap-2">
        <div><div className="text-xs text-muted-foreground">Modality</div><div>{str(study.modality_code) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Accession</div><div className="font-mono">{str(study.accession_no) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Performed</div><div>{str(study.performed_at).slice(0, 16) || "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">Technologist</div><div className="font-mono">{short(study.technologist_id) || "—"}</div></div>
        <div className="col-span-2"><div className="text-xs text-muted-foreground">Study UID</div><div className="font-mono text-xs">{str(study.study_uid) || "—"}</div></div>
      </CardContent>
    </Card>
  );
}

export function FindingsPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Findings</CardTitle></CardHeader>
      <CardContent><Textarea rows={6} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Structured findings…" /></CardContent>
    </Card>
  );
}

export function ImpressionPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Impression</CardTitle></CardHeader>
      <CardContent><Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Radiological impression…" /></CardContent>
    </Card>
  );
}

export function RecommendationPanel({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Recommendation</CardTitle></CardHeader>
      <CardContent><Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Recommended follow-up…" /></CardContent>
    </Card>
  );
}

export function StructuredReportViewer({ findings, impression, recommendation }: {
  findings?: string | null; impression?: string | null; recommendation?: string | null;
}) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Structured report</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <section>
          <div className="text-xs uppercase text-muted-foreground">Findings</div>
          <div className="whitespace-pre-wrap">{findings || "—"}</div>
        </section>
        <Separator />
        <section>
          <div className="text-xs uppercase text-muted-foreground">Impression</div>
          <div className="whitespace-pre-wrap">{impression || "—"}</div>
        </section>
        <Separator />
        <section>
          <div className="text-xs uppercase text-muted-foreground">Recommendation</div>
          <div className="whitespace-pre-wrap">{recommendation || "—"}</div>
        </section>
      </CardContent>
    </Card>
  );
}

export function RadiologyReportWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  const [studyId, setStudyId] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [seriesUid, setSeriesUid] = useState("");
  const [instanceUid, setInstanceUid] = useState("");

  const list = useServerFn(listRadiologyOrders);
  const meta = useServerFn(listStudyMetadata);
  const report = useServerFn(reportStudy);
  const attach = useServerFn(attachImagingMetadata);
  const qc = useQueryClient();

  const qOrders = useQuery({
    queryKey: ["lab-rad-orders", tenantId],
    queryFn: () => list({ data: { tenantId } }),
    enabled: !!tenantId,
  });
  const qMeta = useQuery({
    queryKey: ["lab-study-meta", tenantId, studyId],
    queryFn: () => meta({ data: { tenantId, studyId } }),
    enabled: !!tenantId && !!studyId,
  });
  const orders = asRows(qOrders.data);
  const metaRows = asRows(qMeta.data);
  const selected = orders.find((o) => str(o.id) === orderId) ?? null;

  const mReport = useMutation({
    mutationFn: () => report({
      data: {
        tenantId, studyId,
        reportText: [findings, impression, recommendation ? `Recommendation: ${recommendation}` : ""].filter(Boolean).join("\n\n"),
        impression: impression || null,
      },
    }),
    onSuccess: () => { toast.success("Report saved"); qc.invalidateQueries({ queryKey: ["lab-rad-orders", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const mMeta = useMutation({
    mutationFn: () => attach({
      data: { tenantId, studyId, seriesUid: seriesUid || null, instanceUid: instanceUid || null },
    }),
    onSuccess: () => { toast.success("Metadata attached"); qc.invalidateQueries({ queryKey: ["lab-study-meta", tenantId, studyId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Radiology orders</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={orders}
            columns={[
              { id: "id", header: "Order", cell: (r) => <span className="font-mono text-xs">{short(r.id)}</span> },
              { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{str(r.status)}</Badge> },
              { id: "priority", header: "Priority", cell: (r) => str(r.priority) },
              { id: "sched", header: "Scheduled", cell: (r) => str(r.scheduled_at).slice(0, 16) || "—" },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={qOrders.isLoading}
            onRowClick={(r) => setOrderId(str(r.id))}
          />
        </CardContent>
      </Card>

      <div className="lg:col-span-2 space-y-3">
        <FindingsPanel value={findings} onChange={setFindings} />
        <ImpressionPanel value={impression} onChange={setImpression} />
        <RecommendationPanel value={recommendation} onChange={setRecommendation} />
        <StructuredReportViewer findings={findings} impression={impression} recommendation={recommendation} />
      </div>

      <div className="space-y-3">
        <StudySummaryPanel study={selected} />
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Save report</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Study ID</Label><Input value={studyId} onChange={(e) => setStudyId(e.target.value)} /></div>
            <Button size="sm" disabled={!studyId || !findings || mReport.isPending} onClick={() => mReport.mutate()}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Imaging metadata</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div><Label>Series UID</Label><Input value={seriesUid} onChange={(e) => setSeriesUid(e.target.value)} /></div>
            <div><Label>Instance UID</Label><Input value={instanceUid} onChange={(e) => setInstanceUid(e.target.value)} /></div>
            <Button size="sm" variant="outline" disabled={!studyId || mMeta.isPending} onClick={() => mMeta.mutate()}>Attach</Button>
            {metaRows.length > 0 ? (
              <ul className="text-xs space-y-1 mt-2">
                {metaRows.map((m) => (
                  <li key={str(m.id)} className="font-mono">{str(m.series_uid)} / {str(m.instance_uid)}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
        <DoctorSignoffPanel result={selected} />
      </div>
    </div>
  );
}

/* ============================================================
 * RESULT REVIEW workspace
 * ============================================================ */
export function ResultReviewWorkspace({ tenantId }: { tenantId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const list = useServerFn(listResults);
  const q = useQuery({
    queryKey: ["lab-results-review", tenantId],
    queryFn: () => list({ data: { tenantId, limit: 200 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const selected = useMemo(() => rows.find((r) => str(r.id) === selectedId) ?? rows[0] ?? null, [rows, selectedId]);
  const previous = useMemo(() => {
    if (!selected) return null;
    return rows.find((r) => str(r.test_id) === str(selected.test_id) && str(r.id) !== str(selected.id)) ?? null;
  }, [rows, selected]);

  const kpis = useMemo(() => {
    const pending = rows.filter((r) => str(r.status) === "pending").length;
    const verified = rows.filter((r) => str(r.status) === "verified").length;
    const released = rows.filter((r) => str(r.status) === "released").length;
    const critical = rows.filter((r) => Boolean(r.is_critical)).length;
    return { pending, verified, released, critical };
  }, [rows]);

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Pending" value={kpis.pending} icon={ClipboardCheck} tone="warning" />
        <KpiCard label="Verified" value={kpis.verified} icon={ShieldCheck} tone="info" />
        <KpiCard label="Released" value={kpis.released} icon={Send} tone="success" />
        <KpiCard label="Critical" value={kpis.critical} icon={AlertTriangle} tone="danger" />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Results queue</CardTitle></CardHeader>
            <CardContent>
              <DataGrid
                rows={rows}
                columns={[
                  { id: "id", header: "ID", cell: (r) => <span className="font-mono text-xs">{short(r.id)}</span> },
                  { id: "test", header: "Test", cell: (r) => <span className="font-mono text-xs">{short(r.test_id)}</span> },
                  { id: "val", header: "Value", cell: (r) => str(r.numeric_value ?? r.text_value ?? r.coded_value) },
                  { id: "unit", header: "Unit", cell: (r) => str(r.unit_code) },
                  { id: "flag", header: "Flag", cell: (r) => str(r.flag) || "—" },
                  {
                    id: "status", header: "Status",
                    cell: (r) => <Badge variant={str(r.status) === "released" ? "default" : "outline"}>{str(r.status)}</Badge>,
                  },
                  {
                    id: "crit", header: "",
                    cell: (r) => r.is_critical ? <Badge variant="destructive">crit</Badge> : null,
                  },
                ]}
                getRowId={(r) => str(r.id)}
                onRowClick={(r) => setSelectedId(str(r.id))}
                isLoading={q.isLoading}
                emptyMessage="No results in scope."
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <ResultStatusRibbon
            status={str(selected?.status)}
            critical={Boolean(selected?.is_critical)}
            deltaFlag={str(selected?.delta_flag) || null}
          />
          <CriticalValueWorkflow result={selected} />
          <ReferenceRangeViewer result={selected} />
          <DeltaCheckViewer result={selected} />
          <ApprovalStatusCard result={selected} />
          <ResultVerificationPanel tenantId={tenantId} result={selected} />
          <div className="flex justify-end">
            <ReleaseConfirmationDialog tenantId={tenantId} result={selected} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="report">
        <TabsList>
          <TabsTrigger value="report">Clinical report</TabsTrigger>
          <TabsTrigger value="compare">Comparison</TabsTrigger>
          <TabsTrigger value="amend">Amendment history</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>
        <TabsContent value="report" className="mt-3">
          <ClinicalReportViewer order={null} result={selected} comments={str(selected?.amended_reason) || null} url={null} />
        </TabsContent>
        <TabsContent value="compare" className="mt-3">
          <ResultComparisonPanel current={selected} previous={previous} />
        </TabsContent>
        <TabsContent value="amend" className="mt-3">
          <AmendmentHistoryPanel tenantId={tenantId} result={selected} />
        </TabsContent>
        <TabsContent value="distribution" className="mt-3">
          {selected?.order_id ? (
            <DistributionStatusPanel tenantId={tenantId} orderId={str(selected.order_id)} />
          ) : (
            <div className="text-xs text-muted-foreground">Select a result linked to an order.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
 * REPORTING HUB (used by /laboratory/reporting)
 * ============================================================ */
export function ReportingHubWorkspace({ tenantId }: { tenantId: string }) {
  return (
    <Tabs defaultValue="review">
      <TabsList>
        <TabsTrigger value="review">Result review</TabsTrigger>
        <TabsTrigger value="micro">Microbiology</TabsTrigger>
        <TabsTrigger value="path">Pathology</TabsTrigger>
        <TabsTrigger value="rad">Radiology</TabsTrigger>
      </TabsList>
      <TabsContent value="review" className="mt-3"><ResultReviewWorkspace tenantId={tenantId} /></TabsContent>
      <TabsContent value="micro" className="mt-3"><MicrobiologyReportWorkspace tenantId={tenantId} /></TabsContent>
      <TabsContent value="path" className="mt-3"><PathologyReportWorkspace tenantId={tenantId} /></TabsContent>
      <TabsContent value="rad" className="mt-3"><RadiologyReportWorkspace tenantId={tenantId} /></TabsContent>
    </Tabs>
  );
}

/* ============================================================
 * AMENDMENT HISTORY (page-level)
 * ============================================================ */
export function AmendmentBrowserWorkspace({ tenantId }: { tenantId: string }) {
  const list = useServerFn(listResults);
  const q = useQuery({
    queryKey: ["lab-amendments", tenantId],
    queryFn: () => list({ data: { tenantId, status: "amended", limit: 200 } }),
    enabled: !!tenantId,
  });
  const rows = asRows(q.data);
  const [selectedId, setSelectedId] = useState("");
  const selected = rows.find((r) => str(r.id) === selectedId) ?? rows[0] ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Amended results</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={rows}
            columns={[
              { id: "id", header: "ID", cell: (r) => <span className="font-mono text-xs">{short(r.id)}</span> },
              { id: "test", header: "Test", cell: (r) => <span className="font-mono text-xs">{short(r.test_id)}</span> },
              { id: "reason", header: "Reason", cell: (r) => <span className="truncate max-w-xs inline-block">{str(r.amended_reason)}</span> },
              { id: "at", header: "At", cell: (r) => str(r.updated_at).slice(0, 16) },
            ]}
            getRowId={(r) => str(r.id)}
            onRowClick={(r) => setSelectedId(str(r.id))}
            isLoading={q.isLoading}
            emptyMessage="No amendments recorded."
          />
        </CardContent>
      </Card>
      <div>
        <AmendmentHistoryPanel tenantId={tenantId} result={selected} />
      </div>
    </div>
  );
}

/* ============================================================
 * DISTRIBUTION REPORT (page-level)
 * ============================================================ */
export function DistributionReportWorkspace({ tenantId }: { tenantId: string }) {
  const [orderId, setOrderId] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Report distribution</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Order ID</Label><Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Enter order UUID" /></div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Distribution uses the platform Integration Dispatcher for all channels.
          </div>
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        {orderId ? (
          <DistributionStatusPanel tenantId={tenantId} orderId={orderId} />
        ) : (
          <div className="text-sm text-muted-foreground p-6 border rounded-md bg-muted/30">
            Enter an order ID to view and manage distribution history.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * GUARD wrapper
 * ============================================================ */
export function ReportingGuard({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard
      permissions={["lab:read", "lab:verify", "lab:release"]}
      fallback={<div className="text-sm text-muted-foreground p-6">Not authorized for laboratory reporting.</div>}
    >
      {children}
    </PermissionGuard>
  );
}

/* Alias for backwards-friendly imports */
export { AmendmentBrowserWorkspace as AmendmentsWorkspace };
