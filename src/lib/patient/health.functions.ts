/**
 * Patient Portal — Health server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { HealthEngine } from "./engines/health.engine.server";
import {
  emptySchema,
  listHealthMetricsSchema,
  recordHealthMetricSchema,
  upsertHealthGoalSchema,
} from "./validators";

export const listHealthGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new HealthEngine(context.supabase);
    return { rows: await engine.listGoals(context.userId) };
  });

export const upsertHealthGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertHealthGoalSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new HealthEngine(context.supabase);
    return { goal: await engine.upsertGoal(context.userId, data) };
  });

export const recordHealthMetric = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordHealthMetricSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new HealthEngine(context.supabase);
    return { metric: await engine.recordMetric(context.userId, data) };
  });

export const listHealthMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listHealthMetricsSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new HealthEngine(context.supabase);
    return { rows: await engine.listMetrics(context.userId, data) };
  });
