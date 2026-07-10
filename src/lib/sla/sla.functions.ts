/**
 * SLA Engine — Server Functions (Stage 1).
 * Enforcement + escalation dispatch land in Stage 2 via pg_cron.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
type SB = any;

export const listOpenSlas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid, entity_type: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    let q = supabase
      .from("sla_instances")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .eq("status", "open")
      .order("due_at");
    if (data.entity_type) q = q.eq("entity_type", data.entity_type);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [] };
  });

export const sweepSlaBreaches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as SB;
    const { data, error } = await supabase.rpc("sweep_sla_breaches");
    if (error) throw error;
    return { breached: (data as number) ?? 0 };
  });

export const startSla = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        entity_type: z.string(),
        entity_id: z.string(),
        kind: z.enum(["first_response", "follow_up", "callback", "stage_dwell"]),
        meta: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { startSlaInstance } = await import("./sla.server");
    return startSlaInstance(context.supabase as SB, {
      tenantId: data.tenant_id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      kind: data.kind,
      meta: data.meta,
    });
  });

export const satisfySlaInstance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entity_type: z.string(),
        entity_id: z.string(),
        kind: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { satisfySla } = await import("./sla.server");
    const count = await satisfySla(context.supabase as SB, {
      entityType: data.entity_type,
      entityId: data.entity_id,
      kind: data.kind,
    });
    return { satisfied: count };
  });

export const runSlaEscalations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { runEscalations } = await import("./sla.server");
    return runEscalations(context.supabase as SB, data.tenant_id);
  });
