/**
 * ReferenceRangeEngine — resolve applicable range for a test given
 *   patient sex, age (days), and condition context.
 * DeltaCheckEngine — compare against previous result for the same patient.
 * CriticalAlertEngine — evaluate critical rules and emit alerts.
 * ResultEngine — enter/amend results (versioned).
 * VerificationEngine — auto + manual verification.
 * ReleaseEngine — release verified results.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  CriticalValueRepository,
  DeltaCheckRepository,
  LaboratoryOrderItemRepository,
  LaboratoryOrderRepository,
  ReferenceRangeRepository,
  ResultRepository,
  ResultVersionRepository,
  TestCatalogRepository,
  type ResultRow,
} from "../repositories.server";
import { emitLabEvent, logLabTimeline, writeLabAudit } from "../helpers.server";
import { LAB_EVENTS } from "../events";
import { OrderEngine } from "./order.engine.server";

type SB = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// ReferenceRangeEngine
// ---------------------------------------------------------------------------
export class ReferenceRangeEngine {
  private readonly ranges: ReferenceRangeRepository;
  constructor(private readonly sb: SB) {
    this.ranges = new ReferenceRangeRepository(sb);
  }
  async resolve(args: {
    testId: string;
    sex?: string | null;
    ageDays?: number | null;
    condition?: string | null;
  }) {
    const candidates = await this.ranges.listForTest(args.testId);
    const scored = candidates
      .filter((c) => {
        if (c.sex && c.sex !== "any" && args.sex && c.sex !== args.sex) return false;
        if (args.ageDays != null) {
          if (c.age_min_days != null && args.ageDays < c.age_min_days) return false;
          if (c.age_max_days != null && args.ageDays > c.age_max_days) return false;
        }
        if (c.condition && args.condition && c.condition !== args.condition) return false;
        return true;
      })
      .sort((a, b) => {
        // most specific first — condition > sex > age
        const score = (r: (typeof candidates)[number]) =>
          (r.condition ? 4 : 0) +
          (r.sex && r.sex !== "any" ? 2 : 0) +
          (r.age_min_days != null || r.age_max_days != null ? 1 : 0);
        return score(b) - score(a);
      });
    return scored[0] ?? null;
  }
}

// ---------------------------------------------------------------------------
// DeltaCheckEngine
// ---------------------------------------------------------------------------
export class DeltaCheckEngine {
  private readonly rules: DeltaCheckRepository;
  private readonly results: ResultRepository;
  constructor(private readonly sb: SB) {
    this.rules = new DeltaCheckRepository(sb);
    this.results = new ResultRepository(sb);
  }
  async evaluate(args: {
    tenantId: string;
    testId: string;
    orderId: string;
    numericValue: number | null;
  }): Promise<{ flag: string | null; blocked: boolean }> {
    if (args.numericValue == null) return { flag: null, blocked: false };
    const rule = await this.rules.getForTest(args.tenantId, args.testId);
    if (!rule) return { flag: null, blocked: false };
    const previous = await this.results.findLatestForPersonTest(
      args.tenantId,
      args.testId,
      args.orderId,
    );
    if (!previous || previous.numeric_value == null) return { flag: null, blocked: false };
    const prev = Number(previous.numeric_value);
    const diff =
      rule.delta_kind === "percent"
        ? prev === 0
          ? 0
          : (Math.abs(args.numericValue - prev) / Math.abs(prev)) * 100
        : Math.abs(args.numericValue - prev);
    if (diff > Number(rule.threshold)) {
      await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.DeltaCheckFailed, {
        testId: args.testId,
        delta: diff,
        threshold: rule.threshold,
        action: rule.action,
      });
      return { flag: "delta", blocked: rule.action === "block" };
    }
    return { flag: null, blocked: false };
  }
}

// ---------------------------------------------------------------------------
// CriticalAlertEngine
// ---------------------------------------------------------------------------
export class CriticalAlertEngine {
  private readonly rules: CriticalValueRepository;
  constructor(private readonly sb: SB) {
    this.rules = new CriticalValueRepository(sb);
  }
  async evaluate(args: {
    tenantId: string;
    testId: string;
    resultId: string;
    numericValue: number | null;
    textOrCoded: string | null;
  }): Promise<boolean> {
    const rule = await this.rules.getForTest(args.tenantId, args.testId);
    if (!rule) return false;
    let critical = false;
    if (args.numericValue != null) {
      if (rule.low_critical != null && args.numericValue < Number(rule.low_critical))
        critical = true;
      if (rule.high_critical != null && args.numericValue > Number(rule.high_critical))
        critical = true;
    }
    if (!critical && rule.qualitative_critical && args.textOrCoded) {
      if (args.textOrCoded === rule.qualitative_critical) critical = true;
    }
    if (critical) {
      await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.ResultCritical, {
        resultId: args.resultId,
        testId: args.testId,
        ackRequired: rule.ack_required,
        ackWindowMinutes: rule.ack_window_minutes,
      });
    }
    return critical;
  }
}

// ---------------------------------------------------------------------------
// ResultEngine + VerificationEngine + ReleaseEngine (cohesive)
// ---------------------------------------------------------------------------
export class ResultEngine {
  private readonly repo: ResultRepository;
  private readonly versions: ResultVersionRepository;
  private readonly items: LaboratoryOrderItemRepository;
  private readonly tests: TestCatalogRepository;
  private readonly range: ReferenceRangeEngine;
  private readonly delta: DeltaCheckEngine;
  private readonly critical: CriticalAlertEngine;
  private readonly orders: LaboratoryOrderRepository;

  constructor(private readonly sb: SB) {
    this.repo = new ResultRepository(sb);
    this.versions = new ResultVersionRepository(sb);
    this.items = new LaboratoryOrderItemRepository(sb);
    this.tests = new TestCatalogRepository(sb);
    this.range = new ReferenceRangeEngine(sb);
    this.delta = new DeltaCheckEngine(sb);
    this.critical = new CriticalAlertEngine(sb);
    this.orders = new LaboratoryOrderRepository(sb);
  }

  async enter(args: {
    tenantId: string;
    orderId: string;
    orderItemId: string;
    specimenId?: string | null;
    testId: string;
    numericValue?: number | null;
    textValue?: string | null;
    codedValue?: string | null;
    unitCode?: string | null;
    method?: string | null;
    performedAt?: string | null;
    attachments?: Record<string, unknown>;
    actorId: string | null;
  }): Promise<ResultRow> {
    const order = await this.orders.getById(args.orderId);
    if (!order || order.tenant_id !== args.tenantId) throw new Error("Order not found");

    // Reference range resolution — we don't have patient sex/age wired
    // through the RPC yet, so we pass what we have and fall back gracefully.
    const range = await this.range.resolve({ testId: args.testId });
    let refText: string | null = null;
    let flag: string | null = null;
    if (range) {
      if (range.range_type === "numeric") {
        refText = `${range.low_value ?? "—"}–${range.high_value ?? "—"}`;
        if (args.numericValue != null) {
          if (range.low_value != null && args.numericValue < Number(range.low_value)) flag = "L";
          if (range.high_value != null && args.numericValue > Number(range.high_value)) flag = "H";
        }
      } else {
        refText = range.qualitative_expected ?? null;
      }
    }
    const delta = await this.delta.evaluate({
      tenantId: args.tenantId,
      testId: args.testId,
      orderId: args.orderId,
      numericValue: args.numericValue ?? null,
    });
    if (delta.blocked) {
      throw new Error("Delta check blocked release — investigate before entry");
    }

    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      order_id: args.orderId,
      order_item_id: args.orderItemId,
      specimen_id: args.specimenId ?? null,
      test_id: args.testId,
      numeric_value: args.numericValue ?? null,
      text_value: args.textValue ?? null,
      coded_value: args.codedValue ?? null,
      unit_code: args.unitCode ?? null,
      method: args.method ?? null,
      performed_at: args.performedAt ?? new Date().toISOString(),
      performed_by: args.actorId,
      status: "pending",
      flag,
      delta_flag: delta.flag,
      reference_range_text: refText,
      attachments: (args.attachments ?? {}) as never,
      branch_id: order.branch_id,
      created_by: args.actorId,
      updated_by: args.actorId,
      is_critical: false,
      meta: {} as never,
    });
    await this.versions.insert({
      tenant_id: args.tenantId,
      result_id: row.id,
      version: 1,
      snapshot: row as never,
      actor_id: args.actorId,
      reason: "initial entry",
    });
    const isCritical = await this.critical.evaluate({
      tenantId: args.tenantId,
      testId: args.testId,
      resultId: row.id,
      numericValue: args.numericValue ?? null,
      textOrCoded: args.textValue ?? args.codedValue ?? null,
    });
    if (isCritical) {
      await this.repo.update(row.id, { is_critical: true });
    }
    await Promise.all([
      emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.ResultPending, {
        resultId: row.id,
        orderId: args.orderId,
      }),
      this.items.update(args.orderItemId, { status: "resulted" }),
      writeLabAudit(this.sb, {
        tenantId: args.tenantId,
        entityType: "lab_result",
        entityId: row.id,
        action: "entered",
        actorId: args.actorId,
      }),
    ]);
    return row;
  }

  async amend(args: {
    tenantId: string;
    resultId: string;
    reason: string;
    numericValue?: number | null;
    textValue?: string | null;
    codedValue?: string | null;
    actorId: string | null;
  }): Promise<ResultRow> {
    const existing = await this.repo.getById(args.resultId);
    if (!existing || existing.tenant_id !== args.tenantId) throw new Error("Result not found");
    const version = await this.versions.nextVersion(args.resultId);
    await this.versions.insert({
      tenant_id: args.tenantId,
      result_id: args.resultId,
      version,
      snapshot: existing as never,
      actor_id: args.actorId,
      reason: args.reason,
    });
    const patched = await this.repo.update(args.resultId, {
      numeric_value: args.numericValue ?? existing.numeric_value,
      text_value: args.textValue ?? existing.text_value,
      coded_value: args.codedValue ?? existing.coded_value,
      status: "amended",
      amended_reason: args.reason,
      updated_by: args.actorId,
    });
    await Promise.all([
      emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.ResultAmended, {
        resultId: args.resultId,
        version,
        reason: args.reason,
      }),
      writeLabAudit(this.sb, {
        tenantId: args.tenantId,
        entityType: "lab_result",
        entityId: args.resultId,
        action: "amended",
        actorId: args.actorId,
        reason: args.reason,
      }),
    ]);
    return patched;
  }
}

export class VerificationEngine {
  private readonly repo: ResultRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ResultRepository(sb);
  }
  /** Auto-verify safe numeric results (no critical/delta flags). */
  async autoVerify(tenantId: string, resultId: string): Promise<ResultRow | null> {
    const r = await this.repo.getById(resultId);
    if (!r || r.tenant_id !== tenantId) return null;
    if (r.is_critical || r.delta_flag || r.status !== "pending") return null;
    const patched = await this.repo.update(resultId, {
      status: "verified",
      verified_at: new Date().toISOString(),
    });
    await emitLabEvent(this.sb, tenantId, LAB_EVENTS.ResultVerified, {
      resultId,
      mode: "auto",
    });
    return patched;
  }
  async manualVerify(tenantId: string, resultId: string, actorId: string | null) {
    const r = await this.repo.getById(resultId);
    if (!r || r.tenant_id !== tenantId) throw new Error("Result not found");
    if (r.status !== "pending" && r.status !== "amended")
      throw new Error(`Cannot verify from status ${r.status}`);
    const patched = await this.repo.update(resultId, {
      status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: actorId,
    });
    await emitLabEvent(this.sb, tenantId, LAB_EVENTS.ResultVerified, {
      resultId,
      mode: "manual",
    });
    await writeLabAudit(this.sb, {
      tenantId,
      entityType: "lab_result",
      entityId: resultId,
      action: "verified",
      actorId,
    });
    return patched;
  }
}

export class ReleaseEngine {
  private readonly repo: ResultRepository;
  private readonly items: LaboratoryOrderItemRepository;
  private readonly orders: OrderEngine;
  constructor(private readonly sb: SB) {
    this.repo = new ResultRepository(sb);
    this.items = new LaboratoryOrderItemRepository(sb);
    this.orders = new OrderEngine(sb);
  }
  async release(tenantId: string, resultId: string, actorId: string | null) {
    const r = await this.repo.getById(resultId);
    if (!r || r.tenant_id !== tenantId) throw new Error("Result not found");
    if (r.status !== "verified" && r.status !== "amended")
      throw new Error(`Cannot release from status ${r.status}`);
    const patched = await this.repo.update(resultId, {
      status: "released",
      released_at: new Date().toISOString(),
      released_by: actorId,
    });
    if (r.order_item_id) {
      await this.items.update(r.order_item_id, { status: "released" });
    }
    await emitLabEvent(this.sb, tenantId, LAB_EVENTS.ResultReleased, {
      resultId,
      orderId: r.order_id,
    });
    if (r.order_id) {
      // Timeline hand-off to Clinical + close-order check.
      const orderRepo = new LaboratoryOrderRepository(this.sb);
      const order = await orderRepo.getById(r.order_id);
      if (order?.person_id) {
        await logLabTimeline(this.sb, {
          tenantId,
          entityType: "person",
          entityId: order.person_id,
          eventType: LAB_EVENTS.ResultReleased,
          title: `Lab result released`,
          meta: { orderId: order.id, resultId },
        });
      }
      await this.orders.markCompletedIfAllVerified(tenantId, r.order_id);
    }
    await writeLabAudit(this.sb, {
      tenantId,
      entityType: "lab_result",
      entityId: resultId,
      action: "released",
      actorId,
    });
    return patched;
  }
}
