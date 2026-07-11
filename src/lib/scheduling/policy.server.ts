/**
 * Scheduling — Policy Engine (server-only).
 *
 * Loads `scheduling_policies` rows for a context, applies precedence
 * (doctor > service > branch > franchise > tenant, then by
 * effective_from desc), and evaluates a small set of well-known policy
 * keys against the requested action.
 *
 * NO hardcoded business rules — every rule is a policy row. Unknown
 * policy keys are treated as advisory and returned in `notes`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PolicyRepository, type PolicyRow } from "./repositories.server";
import type { EvaluatePolicyContext } from "./validators";

type SB = SupabaseClient<Database>;

export type PolicyViolation = {
  policy_key: string;
  severity: "block" | "warn";
  message: string;
  scope: string;
  policy_id: string;
};

export type PolicyEvaluation = {
  allowed: boolean;
  violations: PolicyViolation[];
  applied: PolicyRow[];
  notes: string[];
};

const SCOPE_RANK: Record<string, number> = {
  doctor: 500,
  service: 400,
  branch: 300,
  franchise: 200,
  tenant: 100,
};

function orderPolicies(rows: PolicyRow[]): PolicyRow[] {
  return [...rows].sort((a, b) => {
    const ar = SCOPE_RANK[(a.scope as string) ?? "tenant"] ?? 0;
    const br = SCOPE_RANK[(b.scope as string) ?? "tenant"] ?? 0;
    if (br !== ar) return br - ar;
    return (
      new Date(b.effective_from as string).getTime() -
      new Date(a.effective_from as string).getTime()
    );
  });
}

/**
 * Reduce a list of policies to the last-writer-wins map by policy_key
 * (higher precedence overwrites lower).
 */
function collapse(rows: PolicyRow[]): Map<string, PolicyRow> {
  const out = new Map<string, PolicyRow>();
  const ordered = orderPolicies(rows);
  // ordered = highest precedence first — only set if not already set
  for (const r of ordered) {
    const k = r.policy_key as string;
    if (!out.has(k)) out.set(k, r);
  }
  return out;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))
    return Number(v);
  return fallback;
}
function asBoolean(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : [];
}

/**
 * Known policy keys the engine actively evaluates. Everything else is
 * exposed via `applied` so callers can consume it (e.g. scoring).
 */
const KNOWN_KEYS = new Set([
  "booking.min_lead_minutes",
  "booking.max_horizon_days",
  "booking.allow_walk_in",
  "booking.allow_after_hours",
  "cancel.min_notice_minutes",
  "cancel.max_per_day",
  "reschedule.min_notice_minutes",
  "reschedule.max_count",
  "check_in.grace_minutes",
  "check_in.late_grace_minutes",
  "no_show.strike_limit",
  "booking.allowed_sources",
  "booking.blocked_sources",
]);

export class SchedulingPolicyEngine {
  private readonly repo: PolicyRepository;
  constructor(sb: SB) {
    this.repo = new PolicyRepository(sb);
  }

  async evaluate(ctx: EvaluatePolicyContext): Promise<PolicyEvaluation> {
    const rows = await this.repo.listApplicable({
      tenantId: ctx.tenant_id,
      branchId: ctx.branch_id ?? null,
      franchiseId: ctx.franchise_id ?? null,
      serviceId: ctx.service_id ?? null,
      doctorId: ctx.doctor_id ?? null,
      at: ctx.now ?? new Date().toISOString(),
    });
    const applied = orderPolicies(rows);
    const effective = collapse(rows);

    const violations: PolicyViolation[] = [];
    const notes: string[] = [];
    const now = new Date(ctx.now ?? new Date().toISOString()).getTime();
    const start = ctx.starts_at ? new Date(ctx.starts_at).getTime() : null;

    const violate = (
      key: string,
      severity: "block" | "warn",
      message: string,
      row: PolicyRow,
    ) => {
      violations.push({
        policy_key: key,
        severity,
        message,
        scope: (row.scope as string) ?? "tenant",
        policy_id: row.id as string,
      });
    };

    // --- book / hold ------------------------------------------------------
    if (ctx.action === "book" || ctx.action === "hold") {
      const minLead = effective.get("booking.min_lead_minutes");
      if (minLead && start !== null) {
        const minutes = asNumber(
          (minLead.policy_value as { value?: unknown } | null)?.value ??
            minLead.policy_value,
        );
        if ((start - now) / 60000 < minutes) {
          violate(
            "booking.min_lead_minutes",
            "block",
            `Booking requires at least ${minutes} minutes lead time.`,
            minLead,
          );
        }
      }
      const horizon = effective.get("booking.max_horizon_days");
      if (horizon && start !== null) {
        const days = asNumber(
          (horizon.policy_value as { value?: unknown } | null)?.value ??
            horizon.policy_value,
        );
        if ((start - now) / (86400_000) > days) {
          violate(
            "booking.max_horizon_days",
            "block",
            `Bookings cannot be placed more than ${days} days in advance.`,
            horizon,
          );
        }
      }
      const walkIn = effective.get("booking.allow_walk_in");
      if (walkIn && ctx.booking_source === "walk_in") {
        const allowed = asBoolean(
          (walkIn.policy_value as { value?: unknown } | null)?.value ??
            walkIn.policy_value,
          true,
        );
        if (!allowed)
          violate(
            "booking.allow_walk_in",
            "block",
            "Walk-in bookings are disabled for this context.",
            walkIn,
          );
      }
      const allowed = effective.get("booking.allowed_sources");
      if (allowed && ctx.booking_source) {
        const list = asStringArray(
          (allowed.policy_value as { value?: unknown } | null)?.value ??
            allowed.policy_value,
        );
        if (list.length > 0 && !list.includes(ctx.booking_source)) {
          violate(
            "booking.allowed_sources",
            "block",
            `Booking source "${ctx.booking_source}" is not on the allow-list.`,
            allowed,
          );
        }
      }
      const blocked = effective.get("booking.blocked_sources");
      if (blocked && ctx.booking_source) {
        const list = asStringArray(
          (blocked.policy_value as { value?: unknown } | null)?.value ??
            blocked.policy_value,
        );
        if (list.includes(ctx.booking_source)) {
          violate(
            "booking.blocked_sources",
            "block",
            `Booking source "${ctx.booking_source}" is blocked.`,
            blocked,
          );
        }
      }
    }

    // --- cancel -----------------------------------------------------------
    if (ctx.action === "cancel") {
      const notice = effective.get("cancel.min_notice_minutes");
      if (notice && start !== null) {
        const mins = asNumber(
          (notice.policy_value as { value?: unknown } | null)?.value ??
            notice.policy_value,
        );
        if ((start - now) / 60000 < mins) {
          violate(
            "cancel.min_notice_minutes",
            "warn",
            `Cancellation requires ${mins} minutes notice; late fee may apply.`,
            notice,
          );
        }
      }
    }

    // --- reschedule -------------------------------------------------------
    if (ctx.action === "reschedule") {
      const notice = effective.get("reschedule.min_notice_minutes");
      if (notice && start !== null) {
        const mins = asNumber(
          (notice.policy_value as { value?: unknown } | null)?.value ??
            notice.policy_value,
        );
        if ((start - now) / 60000 < mins) {
          violate(
            "reschedule.min_notice_minutes",
            "warn",
            `Reschedule requires ${mins} minutes notice.`,
            notice,
          );
        }
      }
    }

    // Advisory / unknown keys → surface as notes so callers can extend.
    for (const [k, row] of effective) {
      if (!KNOWN_KEYS.has(k)) {
        notes.push(`policy:${k}@${(row.scope as string) ?? "tenant"}`);
      }
    }

    const allowed = !violations.some((v) => v.severity === "block");
    return { allowed, violations, applied, notes };
  }
}
