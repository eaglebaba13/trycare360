/**
 * Lead Assignment Rule Engine (server-only).
 *
 * Rules are persisted in `platform_settings` under key
 *   `lead.assignment.rules.<tenant_id>`
 * as an ordered array of AssignmentRule objects. The engine evaluates
 * rules in `priority` order and stops at the first match; if no rule
 * matches it falls back to `lead_channel_mappings.owner_default` for
 * the (provider, campaign) tuple, then to the tenant default owner
 * stored under `lead.assignment.default_owner.<tenant_id>`.
 *
 * Supported strategies (per rule):
 *   - fixed         → assign to `fixed_owner_id`
 *   - manual        → do not auto-assign; leaves owner null
 *   - round_robin   → cycle through `pool_owner_ids`
 *   - least_busy    → pick pool member with fewest open leads
 *   - skill_based   → filter pool by required skills (employees.meta.skills[])
 *   - branch_based  → filter pool to owners in lead.branch_id
 *
 * Conditions is a flat AND list of `{field, op, value}`; field paths
 * traverse the LeadContext object (`lead.branch_id`, `lead.city`,
 * `lead.source`, `lead.utm_campaign`, `person.language`,
 * `context.ai_severity`, `context.working_hours`, etc.).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { LeadRepository } from "./repositories.server";

type SB = SupabaseClient<Database>;

export type AssignmentStrategy =
  | "fixed"
  | "manual"
  | "round_robin"
  | "least_busy"
  | "skill_based"
  | "branch_based";

export type ConditionValue = string | number | boolean | Array<string | number> | null;

export interface AssignmentCondition {
  field: string;
  op: "eq" | "ne" | "in" | "not_in" | "gte" | "lte" | "contains" | "exists";
  value?: ConditionValue;
}

export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  is_active: boolean;
  conditions: AssignmentCondition[];
  strategy: AssignmentStrategy;
  fixed_owner_id?: string | null;
  pool_owner_ids?: string[];
  required_skills?: string[];
  working_hours?: { from: string; to: string; days?: number[] }; // HH:MM
}

export interface LeadContext {
  lead: {
    id?: string;
    tenant_id: string;
    branch_id?: string | null;
    franchise_id?: string | null;
    city?: string | null;
    country?: string | null;
    source?: string | null;
    utm_campaign?: string | null;
    priority?: string | null;
    stage_code?: string | null;
    expected_value?: number | null;
    referral_source?: string | null;
    meta?: Record<string, unknown> | null;
  };
  person?: {
    language?: string | null;
    vip_flag?: boolean | null;
    pincode?: string | null;
  } | null;
  context?: {
    ai_severity?: string | null;
    treatment_type?: string | null;
    campaign_source?: string | null;
    working_hours_now?: boolean;
  } | null;
}

// -----------------------------------------------------------------------
// Rule storage
// -----------------------------------------------------------------------

const RULES_KEY = (t: string) => `lead.assignment.rules.${t}`;
const DEFAULT_OWNER_KEY = (t: string) => `lead.assignment.default_owner.${t}`;
const RR_KEY = (t: string, rid: string) => `lead.assignment.rr_cursor.${t}.${rid}`;

export async function loadRules(sb: SB, tenantId: string): Promise<AssignmentRule[]> {
  const { data } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", RULES_KEY(tenantId))
    .maybeSingle();
  const raw = data?.value as unknown;
  if (!Array.isArray(raw)) return [];
  return (raw as AssignmentRule[])
    .filter((r) => r?.is_active !== false)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
}

export async function saveRules(sb: SB, tenantId: string, rules: AssignmentRule[]): Promise<void> {
  const { error } = await sb
    .from("platform_settings")
    .upsert(
      {
        key: RULES_KEY(tenantId),
        category: "lead_assignment",
        description: "Lead assignment routing rules (ordered)",
        value: rules as never,
      },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
}

// -----------------------------------------------------------------------
// Condition evaluation
// -----------------------------------------------------------------------

function readPath(root: LeadContext, path: string): unknown {
  const parts = path.split(".");
  // biome-ignore lint/suspicious/noExplicitAny: dynamic path resolution
  let cur: any = root;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

function evalCondition(ctx: LeadContext, c: AssignmentCondition): boolean {
  const v = readPath(ctx, c.field);
  switch (c.op) {
    case "eq":
      return v === c.value;
    case "ne":
      return v !== c.value;
    case "in":
      return Array.isArray(c.value) && (c.value as unknown[]).includes(v);
    case "not_in":
      return Array.isArray(c.value) && !(c.value as unknown[]).includes(v);
    case "gte":
      return typeof v === "number" && typeof c.value === "number" && v >= c.value;
    case "lte":
      return typeof v === "number" && typeof c.value === "number" && v <= c.value;
    case "contains":
      return typeof v === "string" && typeof c.value === "string" && v.includes(c.value);
    case "exists":
      return v !== null && v !== undefined && v !== "";
    default:
      return false;
  }
}

function matches(ctx: LeadContext, rule: AssignmentRule): boolean {
  if (!rule.conditions?.length) return true;
  return rule.conditions.every((c) => evalCondition(ctx, c));
}

// -----------------------------------------------------------------------
// Strategy execution
// -----------------------------------------------------------------------

async function pickLeastBusy(sb: SB, tenantId: string, pool: string[]): Promise<string | null> {
  if (!pool.length) return null;
  const counts = await Promise.all(
    pool.map((uid) => new LeadRepository(sb).countOpenByOwner(tenantId, uid)),
  );
  let bestIdx = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] < counts[bestIdx]) bestIdx = i;
  return pool[bestIdx];
}

async function pickRoundRobin(
  sb: SB,
  tenantId: string,
  ruleId: string,
  pool: string[],
): Promise<string | null> {
  if (!pool.length) return null;
  const key = RR_KEY(tenantId, ruleId);
  const { data } = await sb.from("platform_settings").select("value").eq("key", key).maybeSingle();
  const cursor = typeof data?.value === "number" ? (data.value as number) : 0;
  const pick = pool[cursor % pool.length];
  await sb.from("platform_settings").upsert(
    {
      key,
      category: "lead_assignment_state",
      description: `Round-robin cursor for rule ${ruleId}`,
      value: (cursor + 1) as never,
    },
    { onConflict: "key" },
  );
  return pick;
}

async function filterSkillBased(
  sb: SB,
  tenantId: string,
  pool: string[],
  required: string[],
): Promise<string[]> {
  if (!required?.length || !pool.length) return pool;
  const { data } = await sb
    .from("employees")
    .select("id, meta")
    .eq("tenant_id", tenantId)
    .in("id", pool);
  return (data ?? [])
    .filter((e) => {
      const skills = ((e.meta as Record<string, unknown>)?.skills ?? []) as string[];
      return required.every((s) => skills.includes(s));
    })
    .map((e) => e.id);
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

export interface AssignmentResult {
  owner_id: string | null;
  matched_rule_id: string | null;
  matched_rule_name: string | null;
  strategy: AssignmentStrategy | "fallback" | "none";
  reason: string;
}

export async function resolveAssignment(sb: SB, ctx: LeadContext): Promise<AssignmentResult> {
  const rules = await loadRules(sb, ctx.lead.tenant_id);

  for (const rule of rules) {
    if (!matches(ctx, rule)) continue;

    let pool = rule.pool_owner_ids ?? [];
    if (rule.strategy === "skill_based") {
      pool = await filterSkillBased(sb, ctx.lead.tenant_id, pool, rule.required_skills ?? []);
    }
    if (rule.strategy === "branch_based" && ctx.lead.branch_id) {
      const { data } = await sb
        .from("employees")
        .select("id")
        .eq("tenant_id", ctx.lead.tenant_id)
        .in("id", pool.length ? pool : ["00000000-0000-0000-0000-000000000000"]);
      pool = (data ?? []).map((e) => e.id);
    }

    let owner: string | null = null;
    switch (rule.strategy) {
      case "fixed":
        owner = rule.fixed_owner_id ?? null;
        break;
      case "manual":
        owner = null;
        break;
      case "round_robin":
        owner = await pickRoundRobin(sb, ctx.lead.tenant_id, rule.id, pool);
        break;
      case "least_busy":
      case "skill_based":
      case "branch_based":
        owner = await pickLeastBusy(sb, ctx.lead.tenant_id, pool);
        break;
    }
    return {
      owner_id: owner,
      matched_rule_id: rule.id,
      matched_rule_name: rule.name,
      strategy: rule.strategy,
      reason: `matched_rule:${rule.name}`,
    };
  }

  // Fallback 1: channel mapping default
  if (ctx.lead.source) {
    const { data: mapping } = await sb
      .from("lead_channel_mappings")
      .select("owner_default")
      .eq("tenant_id", ctx.lead.tenant_id)
      .eq("provider", ctx.lead.source)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (mapping?.owner_default) {
      return {
        owner_id: mapping.owner_default,
        matched_rule_id: null,
        matched_rule_name: null,
        strategy: "fallback",
        reason: "channel_default_owner",
      };
    }
  }

  // Fallback 2: tenant default owner
  const { data: def } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", DEFAULT_OWNER_KEY(ctx.lead.tenant_id))
    .maybeSingle();
  if (def?.value && typeof def.value === "string") {
    return {
      owner_id: def.value as string,
      matched_rule_id: null,
      matched_rule_name: null,
      strategy: "fallback",
      reason: "tenant_default_owner",
    };
  }

  return {
    owner_id: null,
    matched_rule_id: null,
    matched_rule_name: null,
    strategy: "none",
    reason: "no_rule_matched",
  };
}
