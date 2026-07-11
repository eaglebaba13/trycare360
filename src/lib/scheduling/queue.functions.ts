/**
 * Scheduling — Queue server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  issueTokenSchema,
  queueTokenActionSchema,
  queueTransferSchema,
} from "./validators";
import { QueueEngine } from "./queue.server";

export const issueQueueToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => issueTokenSchema.parse(d))
  .handler(async ({ context, data }) => {
    if (!data.queue_id) throw new Error("queue_id is required");
    const engine = new QueueEngine(context.supabase);
    const token = await engine.issueToken({
      tenantId: data.tenant_id,
      branchId: data.branch_id,
      queueId: data.queue_id,
      appointmentId: data.appointment_id ?? null,
      personId: data.person_id ?? null,
      priority: data.priority,
      isVip: data.is_vip,
      isEmergency: data.is_emergency,
      notes: data.notes ?? null,
    });
    return { token };
  });

export const callNextInQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        queue_id: z.string().uuid(),
        counter_code: z.string().max(40).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new QueueEngine(context.supabase);
    const token = await engine.callNext({
      tenantId: data.tenant_id,
      queueId: data.queue_id,
      counterCode: data.counter_code ?? null,
    });
    return { token };
  });

export const skipQueueToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => queueTokenActionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new QueueEngine(context.supabase);
    return { token: await engine.skipToken({
      tenantId: data.tenant_id,
      tokenId: data.token_id,
      notes: data.actor_notes ?? null,
    }) };
  });

export const recallQueueToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => queueTokenActionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new QueueEngine(context.supabase);
    return { token: await engine.recallToken({
      tenantId: data.tenant_id,
      tokenId: data.token_id,
    }) };
  });

export const transferQueueToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => queueTransferSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new QueueEngine(context.supabase);
    return { token: await engine.transferQueue({
      tenantId: data.tenant_id,
      tokenId: data.token_id,
      targetQueueId: data.target_queue_id,
      reason: data.reason ?? null,
    }) };
  });

export const estimateQueueWait = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        queue_id: z.string().uuid(),
        token_id: z.string().uuid().optional(),
        avg_service_minutes: z.number().positive().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new QueueEngine(context.supabase);
    return engine.estimateWaitTime({
      tenantId: data.tenant_id,
      queueId: data.queue_id,
      tokenId: data.token_id,
      avgServiceMinutes: data.avg_service_minutes,
    });
  });
