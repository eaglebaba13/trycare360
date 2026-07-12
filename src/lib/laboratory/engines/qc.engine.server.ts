/**
 * QualityControlEngine — Westgard rule evaluation (1-2s, 1-3s, 2-2s, R-4s, 4-1s, 10x).
 * CalibrationEngine — instrument calibration lifecycle.
 * Reuses Notification Engine via workflow event `lab.qc.out_of_control`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  CalibrationRepository,
  QCRepository,
} from "../repositories.server";
import { emitLabEvent, writeLabAudit } from "../helpers.server";
import { LAB_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

interface WestgardResult {
  violated: string[];
  action: "accept" | "warn" | "reject";
}

function evaluateWestgard(zScores: number[]): WestgardResult {
  const violated: string[] = [];
  const latest = zScores[0];
  if (latest === undefined || Number.isNaN(latest)) return { violated, action: "accept" };
  // 1-2s (warn)
  if (Math.abs(latest) > 2) violated.push("1-2s");
  // 1-3s (reject)
  if (Math.abs(latest) > 3) violated.push("1-3s");
  // 2-2s: two consecutive > 2 same side
  if (
    zScores.length >= 2 &&
    Math.abs(zScores[0]!) > 2 &&
    Math.abs(zScores[1]!) > 2 &&
    Math.sign(zScores[0]!) === Math.sign(zScores[1]!)
  ) {
    violated.push("2-2s");
  }
  // R-4s: range between two consecutive > 4
  if (zScores.length >= 2 && Math.abs(zScores[0]! - zScores[1]!) > 4) violated.push("R-4s");
  // 4-1s: four consecutive > 1 same side
  if (
    zScores.length >= 4 &&
    zScores.slice(0, 4).every((z) => Math.abs(z) > 1) &&
    new Set(zScores.slice(0, 4).map((z) => Math.sign(z))).size === 1
  ) {
    violated.push("4-1s");
  }
  // 10x: ten consecutive same side
  if (
    zScores.length >= 10 &&
    new Set(zScores.slice(0, 10).map((z) => Math.sign(z))).size === 1
  ) {
    violated.push("10x");
  }
  const rejectRules = new Set(["1-3s", "2-2s", "R-4s", "4-1s", "10x"]);
  const action = violated.some((v) => rejectRules.has(v))
    ? "reject"
    : violated.length > 0
      ? "warn"
      : "accept";
  return { violated, action };
}

export class QualityControlEngine {
  private readonly repo: QCRepository;
  constructor(private readonly sb: SB) {
    this.repo = new QCRepository(sb);
  }

  async recordRun(args: {
    tenantId: string;
    instrumentId?: string | null;
    testId?: string | null;
    qcMaterialId?: string | null;
    observedValue: number;
    actorId: string | null;
    comment?: string | null;
  }) {
    // Compute z-score if the material has a target mean/sd; otherwise store raw only.
    let zScore: number | null = null;
    let history: number[] = [];
    if (args.qcMaterialId) {
      const materials = await this.repo.listMaterials(args.tenantId);
      const mat = materials.find((m) => m.id === args.qcMaterialId);
      const target = (mat?.target_values ?? {}) as Record<string, unknown>;
      const mean = Number(target["mean"] ?? NaN);
      const sd = Number(target["sd"] ?? NaN);
      if (!Number.isNaN(mean) && !Number.isNaN(sd) && sd > 0) {
        zScore = (args.observedValue - mean) / sd;
      }
    }
    if (args.testId) {
      const recent = await this.repo.recentForTest(args.tenantId, args.testId, 10);
      history = recent
        .map((r) => Number(r.z_score ?? 0))
        .filter((z) => !Number.isNaN(z));
    }
    const evaluation = evaluateWestgard([zScore ?? 0, ...history]);
    const row = await this.repo.insertRun({
      tenant_id: args.tenantId,
      instrument_id: args.instrumentId ?? null,
      test_id: args.testId ?? null,
      qc_material_id: args.qcMaterialId ?? null,
      observed_value: args.observedValue,
      z_score: zScore,
      status:
        evaluation.action === "reject"
          ? "out_of_control"
          : evaluation.action === "warn"
            ? "warn"
            : "in_control",
      violated_rules: evaluation.violated as never,
      actor_id: args.actorId,
      comment: args.comment ?? null,
      run_at: new Date().toISOString(),
      meta: {} as never,
    });
    if (evaluation.action !== "accept") {
      await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.QcOutOfControl, {
        qcRunId: row.id,
        instrumentId: args.instrumentId,
        testId: args.testId,
        rules: evaluation.violated,
      });
    }
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_qc_run",
      entityId: row.id,
      action: "recorded",
      actorId: args.actorId,
    });
    return { run: row, evaluation };
  }
}

export class CalibrationEngine {
  private readonly repo: CalibrationRepository;
  constructor(private readonly sb: SB) {
    this.repo = new CalibrationRepository(sb);
  }

  async record(args: {
    tenantId: string;
    instrumentId: string;
    testId?: string | null;
    method?: string | null;
    slope?: number | null;
    intercept?: number | null;
    result: "pass" | "fail";
    nextDueAt?: string | null;
    documentId?: string | null;
    actorId: string | null;
  }) {
    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      instrument_id: args.instrumentId,
      test_id: args.testId ?? null,
      method: args.method ?? null,
      slope: args.slope ?? null,
      intercept: args.intercept ?? null,
      result: args.result,
      next_due_at: args.nextDueAt ?? null,
      document_id: args.documentId ?? null,
      performed_by: args.actorId,
      calibrated_at: new Date().toISOString(),
      meta: {} as never,
    });
    await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.CalibrationCompleted, {
      calibrationId: row.id,
      instrumentId: args.instrumentId,
      result: args.result,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_calibration",
      entityId: row.id,
      action: "recorded",
      actorId: args.actorId,
    });
    return row;
  }
}
