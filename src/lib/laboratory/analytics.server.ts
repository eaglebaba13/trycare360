/**
 * Phase 2.8 Laboratory — Analytics Aggregation Service.
 *
 * READ-ONLY. This is the only aggregation layer for laboratory analytics.
 * It composes existing Stage 2 repositories and shared helpers. It does NOT
 * implement KPI math beyond simple tallies (count, avg, group-by); every
 * business formula lives in the KPI Dictionary and the Stage 2 engines.
 *
 * No writes. No engine calls. No workflow transitions.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  LaboratoryOrderRepository,
  ResultRepository,
  SpecimenRepository,
  AnalyzerRepository,
  AnalyzerQueueRepository,
  QCRepository,
  CalibrationRepository,
  DistributionRepository,
  ExternalLabRepository,
  RadiologyRepository,
  PathologyRepository,
  MicrobiologyRepository,
  TurnaroundRepository,
  AuditRepository,
} from "./repositories.server";

type SB = SupabaseClient<Database>;

export interface AnalyticsWindow {
  tenantId: string;
  from?: string | null;
  to?: string | null;
  branchId?: string | null;
}

function tallyBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = String(r[key] ?? "unknown");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export class LaboratoryAnalyticsService {
  private readonly orders: LaboratoryOrderRepository;
  private readonly results: ResultRepository;
  private readonly specimens: SpecimenRepository;
  private readonly analyzers: AnalyzerRepository;
  private readonly queues: AnalyzerQueueRepository;
  private readonly qc: QCRepository;
  private readonly calibration: CalibrationRepository;
  private readonly distribution: DistributionRepository;
  private readonly externalLabs: ExternalLabRepository;
  private readonly radiology: RadiologyRepository;
  private readonly pathology: PathologyRepository;
  private readonly microbiology: MicrobiologyRepository;
  private readonly turnaround: TurnaroundRepository;
  private readonly audit: AuditRepository;

  constructor(private readonly sb: SB) {
    this.orders = new LaboratoryOrderRepository(sb);
    this.results = new ResultRepository(sb);
    this.specimens = new SpecimenRepository(sb);
    this.analyzers = new AnalyzerRepository(sb);
    this.queues = new AnalyzerQueueRepository(sb);
    this.qc = new QCRepository(sb);
    this.calibration = new CalibrationRepository(sb);
    this.distribution = new DistributionRepository(sb);
    this.externalLabs = new ExternalLabRepository(sb);
    this.radiology = new RadiologyRepository(sb);
    this.pathology = new PathologyRepository(sb);
    this.microbiology = new MicrobiologyRepository(sb);
    this.turnaround = new TurnaroundRepository(sb);
    this.audit = new AuditRepository(sb);
  }

  // -----------------------------------------------------------------------
  // Executive dashboard — high-level tallies only.
  // -----------------------------------------------------------------------
  async getExecutiveDashboard(w: AnalyticsWindow) {
    const [orders, results] = await Promise.all([
      this.orders.list({
        tenantId: w.tenantId,
        branchId: w.branchId ?? null,
        from: w.from ?? null,
        to: w.to ?? null,
        limit: 500,
      }),
      this.results.list({ tenantId: w.tenantId, limit: 500 }),
    ]);
    const byStatus = tallyBy(orders, "status");
    const released = results.filter((r) => r.status === "released").length;
    const critical = results.filter((r) => r.is_critical).length;
    return {
      totals: {
        orders: orders.length,
        completed: byStatus.completed ?? 0,
        pending: (byStatus.pending ?? 0) + (byStatus.ordered ?? 0) + (byStatus.received ?? 0),
        released,
        cancelled: byStatus.cancelled ?? 0,
        critical,
      },
      byStatus,
    };
  }

  // -----------------------------------------------------------------------
  async getOrderAnalytics(w: AnalyticsWindow) {
    const rows = await this.orders.list({
      tenantId: w.tenantId,
      branchId: w.branchId ?? null,
      from: w.from ?? null,
      to: w.to ?? null,
      limit: 500,
    });
    return {
      total: rows.length,
      byStatus: tallyBy(rows, "status"),
      byPriority: tallyBy(rows as Array<Record<string, unknown>>, "priority"),
    };
  }

  // -----------------------------------------------------------------------
  async getTurnaroundAnalytics(w: AnalyticsWindow) {
    const orders = await this.orders.list({
      tenantId: w.tenantId,
      branchId: w.branchId ?? null,
      from: w.from ?? null,
      to: w.to ?? null,
      limit: 100,
    });
    const durations: number[] = [];
    for (const o of orders) {
      const logs = await this.turnaround.listForOrder(o.id);
      if (logs.length >= 2) {
        const first = new Date(logs[0]!.occurred_at).getTime();
        const last = new Date(logs[logs.length - 1]!.occurred_at).getTime();
        durations.push((last - first) / 60000);
      }
    }
    const avg = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted.length ? Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0) : 0;
    return { sampled: durations.length, averageMinutes: avg, p95Minutes: p95 };
  }

  // -----------------------------------------------------------------------
  async getSpecimenAnalytics(w: AnalyticsWindow) {
    const orders = await this.orders.list({
      tenantId: w.tenantId,
      branchId: w.branchId ?? null,
      from: w.from ?? null,
      to: w.to ?? null,
      limit: 200,
    });
    let total = 0;
    let rejected = 0;
    const byStatus: Record<string, number> = {};
    for (const o of orders) {
      const list = await this.specimens.listByOrder(o.id);
      total += list.length;
      for (const s of list as Array<Record<string, unknown>>) {
        const st = String(s.status ?? "unknown");
        byStatus[st] = (byStatus[st] ?? 0) + 1;
        if (st === "rejected") rejected += 1;
      }
    }
    return {
      total,
      rejected,
      rejectionRate: total ? rejected / total : 0,
      byStatus,
    };
  }

  // -----------------------------------------------------------------------
  async getAnalyzerAnalytics(w: AnalyticsWindow) {
    const instruments = await this.analyzers.list(w.tenantId);
    const byStatus = tallyBy(instruments as Array<Record<string, unknown>>, "status");
    let queueDepth = 0;
    for (const i of instruments) {
      const q = await this.queues.listByInstrument(i.id);
      queueDepth += q.length;
    }
    const online = byStatus.online ?? 0;
    const total = instruments.length;
    return {
      instruments: total,
      byStatus,
      queueDepth,
      uptimeRatio: total ? online / total : 0,
    };
  }

  // -----------------------------------------------------------------------
  async getQualityAnalytics(w: AnalyticsWindow) {
    const results = await this.results.list({ tenantId: w.tenantId, limit: 500 });
    const critical = results.filter((r) => r.is_critical).length;
    const rejectedResults = results.filter((r) => r.status === "rejected").length;
    const [analyzer, calibration, qcRules, qcMaterials] = await Promise.all([
      this.getAnalyzerAnalytics(w),
      (async () => {
        const list = await this.analyzers.list(w.tenantId);
        let overdue = 0;
        const now = Date.now();
        for (const i of list) {
          const cals = await this.calibration.listForInstrument(i.id);
          const last = cals[0] as Record<string, unknown> | undefined;
          const due = last?.next_due_at ? new Date(String(last.next_due_at)).getTime() : null;
          if (due && due < now) overdue += 1;
        }
        return overdue;
      })(),
      this.qc.listRules(w.tenantId),
      this.qc.listMaterials(w.tenantId),
    ]);
    return {
      criticalValues: critical,
      rejectedResults,
      analyzerUptime: analyzer.uptimeRatio,
      analyzerQueue: analyzer.queueDepth,
      calibrationOverdue: calibration,
      qcRulesActive: qcRules.length,
      qcMaterials: qcMaterials.length,
    };
  }

  // -----------------------------------------------------------------------
  async getVerificationAnalytics(w: AnalyticsWindow) {
    const results = await this.results.list({ tenantId: w.tenantId, limit: 500 });
    const byStatus = tallyBy(results as Array<Record<string, unknown>>, "status");
    return {
      total: results.length,
      pendingVerification: byStatus.pending ?? 0,
      autoVerified: byStatus.auto_verified ?? 0,
      manualVerified: byStatus.verified ?? 0,
      released: byStatus.released ?? 0,
      amended: byStatus.amended ?? 0,
      byStatus,
    };
  }

  // -----------------------------------------------------------------------
  async getDistributionAnalytics(w: AnalyticsWindow) {
    const orders = await this.orders.list({
      tenantId: w.tenantId,
      branchId: w.branchId ?? null,
      from: w.from ?? null,
      to: w.to ?? null,
      limit: 100,
    });
    let total = 0;
    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const o of orders) {
      const list = await this.distribution.listForOrder(o.id);
      total += list.length;
      for (const l of list as Array<Record<string, unknown>>) {
        const ch = String(l.channel ?? "unknown");
        const st = String(l.status ?? "unknown");
        byChannel[ch] = (byChannel[ch] ?? 0) + 1;
        byStatus[st] = (byStatus[st] ?? 0) + 1;
      }
    }
    const delivered = byStatus.delivered ?? 0;
    return {
      total,
      delivered,
      successRate: total ? delivered / total : 0,
      byChannel,
      byStatus,
    };
  }

  // -----------------------------------------------------------------------
  async getExternalLabAnalytics(w: AnalyticsWindow) {
    const { data, error } = await this.sb
      .from("lab_external_orders")
      .select("id, vendor_code, status, cost, currency, submitted_at")
      .eq("tenant_id", w.tenantId)
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const byVendor = tallyBy(rows as Array<Record<string, unknown>>, "vendor_code");
    const byStatus = tallyBy(rows as Array<Record<string, unknown>>, "status");
    const totalCost = rows.reduce((a, r) => a + Number((r as { cost: number | null }).cost ?? 0), 0);
    return { total: rows.length, byVendor, byStatus, totalCost };
  }

  // -----------------------------------------------------------------------
  async getRadiologyAnalytics(w: AnalyticsWindow) {
    const orders = await this.radiology.listOrders(w.tenantId);
    const byStatus = tallyBy(orders as Array<Record<string, unknown>>, "status");
    const { data: studies } = await this.sb
      .from("rad_imaging_studies")
      .select("id, modality_code, status, performed_at, reported_at")
      .eq("tenant_id", w.tenantId)
      .limit(500);
    const list = studies ?? [];
    const byModality = tallyBy(list as Array<Record<string, unknown>>, "modality_code");
    const reported = list.filter((s) => (s as { reported_at: string | null }).reported_at).length;
    return {
      orders: orders.length,
      byStatus,
      studies: list.length,
      byModality,
      reported,
      pending: list.length - reported,
    };
  }

  // -----------------------------------------------------------------------
  async getPathologyAnalytics(w: AnalyticsWindow) {
    const cases = await this.pathology.list(w.tenantId);
    const byStatus = tallyBy(cases as Array<Record<string, unknown>>, "status");
    return {
      total: cases.length,
      byStatus,
      grossCompleted: (byStatus.grossing ?? 0) + (byStatus.processing ?? 0) + (byStatus.reviewing ?? 0) + (byStatus.reported ?? 0),
      microscopyCompleted: (byStatus.reviewing ?? 0) + (byStatus.reported ?? 0),
      reported: byStatus.reported ?? 0,
      amended: byStatus.amended ?? 0,
    };
  }

  // -----------------------------------------------------------------------
  async getMicrobiologyAnalytics(w: AnalyticsWindow) {
    const { data, error } = await this.sb
      .from("lab_cultures")
      .select("id, growth_status, incubated_at, reported_at, microbiology_order_id")
      .eq("tenant_id", w.tenantId)
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const byGrowth = tallyBy(rows, "growth_status");
    const reported = rows.filter((r) => r.reported_at).length;
    return {
      cultures: rows.length,
      reported,
      pending: rows.length - reported,
      positive: byGrowth.positive ?? 0,
      negative: byGrowth.no_growth ?? 0,
      contaminated: byGrowth.contaminated ?? 0,
      byGrowth,
    };
  }

  // -----------------------------------------------------------------------
  async getFinancialAnalytics(w: AnalyticsWindow) {
    const orders = await this.orders.list({
      tenantId: w.tenantId,
      branchId: w.branchId ?? null,
      from: w.from ?? null,
      to: w.to ?? null,
      limit: 500,
    });
    const withInvoice = orders.filter((o) => (o as { invoice_id: string | null }).invoice_id).length;
    const withAuthorization = orders.filter(
      (o) => (o as { authorization_id: string | null }).authorization_id,
    ).length;
    const external = await this.getExternalLabAnalytics(w);
    return {
      orders: orders.length,
      billedOrders: withInvoice,
      insuranceAuthorized: withAuthorization,
      externalLabCost: external.totalCost,
      externalLabShare: orders.length ? external.total / orders.length : 0,
    };
  }

  // -----------------------------------------------------------------------
  async getComplianceAnalytics(w: AnalyticsWindow) {
    const [results, orders] = await Promise.all([
      this.results.list({ tenantId: w.tenantId, limit: 500 }),
      this.orders.list({
        tenantId: w.tenantId,
        branchId: w.branchId ?? null,
        from: w.from ?? null,
        to: w.to ?? null,
        limit: 200,
      }),
    ]);
    let auditEvents = 0;
    for (const o of orders.slice(0, 50)) {
      const list = await this.audit.listForEntity(w.tenantId, "lab_order", o.id);
      auditEvents += list.length;
    }
    const amended = results.filter((r) => r.status === "amended").length;
    const critical = results.filter((r) => r.is_critical).length;
    return {
      auditEvents,
      resultsAmended: amended,
      criticalValues: critical,
      totalOrdersSampled: Math.min(orders.length, 50),
    };
  }

  // -----------------------------------------------------------------------
  async getAiAnalytics(w: AnalyticsWindow) {
    const { data, error } = await this.sb
      .from("lab_ai_assistant_events")
      .select("id, prompt_kind, status, confidence, latency_ms, feedback_score")
      .eq("tenant_id", w.tenantId)
      .limit(500);
    if (error) {
      return {
        totalTurns: 0,
        byStatus: {},
        byKind: {},
        acceptanceRate: 0,
        rejectionRate: 0,
        avgConfidence: 0,
        avgLatencyMs: 0,
        avgFeedback: 0,
        note: "AI analytics table not available yet.",
      };
    }
    const rows = data ?? [];
    const byStatus = tallyBy(rows as Array<Record<string, unknown>>, "status");
    const byKind = tallyBy(rows as Array<Record<string, unknown>>, "prompt_kind");
    const accepted = byStatus.accepted ?? 0;
    const rejected = byStatus.rejected ?? 0;
    const scored = rows.length ? rows.length : 1;
    const sum = (k: "confidence" | "latency_ms" | "feedback_score") =>
      rows.reduce((a, r) => a + Number((r as Record<string, unknown>)[k] ?? 0), 0);
    return {
      totalTurns: rows.length,
      byStatus,
      byKind,
      acceptanceRate: rows.length ? accepted / rows.length : 0,
      rejectionRate: rows.length ? rejected / rows.length : 0,
      avgConfidence: sum("confidence") / scored,
      avgLatencyMs: Math.round(sum("latency_ms") / scored),
      avgFeedback: sum("feedback_score") / scored,
    };
  }

  // -----------------------------------------------------------------------
  async getLaboratoryReport(w: AnalyticsWindow) {
    const [
      executive,
      orders,
      turnaround,
      specimens,
      analyzers,
      quality,
      verification,
      distribution,
      external,
      radiology,
      pathology,
      microbiology,
      financial,
      compliance,
      ai,
    ] = await Promise.all([
      this.getExecutiveDashboard(w),
      this.getOrderAnalytics(w),
      this.getTurnaroundAnalytics(w),
      this.getSpecimenAnalytics(w),
      this.getAnalyzerAnalytics(w),
      this.getQualityAnalytics(w),
      this.getVerificationAnalytics(w),
      this.getDistributionAnalytics(w),
      this.getExternalLabAnalytics(w),
      this.getRadiologyAnalytics(w),
      this.getPathologyAnalytics(w),
      this.getMicrobiologyAnalytics(w),
      this.getFinancialAnalytics(w),
      this.getComplianceAnalytics(w),
      this.getAiAnalytics(w),
    ]);
    return {
      window: { from: w.from ?? null, to: w.to ?? null, branchId: w.branchId ?? null },
      executive,
      orders,
      turnaround,
      specimens,
      analyzers,
      quality,
      verification,
      distribution,
      external,
      radiology,
      pathology,
      microbiology,
      financial,
      compliance,
      ai,
    };
  }
}
