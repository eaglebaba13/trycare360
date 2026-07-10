/**
 * Lead Scoring Engine (server-only).
 *
 * 5 scoring dimensions persisted on public.leads:
 *   marketing_score, ai_score, behavior_score, sales_score, manual_score
 * Composite lead_score = weighted sum, weights configurable via
 * platform_settings key `lead.scoring.weights.<tenant_id>`.
 *
 * Every score change is logged as a lead_scoring_events row so the
 * timeline and analytics can reconstruct how the number was reached.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ScoringEventRepository, LeadRepository } from "./repositories.server";

type SB = SupabaseClient<Database>;

export type ScoreKind = "marketing" | "ai" | "behavior" | "sales" | "manual";

export interface ScoringWeights {
  marketing: number;
  ai: number;
  behavior: number;
  sales: number;
  manual: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  marketing: 0.15,
  ai: 0.35,
  behavior: 0.20,
  sales: 0.20,
  manual: 0.10,
};

export async function loadScoringWeights(sb: SB, tenantId: string): Promise<ScoringWeights> {
  const key = `lead.scoring.weights.${tenantId}`;
  const { data } = await sb.from("platform_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value || typeof data.value !== "object") return DEFAULT_WEIGHTS;
  return { ...DEFAULT_WEIGHTS, ...(data.value as Partial<ScoringWeights>) };
}

const COLUMN_FOR: Record<ScoreKind, string> = {
  marketing: "marketing_score",
  ai: "ai_score",
  behavior: "behavior_score",
  sales: "sales_score",
  manual: "manual_score",
};

/**
 * Record a score delta and re-compute the composite `lead_score` in one
 * transaction-equivalent pass. Emits `lead.score_changed` event.
 */
export async function applyScore(
  sb: SB,
  args: {
    tenantId: string;
    leadId: string;
    kind: ScoreKind;
    delta: number;
    reason?: string;
    actorId?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<{ lead_score: number; component_score: number }> {
  const leads = new LeadRepository(sb);
  const scoring = new ScoringEventRepository(sb);

  const lead = await leads.getById(args.leadId);
  if (!lead) throw new Error("lead_not_found");

  await scoring.insert({
    tenant_id: args.tenantId,
    lead_id: args.leadId,
    kind: args.kind,
    delta: args.delta,
    reason: args.reason ?? null,
    actor_id: args.actorId ?? null,
    meta: (args.meta ?? {}) as never,
  });

  const col = COLUMN_FOR[args.kind];
  const nextComponent = Number((lead as unknown as Record<string, number>)[col] ?? 0) + args.delta;

  const weights = await loadScoringWeights(sb, args.tenantId);
  const composite =
    (args.kind === "marketing" ? nextComponent : Number(lead.marketing_score)) * weights.marketing +
    (args.kind === "ai" ? nextComponent : Number(lead.ai_score)) * weights.ai +
    (args.kind === "behavior" ? nextComponent : Number(lead.behavior_score)) * weights.behavior +
    (args.kind === "sales" ? nextComponent : Number(lead.sales_score)) * weights.sales +
    (args.kind === "manual" ? nextComponent : Number(lead.manual_score)) * weights.manual;

  await leads.update(args.leadId, {
    [col]: nextComponent,
    lead_score: Math.round(composite * 100) / 100,
  } as never);

  await sb.rpc("emit_automation_event", {
    _tenant_id: args.tenantId,
    _event_type: "lead.score_changed",
    _payload: {
      lead_id: args.leadId,
      kind: args.kind,
      delta: args.delta,
      component_score: nextComponent,
      lead_score: composite,
    } as never,
    _entity_ref: { type: "lead", id: args.leadId } as never,
  });

  return { lead_score: composite, component_score: nextComponent };
}
