import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { HealthGoalRepository, HealthMetricRepository } from "../repositories.server";
import { emitPatientEvent, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Health engine — non-diagnostic. Handles goals and self-reported /
 * device metrics. Any medical interpretation belongs in the Clinical
 * EMR / AI Assistant modules.
 */
export class HealthEngine {
  constructor(private readonly sb: SB) {}

  async listGoals(userId: string) {
    return new HealthGoalRepository(this.sb).list(userId);
  }

  async upsertGoal(userId: string, input: {
    id?: string;
    goalType: string;
    title: string;
    description?: string | null;
    targetValue?: number | null;
    targetUnit?: string | null;
    targetDate?: string | null;
    status?: string;
    meta?: Record<string, unknown>;
  }) {
    const repo = new HealthGoalRepository(this.sb);
    const identity = await resolvePatientIdentity(this.sb, userId);
    const patch = {
      patient_user_id: userId,
      goal_type: input.goalType,
      title: input.title,
      description: input.description ?? null,
      target_value: input.targetValue ?? null,
      target_unit: input.targetUnit ?? null,
      target_date: input.targetDate ?? null,
      status: input.status ?? "active",
      meta: (input.meta ?? {}) as never,
    };
    const row = input.id ? await repo.update(input.id, patch) : await repo.insert(patch);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.HealthGoalUpdated,
      payload: { goal_id: row.id, status: row.status },
    });
    return row;
  }

  async recordMetric(userId: string, input: {
    metricCode: string;
    value?: number | null;
    valueText?: string | null;
    unit?: string | null;
    recordedAt?: string;
    source?: string;
    deviceId?: string | null;
    meta?: Record<string, unknown>;
  }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new HealthMetricRepository(this.sb).insert({
      patient_user_id: userId,
      metric_code: input.metricCode,
      value: input.value ?? null,
      value_text: input.valueText ?? null,
      unit: input.unit ?? null,
      recorded_at: input.recordedAt ?? new Date().toISOString(),
      source: input.source ?? "manual",
      device_id: input.deviceId ?? null,
      meta: (input.meta ?? {}) as never,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.HealthMetricLogged,
      payload: { metric_code: input.metricCode, value: input.value },
    });
    return row;
  }

  async listMetrics(userId: string, opts: { metricCode?: string; limit?: number } = {}) {
    return new HealthMetricRepository(this.sb).list(userId, opts);
  }
}
