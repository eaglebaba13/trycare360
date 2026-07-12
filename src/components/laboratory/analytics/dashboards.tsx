/**
 * Laboratory Analytics — dashboards.
 *
 * READ-ONLY. Every dashboard consumes Stage 6 server functions
 * (getLaboratory*) which delegate to LaboratoryAnalyticsService, which
 * itself reads Stage 2 repositories. No client-side KPI math beyond
 * display formatting.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { downloadCsv } from "@/lib/analytics/csv";
import {
  LaboratoryKpiBar,
  fmtNum,
  fmtCurrency,
  fmtPct,
  type LaboratoryExecutiveKpiInput,
} from "./shell";
import {
  getLaboratoryExecutiveKpis,
  getLaboratoryOrders,
  getLaboratoryTurnaround,
  getLaboratorySpecimens,
  getLaboratoryAnalyzers,
  getLaboratoryQuality,
  getLaboratoryVerification,
  getLaboratoryDistribution,
  getLaboratoryExternalLabs,
  getLaboratoryRadiology,
  getLaboratoryPathology,
  getLaboratoryMicrobiology,
  getLaboratoryFinancial,
  getLaboratoryCompliance,
  getLaboratoryAi,
  getLaboratoryReport,
} from "@/lib/laboratory/analytics.functions";

// ---------------------------------------------------------------------------
// Small placeholders
// ---------------------------------------------------------------------------
export function ChartsPlaceholder({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        Trend visualisations are rendered by the shared Analytics Engine.
        Numeric series are available from the linked Reports export.
      </CardContent>
    </Card>
  );
}

export function TrendCards({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <KpiGrid>
      {items.map((i) => (
        <KpiCard key={i.label} label={i.label} value={i.value} />
      ))}
    </KpiGrid>
  );
}

export function ExportToolbar({
  filename,
  rows,
}: {
  filename: string;
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="sm"
        disabled={rows.length === 0}
        onClick={() => downloadCsv(filename, rows)}
      >
        Export CSV
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Executive
// ---------------------------------------------------------------------------
export function ExecutiveDashboard({ tenantId }: { tenantId: string }) {
  const execFn = useServerFn(getLaboratoryExecutiveKpis);
  const tatFn = useServerFn(getLaboratoryTurnaround);
  const qcFn = useServerFn(getLaboratoryQuality);
  const distFn = useServerFn(getLaboratoryDistribution);
  const extFn = useServerFn(getLaboratoryExternalLabs);
  const finFn = useServerFn(getLaboratoryFinancial);
  const aiFn = useServerFn(getLaboratoryAi);

  const exec = useQuery({ queryKey: ["lab-an-exec", tenantId], queryFn: () => execFn({ data: { tenantId } }) });
  const tat = useQuery({ queryKey: ["lab-an-tat", tenantId], queryFn: () => tatFn({ data: { tenantId } }) });
  const qc = useQuery({ queryKey: ["lab-an-qc", tenantId], queryFn: () => qcFn({ data: { tenantId } }) });
  const dist = useQuery({ queryKey: ["lab-an-dist", tenantId], queryFn: () => distFn({ data: { tenantId } }) });
  const ext = useQuery({ queryKey: ["lab-an-ext", tenantId], queryFn: () => extFn({ data: { tenantId } }) });
  const fin = useQuery({ queryKey: ["lab-an-fin", tenantId], queryFn: () => finFn({ data: { tenantId } }) });
  const ai = useQuery({ queryKey: ["lab-an-ai", tenantId], queryFn: () => aiFn({ data: { tenantId } }) });

  const kpis: LaboratoryExecutiveKpiInput = useMemo(() => {
    const e = exec.data?.totals;
    return {
      orders: e?.orders ?? 0,
      completed: e?.completed ?? 0,
      pending: e?.pending ?? 0,
      released: e?.released ?? 0,
      critical: e?.critical ?? 0,
      meanTat: tat.data?.averageMinutes ?? null,
      qcRecent: qc.data?.qcRulesActive ?? 0,
      externalShare: fin.data?.externalLabShare ?? 0,
      distributionSuccess: dist.data?.successRate ?? 0,
      revenue: fin.data?.externalLabCost ?? 0,
      insuranceShare: (fin.data?.orders ?? 0)
        ? (fin.data?.insuranceAuthorized ?? 0) / (fin.data?.orders ?? 1)
        : 0,
      aiUsage: ai.data?.totalTurns ?? 0,
    };
  }, [exec.data, tat.data, qc.data, dist.data, ext.data, fin.data, ai.data]);

  return (
    <div className="space-y-4">
      <LaboratoryKpiBar kpis={kpis} />
      <ChartsPlaceholder title="Order volume trend" />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Data sources</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>Executive tallies — getLaboratoryExecutiveKpis</div>
          <div>Turnaround — getLaboratoryTurnaround</div>
          <div>Quality — getLaboratoryQuality</div>
          <div>Distribution — getLaboratoryDistribution</div>
          <div>External labs — getLaboratoryExternalLabs</div>
          <div>Financial — getLaboratoryFinancial</div>
          <div>AI — getLaboratoryAi</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic breakdown card
// ---------------------------------------------------------------------------
function BreakdownCard({ title, data }: { title: string; data: Record<string, number> | undefined }) {
  const rows = Object.entries(data ?? {});
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {rows.length === 0 ? (
          <div className="text-muted-foreground">No data.</div>
        ) : (
          <ul className="space-y-1">
            {rows.map(([k, v]) => (
              <li key={k} className="flex justify-between">
                <span className="capitalize">{k.replaceAll("_", " ")}</span>
                <span className="tabular-nums">{fmtNum(v)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export function OrdersDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryOrders);
  const q = useQuery({ queryKey: ["lab-an-orders", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total orders" value={fmtNum(d?.total)} />
        <KpiCard label="Completed" value={fmtNum(d?.byStatus.completed)} tone="success" />
        <KpiCard label="Pending" value={fmtNum(d?.byStatus.pending)} tone="warning" />
        <KpiCard label="Cancelled" value={fmtNum(d?.byStatus.cancelled)} tone="danger" />
      </KpiGrid>
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="By status" data={d?.byStatus} />
        <BreakdownCard title="By priority" data={d?.byPriority} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Turnaround
// ---------------------------------------------------------------------------
export function TurnaroundDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryTurnaround);
  const q = useQuery({ queryKey: ["lab-an-tat", tenantId, "detail"], queryFn: () => fn({ data: { tenantId } }) });
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Sampled orders" value={fmtNum(q.data?.sampled)} />
        <KpiCard label="Mean TAT (min)" value={fmtNum(q.data?.averageMinutes)} />
        <KpiCard label="P95 TAT (min)" value={fmtNum(q.data?.p95Minutes)} tone="warning" />
      </KpiGrid>
      <ChartsPlaceholder title="Turnaround distribution" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Specimens
// ---------------------------------------------------------------------------
export function SpecimenDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratorySpecimens);
  const q = useQuery({ queryKey: ["lab-an-specs", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total specimens" value={fmtNum(d?.total)} />
        <KpiCard label="Rejected" value={fmtNum(d?.rejected)} tone="danger" />
        <KpiCard label="Rejection rate" value={fmtPct(d?.rejectionRate)} tone="warning" />
      </KpiGrid>
      <BreakdownCard title="By tracking status" data={d?.byStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analyzers
// ---------------------------------------------------------------------------
export function AnalyzerDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryAnalyzers);
  const q = useQuery({ queryKey: ["lab-an-analyzers", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Instruments" value={fmtNum(d?.instruments)} />
        <KpiCard label="Uptime" value={fmtPct(d?.uptimeRatio)} tone="success" />
        <KpiCard label="Queue depth" value={fmtNum(d?.queueDepth)} tone="warning" />
        <KpiCard label="Offline" value={fmtNum(d?.byStatus.offline)} tone="danger" />
      </KpiGrid>
      <BreakdownCard title="By instrument status" data={d?.byStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------
export function QualityDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryQuality);
  const q = useQuery({ queryKey: ["lab-an-quality", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Critical values" value={fmtNum(d?.criticalValues)} tone="danger" />
        <KpiCard label="Rejected results" value={fmtNum(d?.rejectedResults)} tone="warning" />
        <KpiCard label="Analyzer uptime" value={fmtPct(d?.analyzerUptime)} tone="success" />
        <KpiCard label="Analyzer queue" value={fmtNum(d?.analyzerQueue)} />
        <KpiCard label="Calibration overdue" value={fmtNum(d?.calibrationOverdue)} tone="danger" />
        <KpiCard label="QC rules active" value={fmtNum(d?.qcRulesActive)} />
        <KpiCard label="QC materials" value={fmtNum(d?.qcMaterials)} />
      </KpiGrid>
      <ChartsPlaceholder title="Westgard violations trend" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------
export function VerificationDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryVerification);
  const q = useQuery({ queryKey: ["lab-an-verify", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total results" value={fmtNum(d?.total)} />
        <KpiCard label="Pending" value={fmtNum(d?.pendingVerification)} tone="warning" />
        <KpiCard label="Auto-verified" value={fmtNum(d?.autoVerified)} tone="info" />
        <KpiCard label="Manual verified" value={fmtNum(d?.manualVerified)} tone="success" />
        <KpiCard label="Released" value={fmtNum(d?.released)} tone="success" />
        <KpiCard label="Amended" value={fmtNum(d?.amended)} tone="danger" />
      </KpiGrid>
      <BreakdownCard title="Result status" data={d?.byStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------
export function DistributionDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryDistribution);
  const q = useQuery({ queryKey: ["lab-an-dist-d", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total sent" value={fmtNum(d?.total)} />
        <KpiCard label="Delivered" value={fmtNum(d?.delivered)} tone="success" />
        <KpiCard label="Success rate" value={fmtPct(d?.successRate)} tone="success" />
      </KpiGrid>
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="By channel" data={d?.byChannel} />
        <BreakdownCard title="By status" data={d?.byStatus} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// External Labs
// ---------------------------------------------------------------------------
export function ExternalLabDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryExternalLabs);
  const q = useQuery({ queryKey: ["lab-an-ext-d", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total orders" value={fmtNum(d?.total)} />
        <KpiCard label="Total cost" value={fmtCurrency(d?.totalCost)} />
      </KpiGrid>
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="By vendor" data={d?.byVendor} />
        <BreakdownCard title="By status" data={d?.byStatus} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Radiology
// ---------------------------------------------------------------------------
export function RadiologyDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryRadiology);
  const q = useQuery({ queryKey: ["lab-an-rad", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Orders" value={fmtNum(d?.orders)} />
        <KpiCard label="Studies" value={fmtNum(d?.studies)} />
        <KpiCard label="Reported" value={fmtNum(d?.reported)} tone="success" />
        <KpiCard label="Pending" value={fmtNum(d?.pending)} tone="warning" />
      </KpiGrid>
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="By modality" data={d?.byModality} />
        <BreakdownCard title="Order status" data={d?.byStatus} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pathology
// ---------------------------------------------------------------------------
export function PathologyDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryPathology);
  const q = useQuery({ queryKey: ["lab-an-path", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Cases" value={fmtNum(d?.total)} />
        <KpiCard label="Gross completed" value={fmtNum(d?.grossCompleted)} />
        <KpiCard label="Microscopy completed" value={fmtNum(d?.microscopyCompleted)} />
        <KpiCard label="Reported" value={fmtNum(d?.reported)} tone="success" />
        <KpiCard label="Amended" value={fmtNum(d?.amended)} tone="danger" />
      </KpiGrid>
      <BreakdownCard title="Case status" data={d?.byStatus} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Microbiology
// ---------------------------------------------------------------------------
export function MicrobiologyDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryMicrobiology);
  const q = useQuery({ queryKey: ["lab-an-micro", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Cultures" value={fmtNum(d?.cultures)} />
        <KpiCard label="Reported" value={fmtNum(d?.reported)} tone="success" />
        <KpiCard label="Pending" value={fmtNum(d?.pending)} tone="warning" />
        <KpiCard label="Positive" value={fmtNum(d?.positive)} tone="danger" />
        <KpiCard label="Negative" value={fmtNum(d?.negative)} />
        <KpiCard label="Contaminated" value={fmtNum(d?.contaminated)} tone="warning" />
      </KpiGrid>
      <BreakdownCard title="Growth breakdown" data={d?.byGrowth} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Financial
// ---------------------------------------------------------------------------
export function FinancialDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryFinancial);
  const q = useQuery({ queryKey: ["lab-an-fin-d", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Orders" value={fmtNum(d?.orders)} />
        <KpiCard label="Billed orders" value={fmtNum(d?.billedOrders)} tone="info" />
        <KpiCard label="Insurance authorized" value={fmtNum(d?.insuranceAuthorized)} tone="info" />
        <KpiCard label="External lab cost" value={fmtCurrency(d?.externalLabCost)} />
        <KpiCard label="External lab share" value={fmtPct(d?.externalLabShare)} />
      </KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue reconciliation</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Billed revenue and insurance reconciliation live in the Data Foundation
          Revenue module — this panel surfaces only lab-side counters.
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------
export function ComplianceDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryCompliance);
  const q = useQuery({ queryKey: ["lab-an-comp", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Audit events" value={fmtNum(d?.auditEvents)} />
        <KpiCard label="Results amended" value={fmtNum(d?.resultsAmended)} tone="warning" />
        <KpiCard label="Critical values" value={fmtNum(d?.criticalValues)} tone="danger" />
        <KpiCard label="Orders sampled" value={fmtNum(d?.totalOrdersSampled)} />
      </KpiGrid>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------
export function AiDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryAi);
  const q = useQuery({ queryKey: ["lab-an-ai-d", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const d = q.data;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Assistant turns" value={fmtNum(d?.totalTurns)} />
        <KpiCard label="Acceptance rate" value={fmtPct(d?.acceptanceRate)} tone="success" />
        <KpiCard label="Rejection rate" value={fmtPct(d?.rejectionRate)} tone="danger" />
        <KpiCard label="Avg confidence" value={fmtPct(d?.avgConfidence)} />
        <KpiCard label="Avg response (ms)" value={fmtNum(d?.avgLatencyMs)} />
        <KpiCard label="Avg feedback" value={(d?.avgFeedback ?? 0).toFixed(2)} />
      </KpiGrid>
      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard title="By category" data={d?.byKind} />
        <BreakdownCard title="By status" data={d?.byStatus} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports panel
// ---------------------------------------------------------------------------
export function ReportsPanel({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(getLaboratoryReport);
  const q = useQuery({ queryKey: ["lab-an-report", tenantId], queryFn: () => fn({ data: { tenantId } }) });

  const flat = useMemo(() => {
    const d = q.data;
    if (!d) return [] as Record<string, unknown>[];
    return [
      { section: "orders", metric: "total", value: d.orders.total },
      { section: "turnaround", metric: "avg_minutes", value: d.turnaround.averageMinutes },
      { section: "turnaround", metric: "p95_minutes", value: d.turnaround.p95Minutes },
      { section: "specimens", metric: "total", value: d.specimens.total },
      { section: "specimens", metric: "rejection_rate", value: d.specimens.rejectionRate },
      { section: "analyzers", metric: "instruments", value: d.analyzers.instruments },
      { section: "analyzers", metric: "uptime", value: d.analyzers.uptimeRatio },
      { section: "quality", metric: "critical", value: d.quality.criticalValues },
      { section: "quality", metric: "calibration_overdue", value: d.quality.calibrationOverdue },
      { section: "verification", metric: "released", value: d.verification.released },
      { section: "distribution", metric: "success_rate", value: d.distribution.successRate },
      { section: "external", metric: "total_cost", value: d.external.totalCost },
      { section: "radiology", metric: "studies", value: d.radiology.studies },
      { section: "pathology", metric: "reported", value: d.pathology.reported },
      { section: "microbiology", metric: "reported", value: d.microbiology.reported },
      { section: "financial", metric: "billed_orders", value: d.financial.billedOrders },
      { section: "compliance", metric: "audit_events", value: d.compliance.auditEvents },
      { section: "ai", metric: "acceptance_rate", value: d.ai.acceptanceRate },
    ];
  }, [q.data]);

  return (
    <div className="space-y-4">
      <ExportToolbar filename="laboratory-analytics-report" rows={flat} />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Consolidated laboratory report</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {flat.length === 0 ? (
            <div className="text-muted-foreground">Report is being generated…</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Section</th>
                  <th className="py-1">Metric</th>
                  <th className="py-1 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {flat.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1 capitalize">{String(r.section)}</td>
                    <td className="py-1 capitalize">{String(r.metric).replaceAll("_", " ")}</td>
                    <td className="py-1 text-right tabular-nums">
                      {typeof r.value === "number" && r.value !== Math.trunc(r.value)
                        ? (r.value as number).toFixed(3)
                        : String(r.value ?? "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Data Foundation Reports</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Scheduled, PDF and Excel exports are handled by the Data Foundation
          Reports module. Use CSV above for ad-hoc download; open the Reports
          module for governed distribution.
        </CardContent>
      </Card>
    </div>
  );
}
