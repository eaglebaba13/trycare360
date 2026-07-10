/**
 * Revenue Attribution Engine (server-only).
 *
 * Four models applied against `attribution_touches` for the person:
 *   - first     → 100% credit to earliest touch
 *   - last      → 100% credit to latest touch (default)
 *   - linear    → equal split across all touches
 *   - position  → 40% first, 40% last, 20% split among middle
 *
 * The active model per tenant is configurable via platform_settings
 *   `attribution.model.<tenant_id>` (defaults to "last").
 *
 * Existing DB credits are cleared and re-inserted so replaying is safe.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AttributionCreditRepository,
  AttributionTouchRepository,
  RevenueEventRepository,
  type AttributionCreditInsert,
  type AttributionTouchRow,
  type RevenueEventRow,
} from "./repositories.server";

type SB = SupabaseClient<Database>;
export type AttributionModel = "first" | "last" | "linear" | "position";

export async function loadActiveModel(sb: SB, tenantId: string): Promise<AttributionModel> {
  const { data } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", `attribution.model.${tenantId}`)
    .maybeSingle();
  const v = data?.value;
  if (typeof v === "string" && ["first", "last", "linear", "position"].includes(v)) {
    return v as AttributionModel;
  }
  return "last";
}

function splitByModel(
  model: AttributionModel,
  touches: AttributionTouchRow[],
): Array<{ touch: AttributionTouchRow; pct: number }> {
  if (touches.length === 0) return [];
  if (touches.length === 1) return [{ touch: touches[0], pct: 100 }];
  const first = touches[0];
  const last = touches[touches.length - 1];
  switch (model) {
    case "first":
      return [{ touch: first, pct: 100 }];
    case "last":
      return [{ touch: last, pct: 100 }];
    case "linear": {
      const each = 100 / touches.length;
      return touches.map((t) => ({ touch: t, pct: each }));
    }
    case "position": {
      const middle = touches.slice(1, -1);
      const middlePct = middle.length ? 20 / middle.length : 0;
      const out: Array<{ touch: AttributionTouchRow; pct: number }> = [
        { touch: first, pct: 40 },
      ];
      for (const t of middle) out.push({ touch: t, pct: middlePct });
      out.push({ touch: last, pct: 40 });
      if (!middle.length) {
        // First+Last only: 50/50
        return [
          { touch: first, pct: 50 },
          { touch: last, pct: 50 },
        ];
      }
      return out;
    }
  }
}

function buildCreditRow(
  re: RevenueEventRow,
  touch: AttributionTouchRow,
  pct: number,
  model: AttributionModel,
): AttributionCreditInsert {
  const amount = Math.round((Number(re.amount) * pct) / 100 * 100) / 100;
  return {
    tenant_id: re.tenant_id,
    revenue_event_id: re.id,
    person_id: re.person_id,
    lead_id: re.lead_id ?? touch.lead_id ?? null,
    model,
    lead_source: touch.source ?? null,
    campaign_id: touch.campaign_id ?? null,
    meta_campaign_id: touch.meta_campaign_id ?? null,
    google_campaign_id: touch.google_campaign_id ?? null,
    utm: {
      utm_source: touch.utm_source,
      utm_medium: touch.utm_medium,
      utm_campaign: touch.utm_campaign,
      utm_term: touch.utm_term,
      utm_content: touch.utm_content,
    } as never,
    branch_id: re.branch_id ?? null,
    franchise_id: re.franchise_id ?? null,
    master_franchise_id: re.master_franchise_id ?? null,
    doctor_id: re.doctor_id ?? null,
    therapist_id: re.therapist_id ?? null,
    product_id: re.product_id ?? null,
    treatment_id: re.treatment_id ?? null,
    membership_id: re.membership_id ?? null,
    subscription_id: re.subscription_id ?? null,
    credit_pct: pct,
    credit_amount: amount,
    currency: re.currency,
  };
}

/**
 * Re-attribute a revenue event: clear existing credits and re-insert
 * according to the given (or tenant-default) model.
 */
export async function attributeRevenueEvent(
  sb: SB,
  args: { revenueEventId: string; model?: AttributionModel },
): Promise<{ model: AttributionModel; credits_created: number }> {
  const revenue = new RevenueEventRepository(sb);
  const touches = new AttributionTouchRepository(sb);
  const credits = new AttributionCreditRepository(sb);

  const re = await revenue.getById(args.revenueEventId);
  if (!re) throw new Error("revenue_event_not_found");

  const model = args.model ?? (await loadActiveModel(sb, re.tenant_id));
  const list = await touches.listForPerson(re.person_id);

  await credits.deleteForRevenueEvent(re.id);

  if (!list.length) {
    // No touches — write single self-credit row so LTV/reporting still balances.
    const fallback: AttributionCreditInsert = {
      tenant_id: re.tenant_id,
      revenue_event_id: re.id,
      person_id: re.person_id,
      lead_id: re.lead_id ?? null,
      model,
      credit_pct: 100,
      credit_amount: re.amount,
      currency: re.currency,
    };
    await credits.insertMany([fallback]);
    return { model, credits_created: 1 };
  }

  const rows = splitByModel(model, list).map((s) =>
    buildCreditRow(re, s.touch, s.pct, model),
  );
  await credits.insertMany(rows);
  return { model, credits_created: rows.length };
}
