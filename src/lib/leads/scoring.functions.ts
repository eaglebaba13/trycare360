/**
 * Lead Scoring — Server Functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const applyLeadScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        lead_id: uuid,
        kind: z.enum(["marketing", "ai", "behavior", "sales", "manual"]),
        delta: z.number(),
        reason: z.string().max(255).optional(),
        meta: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { applyScore } = await import("./scoring.server");
    const res = await applyScore(
      // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
      context.supabase as any,
      {
        tenantId: data.tenant_id,
        leadId: data.lead_id,
        kind: data.kind,
        delta: data.delta,
        reason: data.reason,
        actorId: context.userId,
        meta: data.meta,
      },
    );
    return res;
  });

export const setScoringWeights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        weights: z.object({
          marketing: z.number().nonnegative(),
          ai: z.number().nonnegative(),
          behavior: z.number().nonnegative(),
          sales: z.number().nonnegative(),
          manual: z.number().nonnegative(),
        }),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const supabase = context.supabase as any;
    const key = `lead.scoring.weights.${data.tenant_id}`;
    const { error } = await supabase.from("platform_settings").upsert(
      {
        key,
        category: "lead_scoring",
        description: "Composite lead score weights per dimension",
        value: data.weights,
      },
      { onConflict: "key" },
    );
    if (error) throw error;
    return { ok: true };
  });
