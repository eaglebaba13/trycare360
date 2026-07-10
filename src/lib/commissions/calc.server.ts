/**
 * Commission Calculation Engine (server-only).
 *
 * Given a revenue event and the plan+rule graph, produce draft accrual
 * rows. NO payout. Payment settlement lives in a later finance phase.
 *
 * Supported `calc_kind` values on commission_rules (all read from
 * `rule.calc_config` JSON):
 *
 *   - fixed         { amount }
 *   - percent       { pct }                          → base * pct/100
 *   - slab          { slabs: [{ upto, pct|amount }] } → tiered
 *   - target        { target, pct_below, pct_at, pct_above, monthly_revenue }
 *   - revenue       { pct }                          → same as percent but tagged
 *   - product       { by_product: { <product_id>: pct|amount } }
 *   - treatment     { by_treatment: { <treatment_id>: pct|amount } }
 *   - membership    { by_membership: { <membership_id>: pct|amount } }
 *   - subscription  { by_subscription: { <subscription_id>: pct|amount } }
 *   - campaign      { by_campaign: { <campaign_id|utm_campaign>: pct|amount } }
 *
 * Rule `applies_to` filters (all optional, ANDed):
 *   { branch_id, franchise_id, category, product_id, treatment_id,
 *     membership_id, subscription_id, min_amount, max_amount }
 *
 * Assignments say WHO earns:
 *   { beneficiary_type, beneficiary_id, entity_scope, scope_ref, split_pct }
 *
 * Period key = YYYY-MM of the revenue event `occurred_at`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import {
  CommissionAccrualRepository,
  CommissionAssignmentRepository,
  CommissionPlanRepository,
  CommissionRuleRepository,
  type CommissionAccrualInsert,
  type CommissionRule,
  type CommissionAssignment,
} from "./repositories.server";

type SB = SupabaseClient<Database>;
type RevenueEventRow = Tables<"revenue_events">;

function periodKeyFor(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ruleApplies(rule: CommissionRule, re: RevenueEventRow): boolean {
  const a = (rule.applies_to as Record<string, unknown>) ?? {};
  if (a.category && a.category !== re.category) return false;
  if (a.branch_id && a.branch_id !== re.branch_id) return false;
  if (a.franchise_id && a.franchise_id !== re.franchise_id) return false;
  if (a.product_id && a.product_id !== re.product_id) return false;
  if (a.treatment_id && a.treatment_id !== re.treatment_id) return false;
  if (a.membership_id && a.membership_id !== re.membership_id) return false;
  if (a.subscription_id && a.subscription_id !== re.subscription_id) return false;
  const amt = Number(re.amount);
  if (typeof a.min_amount === "number" && amt < a.min_amount) return false;
  if (typeof a.max_amount === "number" && amt > a.max_amount) return false;
  return true;
}

function calcBase(rule: CommissionRule, re: RevenueEventRow): number {
  const base = Number(re.amount);
  const cfg = (rule.calc_config as Record<string, unknown>) ?? {};
  const num = (x: unknown) => (typeof x === "number" ? x : 0);

  switch (rule.calc_kind) {
    case "fixed":
      return num(cfg.amount);
    case "percent":
    case "revenue":
      return Math.round(((base * num(cfg.pct)) / 100) * 100) / 100;
    case "slab": {
      const slabs = (cfg.slabs as Array<{ upto?: number; pct?: number; amount?: number }>) ?? [];
      let remaining = base;
      let total = 0;
      let lastUpto = 0;
      for (const s of slabs) {
        const upto = typeof s.upto === "number" ? s.upto : Infinity;
        const tier = Math.max(0, Math.min(remaining, upto - lastUpto));
        if (typeof s.pct === "number") total += (tier * s.pct) / 100;
        else if (typeof s.amount === "number" && tier > 0) total += s.amount;
        remaining -= tier;
        lastUpto = upto;
        if (remaining <= 0) break;
      }
      return Math.round(total * 100) / 100;
    }
    case "target": {
      const target = num(cfg.target);
      const monthly = num(cfg.monthly_revenue);
      const pct =
        monthly >= target ? num(cfg.pct_above) : monthly === target ? num(cfg.pct_at) : num(cfg.pct_below);
      return Math.round(((base * pct) / 100) * 100) / 100;
    }
    case "product": {
      const map = (cfg.by_product as Record<string, { pct?: number; amount?: number }>) ?? {};
      const spec = re.product_id ? map[re.product_id] : undefined;
      if (!spec) return 0;
      if (typeof spec.pct === "number") return Math.round(((base * spec.pct) / 100) * 100) / 100;
      return num(spec.amount);
    }
    case "treatment": {
      const map = (cfg.by_treatment as Record<string, { pct?: number; amount?: number }>) ?? {};
      const spec = re.treatment_id ? map[re.treatment_id] : undefined;
      if (!spec) return 0;
      if (typeof spec.pct === "number") return Math.round(((base * spec.pct) / 100) * 100) / 100;
      return num(spec.amount);
    }
    case "membership": {
      const map = (cfg.by_membership as Record<string, { pct?: number; amount?: number }>) ?? {};
      const spec = re.membership_id ? map[re.membership_id] : undefined;
      if (!spec) return 0;
      if (typeof spec.pct === "number") return Math.round(((base * spec.pct) / 100) * 100) / 100;
      return num(spec.amount);
    }
    case "subscription": {
      const map = (cfg.by_subscription as Record<string, { pct?: number; amount?: number }>) ?? {};
      const spec = re.subscription_id ? map[re.subscription_id] : undefined;
      if (!spec) return 0;
      if (typeof spec.pct === "number") return Math.round(((base * spec.pct) / 100) * 100) / 100;
      return num(spec.amount);
    }
    case "campaign": {
      const map = (cfg.by_campaign as Record<string, { pct?: number; amount?: number }>) ?? {};
      // biome-ignore lint/suspicious/noExplicitAny: revenue_events.meta shape
      const utm = (re as any).meta?.utm_campaign ?? null;
      const key = utm ?? null;
      const spec = key ? map[key] : undefined;
      if (!spec) return 0;
      if (typeof spec.pct === "number") return Math.round(((base * spec.pct) / 100) * 100) / 100;
      return num(spec.amount);
    }
    default:
      return 0;
  }
}

export interface PreviewAccrual {
  plan_id: string;
  plan_code: string;
  plan_version: number;
  rule_id: string;
  calc_kind: string;
  beneficiary_type: string;
  beneficiary_id: string;
  base_amount: number;
  calc_amount: number;
  split_pct: number;
  currency: string;
  period_key: string;
}

/**
 * Compute (but do not persist) commissions for a revenue event.
 * Used by the "preview commission" UI and the sales pipeline modal.
 */
export async function previewCommissionsForEvent(
  sb: SB,
  revenueEvent: RevenueEventRow,
): Promise<PreviewAccrual[]> {
  const planRepo = new CommissionPlanRepository(sb);
  const ruleRepo = new CommissionRuleRepository(sb);
  const asgRepo = new CommissionAssignmentRepository(sb);

  const plans = await planRepo.listActive(revenueEvent.tenant_id);
  const out: PreviewAccrual[] = [];
  const periodKey = periodKeyFor(revenueEvent.occurred_at ?? new Date().toISOString());

  for (const plan of plans) {
    const [rules, assignments] = await Promise.all([
      ruleRepo.listForPlan(plan.id),
      asgRepo.listForPlan(plan.id),
    ]);
    if (!assignments.length) continue;

    for (const rule of rules) {
      if (!ruleApplies(rule, revenueEvent)) continue;
      const calcAmount = calcBase(rule, revenueEvent);
      if (calcAmount <= 0) continue;

      for (const asg of assignments) {
        const split = asg.split_pct != null ? Number(asg.split_pct) : 100;
        const perBeneficiary = Math.round(((calcAmount * split) / 100) * 100) / 100;
        if (perBeneficiary <= 0) continue;
        out.push({
          plan_id: plan.id,
          plan_code: plan.code,
          plan_version: plan.version,
          rule_id: rule.id,
          calc_kind: rule.calc_kind,
          beneficiary_type: asg.beneficiary_type,
          beneficiary_id: asg.beneficiary_id,
          base_amount: Number(revenueEvent.amount),
          calc_amount: perBeneficiary,
          split_pct: split,
          currency: plan.currency,
          period_key: periodKey,
        });
      }
    }
  }
  return out;
}

/**
 * Compute AND persist as `draft` accruals. Called from the
 * post-revenue-event pipeline (either via the DB trigger stub replaced
 * by a server function, or explicitly by the sales convert flow).
 * Existing draft/calculated rows for the same revenue event are removed
 * first so re-runs are idempotent — locked/approved rows are protected.
 */
export async function accrueCommissionsForEvent(
  sb: SB,
  revenueEventId: string,
): Promise<{ inserted: number; period_key: string | null }> {
  const { data: re, error } = await sb
    .from("revenue_events")
    .select("*")
    .eq("id", revenueEventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!re) return { inserted: 0, period_key: null };

  // Delete only draft/calculated re-runs; do not touch approved/locked.
  const { error: delErr } = await sb
    .from("commission_accruals")
    .delete()
    .eq("revenue_event_id", revenueEventId)
    .in("status", ["draft", "calculated"]);
  if (delErr) throw new Error(delErr.message);

  const previews = await previewCommissionsForEvent(sb, re as RevenueEventRow);
  if (!previews.length) return { inserted: 0, period_key: null };

  const rows: CommissionAccrualInsert[] = previews.map((p) => ({
    tenant_id: re.tenant_id,
    revenue_event_id: re.id,
    plan_id: p.plan_id,
    plan_version: p.plan_version,
    rule_id: p.rule_id,
    beneficiary_type: p.beneficiary_type,
    beneficiary_id: p.beneficiary_id,
    base_amount: p.base_amount,
    calc_amount: p.calc_amount,
    currency: p.currency,
    period_key: p.period_key,
    status: "calculated",
    audit: { split_pct: p.split_pct, calc_kind: p.calc_kind } as never,
  }));

  const inserted = await new CommissionAccrualRepository(sb).insertMany(rows);

  await sb.rpc("emit_automation_event", {
    _tenant_id: re.tenant_id,
    _event_type: "commission.accrued",
    _payload: {
      revenue_event_id: re.id,
      period_key: previews[0].period_key,
      count: inserted.length,
      total: inserted.reduce((s, r) => s + Number(r.calc_amount), 0),
    } as never,
    _entity_ref: { type: "revenue_event", id: re.id } as never,
  });

  return { inserted: inserted.length, period_key: previews[0].period_key };
}
