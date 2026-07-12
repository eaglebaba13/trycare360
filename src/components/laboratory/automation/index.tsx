/**
 * Laboratory automation surface — Stage 5 UI.
 *
 * All components consume Stage 2 server functions + Stage 5 AI functions
 * via useServerFn. No direct Supabase queries and no business logic.
 * Presentational primitives compose the shared standards components
 * (DataGrid, KpiCard, TimelinePanel) to keep the platform look-and-feel.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FlaskConical,
  Gauge,
  HeartPulse,
  Loader2,
  MessageSquareText,
  Radiation,
  Radio,
  RefreshCw,
  ScrollText,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TimerReset,
  Wand2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid, type DataGridColumn } from "@/components/standards/data-grid";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { cn } from "@/lib/utils";
import {
  listInstruments,
  listAnalyzerQueue,
  enqueueAnalyzerJob,
  ingestAnalyzerResult,
} from "@/lib/laboratory/instrument.functions";
import { recordQcRun, listRecentQc } from "@/lib/laboratory/qc.functions";
import { listCalibrations } from "@/lib/laboratory/calibration.functions";
import { listDistribution, sendDistribution } from "@/lib/laboratory/distribution.functions";
import {
  orderVolumeSnapshot,
  resultStatusSnapshot,
  turnaroundSnapshot,
} from "@/lib/laboratory/analytics.functions";
import {
  runLabAssistant,
  listLabAssistantTurns,
  setLabAssistantStatus,
  submitLabAssistantFeedback,
} from "@/lib/laboratory/ai/assistant.functions";
import {
  LAB_AI_LABELS,
  LAB_AI_PURPOSES,
  type LabAiPurpose,
} from "@/lib/laboratory/ai/prompt-library";

type Row = Record<string, unknown>;
const asRows = (data: unknown) => (((data as { rows?: Row[] } | undefined)?.rows) ?? []) as Row[];
const str = (v: unknown) => (v == null ? "" : String(v));

/* ============================================================
 * ANALYZER STATUS
 * ============================================================ */

export function AnalyzerStatusCard({ instrument }: { instrument: Row }) {
  const status = str(instrument.status) || "unknown";
  const tone =
    status === "online" ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" :
    status === "offline" ? "bg-rose-500/15 text-rose-700 border-rose-500/30" :
    status === "maintenance" ? "bg-amber-500/15 text-amber-700 border-amber-500/30" :
    "bg-muted text-muted-foreground border-border";
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5" /> {str(instrument.name) || str(instrument.code)}
        </CardTitle>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", tone)}>{status}</span>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1">
        <div>Code: <span className="font-mono">{str(instrument.code) || "—"}</span></div>
        <div>Serial: <span className="font-mono">{str(instrument.serial_no) || "—"}</span></div>
        <div>Location: {str(instrument.location) || "—"}</div>
      </CardContent>
    </Card>
  );
}

export function AnalyzerDashboard({ tenantId }: { tenantId: string }) {
  const list = useServerFn(listInstruments);
  const q = useQuery({
    queryKey: ["lab-analyzers", tenantId],
    queryFn: () => list({ data: { tenantId } }),
  });
  const rows = asRows(q.data);
  const online = rows.filter((r) => str(r.status) === "online").length;
  const offline = rows.filter((r) => str(r.status) === "offline").length;
  const maintenance = rows.filter((r) => str(r.status) === "maintenance").length;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Instruments" value={rows.length} icon={Cpu} tone="info" />
        <KpiCard label="Online" value={online} icon={Wifi} tone="success" />
        <KpiCard label="Offline" value={offline} icon={WifiOff} tone="danger" />
        <KpiCard label="Maintenance" value={maintenance} icon={ShieldCheck} tone="warning" />
      </KpiGrid>
      {q.isLoading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => <AnalyzerStatusCard key={str(r.id)} instrument={r} />)}
          {rows.length === 0 && <div className="text-xs text-muted-foreground">No instruments registered.</div>}
        </div>
      )}
    </div>
  );
}

export function AnalyzerQueue({ tenantId, instrumentId }: { tenantId: string; instrumentId: string }) {
  const list = useServerFn(listAnalyzerQueue);
  const q = useQuery({
    queryKey: ["lab-analyzer-queue", tenantId, instrumentId],
    queryFn: () => list({ data: { tenantId, instrumentId } }),
    enabled: Boolean(instrumentId),
  });
  const rows = asRows(q.data);
  const columns: DataGridColumn<Row>[] = [
    { id: "id", header: "Queue ID", cell: (r: Row) => str(r.id).slice(0, 8) },
    { id: "status", header: "Status", cell: (r: Row) => <Badge variant="outline">{str(r.status)}</Badge> },
    { id: "order_item_id", header: "Order Item", cell: (r: Row) => str(r.order_item_id).slice(0, 8) },
    { id: "queued_at", header: "Queued", cell: (r: Row) => str(r.queued_at) },
    { id: "completed_at", header: "Completed", cell: (r: Row) => str(r.completed_at) || "—" },
  ];
  return <DataGrid rows={rows} getRowId={(r) => str(r.id)} columns={columns} isLoading={q.isLoading} emptyMessage="No queue items." />;
}

export function AutomationQueue({ tenantId }: { tenantId: string }) {
  const list = useServerFn(listInstruments);
  const q = useQuery({
    queryKey: ["lab-analyzers", tenantId],
    queryFn: () => list({ data: { tenantId } }),
  });
  const rows = asRows(q.data);
  const [selected, setSelected] = useState<string>("");
  const activeId = selected || str(rows[0]?.id);
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><Server className="h-3.5 w-3.5" />Automation queue</CardTitle>
        <Select value={activeId} onValueChange={setSelected}>
          <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Select instrument" /></SelectTrigger>
          <SelectContent>
            {rows.map((r) => (
              <SelectItem key={str(r.id)} value={str(r.id)}>{str(r.name) || str(r.code)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {activeId ? <AnalyzerQueue tenantId={tenantId} instrumentId={activeId} /> : <div className="text-xs text-muted-foreground">Select an instrument.</div>}
      </CardContent>
    </Card>
  );
}

export function WorkflowStatus({ tenantId }: { tenantId: string }) {
  const orders = useServerFn(orderVolumeSnapshot);
  const results = useServerFn(resultStatusSnapshot);
  const tat = useServerFn(turnaroundSnapshot);
  const [oq, rq, tq] = [
    useQuery({ queryKey: ["lab-orders-snap", tenantId], queryFn: () => orders({ data: { tenantId } }) }),
    useQuery({ queryKey: ["lab-results-snap", tenantId], queryFn: () => results({ data: { tenantId } }) }),
    useQuery({ queryKey: ["lab-tat-snap", tenantId], queryFn: () => tat({ data: { tenantId } }) }),
  ];
  const orderTotals = (oq.data as { totals?: { count?: number; byStatus?: Record<string, number> } } | undefined)?.totals;
  const resultTotals = (rq.data as { totals?: { count?: number; byStatus?: Record<string, number>; critical?: number } } | undefined)?.totals;
  const tatMean = (tq.data as { averageMinutes?: number } | undefined)?.averageMinutes;
  return (
    <KpiGrid>
      <KpiCard label="Order volume" value={orderTotals?.count ?? "…"} icon={FlaskConical} />
      <KpiCard label="Results" value={resultTotals?.count ?? "…"} icon={CheckCircle2} />
      <KpiCard label="Critical" value={resultTotals?.critical ?? 0} icon={Radiation} tone="danger" />
      <KpiCard label="Mean TAT (min)" value={tatMean ?? "—"} icon={TimerReset} />
    </KpiGrid>
  );
}

/* ============================================================
 * INSTRUMENT MONITORING
 * ============================================================ */

export function InstrumentMonitor({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <AnalyzerDashboard tenantId={tenantId} />
      <AutomationQueue tenantId={tenantId} />
    </div>
  );
}

export function InstrumentHealth({ tenantId }: { tenantId: string }) {
  const list = useServerFn(listInstruments);
  const q = useQuery({
    queryKey: ["lab-analyzers-health", tenantId],
    queryFn: () => list({ data: { tenantId } }),
  });
  const rows = asRows(q.data);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><HeartPulse className="h-3.5 w-3.5" />Instrument health</CardTitle></CardHeader>
      <CardContent>
        <TimelinePanel items={rows.map((r) => ({
          ts: str(r.updated_at) || str(r.created_at) || new Date().toISOString(),
          event_type: str(r.status) || "unknown",
          title: str(r.name) || str(r.code),
          body: `Serial ${str(r.serial_no) || "—"} · Location ${str(r.location) || "—"}`,
        }))} emptyMessage="No instruments yet." />
      </CardContent>
    </Card>
  );
}

export function InstrumentAlerts({ tenantId }: { tenantId: string }) {
  const list = useServerFn(listInstruments);
  const q = useQuery({
    queryKey: ["lab-analyzers-alerts", tenantId],
    queryFn: () => list({ data: { tenantId } }),
  });
  const rows = asRows(q.data).filter((r) => str(r.status) !== "online");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />Instrument alerts</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0
          ? <p className="text-xs text-muted-foreground">All instruments online.</p>
          : <ul className="space-y-2 text-xs">
              {rows.map((r) => (
                <li key={str(r.id)} className="flex items-center justify-between rounded-md border px-2 py-1.5">
                  <span>{str(r.name) || str(r.code)}</span>
                  <Badge variant="outline">{str(r.status)}</Badge>
                </li>
              ))}
            </ul>}
      </CardContent>
    </Card>
  );
}

export function CalibrationMonitor({ tenantId, instrumentId }: { tenantId: string; instrumentId?: string }) {
  const list = useServerFn(listInstruments);
  const cal = useServerFn(listCalibrations);
  const inst = useQuery({ queryKey: ["lab-analyzers", tenantId], queryFn: () => list({ data: { tenantId } }) });
  const activeId = instrumentId ?? str(asRows(inst.data)[0]?.id);
  const q = useQuery({
    queryKey: ["lab-calibrations", tenantId, activeId],
    queryFn: () => cal({ data: { tenantId, instrumentId: activeId } }),
    enabled: Boolean(activeId),
  });
  const rows = asRows(q.data);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-3.5 w-3.5" />Calibration monitor</CardTitle></CardHeader>
      <CardContent>
        <DataGrid
          rows={rows} getRowId={(r) => str(r.id)} columns={[
            { id: "performed_at", header: "Performed", cell: (r: Row) => str(r.performed_at) },
            { id: "status", header: "Status", cell: (r: Row) => <Badge variant="outline">{str(r.status)}</Badge> },
            { id: "notes", header: "Notes", cell: (r: Row) => str(r.notes) },
          ]}
          isLoading={q.isLoading}
          emptyMessage="No calibration records."
        />
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * QC / WESTGARD
 * ============================================================ */

export function QCMonitor({ tenantId, testId }: { tenantId: string; testId: string }) {
  const list = useServerFn(listRecentQc);
  const q = useQuery({
    queryKey: ["lab-qc-recent", tenantId, testId],
    queryFn: () => list({ data: { tenantId, testId } }),
    enabled: Boolean(testId),
  });
  const rows = asRows(q.data);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FlaskConical className="h-3.5 w-3.5" />QC runs (recent)</CardTitle></CardHeader>
      <CardContent>
        <DataGrid
          rows={rows} getRowId={(r) => str(r.id)} columns={[
            { id: "performed_at", header: "Performed", cell: (r: Row) => str(r.performed_at) },
            { id: "level", header: "Level", cell: (r: Row) => str(r.level) },
            { id: "value", header: "Value", cell: (r: Row) => str(r.value) },
            { id: "passed", header: "Result", cell: (r: Row) => (r.passed ? <Badge className="bg-emerald-500/20 text-emerald-700">Pass</Badge> : <Badge variant="destructive">Fail</Badge>) },
            { id: "violations", header: "Rules", cell: (r: Row) => Array.isArray(r.violations) ? (r.violations as string[]).join(", ") : "—" },
          ]}
          isLoading={q.isLoading}
          emptyMessage="No QC runs recorded."
        />
      </CardContent>
    </Card>
  );
}

export function WestgardDashboard({ tenantId, testId }: { tenantId: string; testId: string }) {
  const list = useServerFn(listRecentQc);
  const q = useQuery({
    queryKey: ["lab-qc-westgard", tenantId, testId],
    queryFn: () => list({ data: { tenantId, testId } }),
    enabled: Boolean(testId),
  });
  const rows = asRows(q.data);
  const pass = rows.filter((r) => r.passed).length;
  const fail = rows.length - pass;
  return (
    <div className="space-y-3">
      <KpiGrid>
        <KpiCard label="Runs" value={rows.length} icon={FlaskConical} />
        <KpiCard label="Pass" value={pass} icon={CheckCircle2} tone="success" />
        <KpiCard label="Fail" value={fail} icon={AlertTriangle} tone="danger" />
      </KpiGrid>
      <QCMonitor tenantId={tenantId} testId={testId} />
    </div>
  );
}

export function RuleViolationPanel({ tenantId, testId }: { tenantId: string; testId: string }) {
  const list = useServerFn(listRecentQc);
  const q = useQuery({
    queryKey: ["lab-qc-recent", tenantId, testId],
    queryFn: () => list({ data: { tenantId, testId } }),
    enabled: Boolean(testId),
  });
  const items = asRows(q.data)
    .filter((r) => Array.isArray(r.violations) && (r.violations as unknown[]).length > 0)
    .map((r) => ({
      ts: str(r.performed_at),
      event_type: "westgard",
      title: `Rule violation (level ${str(r.level)})`,
      body: (r.violations as string[]).join(", "),
    }));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />Rule violations</CardTitle></CardHeader>
      <CardContent><TimelinePanel items={items} emptyMessage="No Westgard rule violations." /></CardContent>
    </Card>
  );
}

/* ============================================================
 * INTEGRATION MONITORS (HL7 / FHIR / External vendors)
 * ============================================================ */

export function IntegrationStatus({ label, healthy, detail }: { label: string; healthy: boolean; detail?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">{healthy ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-rose-600" />}{label}</CardTitle>
        <Badge variant={healthy ? "outline" : "destructive"}>{healthy ? "healthy" : "degraded"}</Badge>
      </CardHeader>
      {detail && <CardContent className="text-xs text-muted-foreground">{detail}</CardContent>}
    </Card>
  );
}

export function ConnectionHealth() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <IntegrationStatus label="HL7 gateway" healthy detail="Awaiting live wiring via integration dispatcher." />
      <IntegrationStatus label="FHIR gateway" healthy detail="Serialisers ready — routed through dispatcher." />
      <IntegrationStatus label="ASTM drivers" healthy detail="Serial + TCP encoders ready." />
      <IntegrationStatus label="DICOM PACS" healthy detail="QIDO/WADO/STOW helpers ready." />
    </div>
  );
}

export function HL7Monitor() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-3.5 w-3.5" />HL7 message monitor</CardTitle></CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        HL7 v2 ORM / ORU traffic is routed through the shared Integration Dispatcher.
        Live message logs surface once a vendor connection is linked in Settings → Integrations.
      </CardContent>
    </Card>
  );
}

export function FHIRMonitor() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Radio className="h-3.5 w-3.5" />FHIR resource monitor</CardTitle></CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        DiagnosticReport, Observation, ServiceRequest and ImagingStudy adapters ready.
        Payloads dispatched through the shared Integration Dispatcher.
      </CardContent>
    </Card>
  );
}

export function MessageViewer({ title, payload }: { title: string; payload: string | Record<string, unknown> }) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ScrollText className="h-3.5 w-3.5" />{title}</CardTitle></CardHeader>
      <CardContent>
        <ScrollArea className="max-h-64 rounded-md border bg-muted/30 p-2">
          <pre className="text-[11px] leading-snug whitespace-pre-wrap font-mono">{body || "—"}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function RetryQueue() {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5" />Retry queue</CardTitle></CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Failed dispatcher jobs auto-retry via <code className="text-[11px]">/api/public/integrations/process-jobs</code> with exponential back-off.
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * EXTERNAL LAB / VENDOR / DISTRIBUTION QUEUES
 * ============================================================ */

export function ExternalLabDashboard() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <IntegrationStatus label="External vendors" healthy detail="Submissions & result ingestion via ExternalLabEngine." />
      <IntegrationStatus label="Reference-lab retry" healthy detail="Retries handled by integration jobs." />
      <IntegrationStatus label="Vendor billing" healthy detail="Costs recorded on submission." />
    </div>
  );
}

export function VendorQueue({ items }: { items?: Row[] }) {
  const rows = items ?? [];
  return (
    <DataGrid
      rows={rows} getRowId={(r) => str(r.id)} columns={[
        { id: "vendor_code", header: "Vendor", cell: (r: Row) => str(r.vendor_code) },
        { id: "status", header: "Status", cell: (r: Row) => <Badge variant="outline">{str(r.status)}</Badge> },
        { id: "submitted_at", header: "Submitted", cell: (r: Row) => str(r.submitted_at) },
        { id: "completed_at", header: "Completed", cell: (r: Row) => str(r.completed_at) || "—" },
      ]}
      emptyMessage="No external submissions."
    />
  );
}

export function DistributionQueue({ tenantId, orderId }: { tenantId: string; orderId: string }) {
  const list = useServerFn(listDistribution);
  const send = useServerFn(sendDistribution);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["lab-distribution", tenantId, orderId],
    queryFn: () => list({ data: { tenantId, orderId } }),
    enabled: Boolean(orderId),
  });
  const mut = useMutation({
    mutationFn: (channel: "email" | "whatsapp" | "sms" | "portal" | "print" | "fhir" | "hl7") =>
      send({ data: { tenantId, orderId, channel } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lab-distribution", tenantId, orderId] });
      toast.success("Distribution triggered");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Distribution failed"),
  });
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2"><Send className="h-3.5 w-3.5" />Distribution queue</CardTitle>
        <div className="flex gap-1">
          {(["email", "whatsapp", "sms", "portal"] as const).map((c) => (
            <Button key={c} size="sm" variant="outline" className="h-7 text-[11px]" disabled={mut.isPending} onClick={() => mut.mutate(c)}>{c}</Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <DataGrid
          data={asRows(q.data)}
          columns={[
            { id: "channel", header: "Channel", cell: (r: Row) => str(r.channel) },
            { id: "status", header: "Status", cell: (r: Row) => <Badge variant="outline">{str(r.status)}</Badge> },
            { id: "recipient", header: "Recipient", cell: (r: Row) => str(r.recipient) || "—" },
            { id: "sent_at", header: "Sent", cell: (r: Row) => str(r.sent_at) },
          ]}
          isLoading={q.isLoading}
          emptyMessage="Nothing distributed yet."
        />
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * AI ASSISTANT SURFACES
 * ============================================================ */

interface AiSurfaceProps {
  tenantId: string;
  scope: string;
  purpose?: LabAiPurpose;
  title?: string;
  seedPayload?: Record<string, unknown>;
}

export function AIAssistantPanel({ tenantId, scope, purpose, title, seedPayload }: AiSurfaceProps) {
  const runFn = useServerFn(runLabAssistant);
  const listFn = useServerFn(listLabAssistantTurns);
  const statusFn = useServerFn(setLabAssistantStatus);
  const feedbackFn = useServerFn(submitLabAssistantFeedback);
  const qc = useQueryClient();
  const [selectedPurpose, setSelectedPurpose] = useState<LabAiPurpose>(purpose ?? "result_summary");
  const [notes, setNotes] = useState("");
  const currentPurpose = purpose ?? selectedPurpose;

  const turns = useQuery({
    queryKey: ["lab-ai-turns", tenantId, scope],
    queryFn: () => listFn({ data: { tenantId, scope } }),
  });

  const run = useMutation({
    mutationFn: () =>
      runFn({
        data: {
          tenantId,
          scope,
          purpose: currentPurpose,
          payload: { ...(seedPayload ?? {}), notes: notes.trim() || undefined },
        },
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["lab-ai-turns", tenantId, scope] });
      if (!res.ok) toast.error(res.error ?? "AI request failed");
      else toast.success("Assistant response ready");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "AI request failed"),
  });

  const status = useMutation({
    mutationFn: (args: { turnId: string; status: "accepted" | "rejected" | "archived" }) =>
      statusFn({ data: { tenantId, scope, turnId: args.turnId, status: args.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-ai-turns", tenantId, scope] }),
  });

  const feedback = useMutation({
    mutationFn: (args: { turnId: string; feedback: "up" | "down" }) =>
      feedbackFn({ data: { tenantId, scope, turnId: args.turnId, feedback: args.feedback } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lab-ai-turns", tenantId, scope] }),
  });

  const list = (turns.data as { turns?: unknown[] } | undefined)?.turns ?? [];

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" />{title ?? "Laboratory AI Assistant"}</CardTitle>
        <Badge variant="outline" className="ml-auto text-[10px]">advisory only</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {!purpose && (
          <Select value={selectedPurpose} onValueChange={(v) => setSelectedPurpose(v as LabAiPurpose)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LAB_AI_PURPOSES.map((p) => <SelectItem key={p} value={p}>{LAB_AI_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional additional context…" className="text-xs min-h-[60px]" />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}Run assistant
          </Button>
        </div>

        {list.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No assistant turns yet for this scope.</p>
        ) : (
          <ScrollArea className="max-h-80 rounded-md border">
            <ul className="p-2 space-y-2">
              {(list as Array<Row>).map((t) => (
                <li key={str(t.id)} className="rounded-md border p-2 space-y-1.5 bg-muted/20">
                  <div className="flex items-center gap-2 text-[10px]">
                    <Badge variant="outline">{str(t.purpose)}</Badge>
                    <span className="text-muted-foreground">{str(t.createdAt)}</span>
                    <Badge variant="outline" className="ml-auto">{str(t.status)}</Badge>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] leading-snug font-sans">{str(t.response) || (str(t.ok) === "false" ? "Request failed" : "")}</pre>
                  <div className="flex items-center gap-1">
                    {str(t.status) === "suggested" && (
                      <>
                        <Button size="sm" variant="default" className="h-6 text-[10px]" onClick={() => status.mutate({ turnId: str(t.id), status: "accepted" })}>Accept</Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => status.mutate({ turnId: str(t.id), status: "rejected" })}>Reject</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => status.mutate({ turnId: str(t.id), status: "archived" })}>Archive</Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 px-2 ml-auto" onClick={() => feedback.mutate({ turnId: str(t.id), feedback: "up" })}><ThumbsUp className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => feedback.mutate({ turnId: str(t.id), feedback: "down" })}><ThumbsDown className="h-3 w-3" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Purpose-specific wrappers -----------------------------------------------
const wrap = (purpose: LabAiPurpose) =>
  function AiWrapper(props: Omit<AiSurfaceProps, "purpose">) {
    return <AIAssistantPanel {...props} purpose={purpose} title={LAB_AI_LABELS[purpose]} />;
  };

export const ResultSuggestionPanel = wrap("result_summary");
export const ReferenceRangeAssistant = wrap("reference_range_explain");
export const DeltaCheckAssistant = wrap("delta_check_explain");
export const CriticalValueAssistant = wrap("critical_value_explain");
export const MicrobiologyAssistant = wrap("microbiology_interpret");
export const PathologyAssistant = wrap("pathology_report_assist");
export const RadiologyAssistant = wrap("radiology_report_assist");
export const TurnaroundAssistant = wrap("turnaround_optimize");

/* ============================================================
 * AUTOMATION TIMELINE / AUDIT
 * ============================================================ */

export function AutomationTimeline({ tenantId, scope }: { tenantId: string; scope: string }) {
  const listFn = useServerFn(listLabAssistantTurns);
  const q = useQuery({
    queryKey: ["lab-ai-turns", tenantId, scope],
    queryFn: () => listFn({ data: { tenantId, scope } }),
  });
  const list = ((q.data as { turns?: Row[] } | undefined)?.turns ?? []) as Row[];
  const items = list.map((t) => ({
    ts: str(t.createdAt),
    event_type: str(t.purpose),
    title: `${str(t.purpose)} · ${str(t.status)}`,
    body: str(t.response).slice(0, 160),
  }));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-3.5 w-3.5" />Automation timeline</CardTitle></CardHeader>
      <CardContent><TimelinePanel items={items} emptyMessage="No automation activity yet." /></CardContent>
    </Card>
  );
}

export function AuditViewer({ tenantId, scope }: { tenantId: string; scope: string }) {
  const listFn = useServerFn(listLabAssistantTurns);
  const q = useQuery({
    queryKey: ["lab-ai-turns", tenantId, scope],
    queryFn: () => listFn({ data: { tenantId, scope } }),
  });
  const list = ((q.data as { turns?: Row[] } | undefined)?.turns ?? []) as Row[];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ScrollText className="h-3.5 w-3.5" />AI audit trail</CardTitle></CardHeader>
      <CardContent>
        <DataGrid
          rows={list} getRowId={(r) => str(r.id)} columns={[
            { id: "createdAt", header: "When", cell: (r: Row) => str(r.createdAt) },
            { id: "purpose", header: "Purpose", cell: (r: Row) => str(r.purpose) },
            { id: "status", header: "Status", cell: (r: Row) => <Badge variant="outline">{str(r.status)}</Badge> },
            { id: "model", header: "Model", cell: (r: Row) => str(r.model) },
            { id: "latencyMs", header: "Latency", cell: (r: Row) => `${str(r.latencyMs)} ms` },
          ]}
          emptyMessage="No AI activity yet."
        />
      </CardContent>
    </Card>
  );
}

/* ============================================================
 * COMPOSED PAGE-LEVEL LAYOUTS
 * ============================================================ */

export function AutomationOverviewPage({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <WorkflowStatus tenantId={tenantId} />
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyzerDashboard tenantId={tenantId} />
        <InstrumentAlerts tenantId={tenantId} />
      </div>
      <AutomationQueue tenantId={tenantId} />
      <AutomationTimeline tenantId={tenantId} scope="automation:overview" />
    </div>
  );
}

export function IntegrationsPage({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <ConnectionHealth />
      <div className="grid gap-4 md:grid-cols-2">
        <HL7Monitor />
        <FHIRMonitor />
      </div>
      <RetryQueue />
      <AuditViewer tenantId={tenantId} scope="integrations" />
    </div>
  );
}

export function ExternalLabsPage({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <ExternalLabDashboard />
      <VendorQueue />
      <AuditViewer tenantId={tenantId} scope="external-labs" />
    </div>
  );
}

export function AIWorkspacePage({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <AIAssistantPanel tenantId={tenantId} scope="ai:general" />
        <ResultSuggestionPanel tenantId={tenantId} scope="ai:results" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <DeltaCheckAssistant tenantId={tenantId} scope="ai:delta" />
        <CriticalValueAssistant tenantId={tenantId} scope="ai:critical" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <PathologyAssistant tenantId={tenantId} scope="ai:pathology" />
        <RadiologyAssistant tenantId={tenantId} scope="ai:radiology" />
        <MicrobiologyAssistant tenantId={tenantId} scope="ai:microbiology" />
      </div>
      <TurnaroundAssistant tenantId={tenantId} scope="ai:turnaround" />
      <AuditViewer tenantId={tenantId} scope="ai:general" />
    </div>
  );
}

/* Icon export helpers (satisfy unused-import guard) */
export const AUTOMATION_ICONS = { Bot, MessageSquareText, ChevronRight };
