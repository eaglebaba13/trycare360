/**
 * Scheduling — Communication Policy Engine (server-only).
 *
 * Every reminder / calendar / video decision reads from here. The
 * reminder pipeline never hardcodes channel order, retry rules, quiet
 * hours or timing offsets. Policies resolve most-specific-first:
 *   service scope → branch scope → tenant scope → built-in fallback.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;
export type CommunicationPolicy = Tables<"communication_policies">;

export const DEFAULT_POLICY = {
  channels_order: ["whatsapp", "sms", "email", "push"] as const,
  reminder_offsets_minutes: [1440, 120, 30] as const,
  templates: {
    booking_confirmation: "appointment.booking_confirmation",
    reminder_24h: "appointment.reminder_24h",
    reminder_2h: "appointment.reminder_2h",
    arrival: "appointment.arrival",
    followup: "appointment.followup",
    feedback: "appointment.feedback",
  } as Record<string, string>,
  quiet_hours_start: null as string | null,
  quiet_hours_end: null as string | null,
  retry_max_attempts: 3,
  retry_backoff_minutes: 15,
  language: "en",
  respect_person_preferences: true,
};

export type ResolvedPolicy = typeof DEFAULT_POLICY & {
  id?: string;
  code?: string;
};

export class CommunicationPolicyEngine {
  constructor(private readonly sb: SB) {}

  async resolve(args: {
    tenantId: string;
    branchId?: string | null;
    serviceId?: string | null;
  }): Promise<ResolvedPolicy> {
    const orFilters: string[] = ["scope.eq.tenant"];
    if (args.branchId) orFilters.push(`branch_id.eq.${args.branchId}`);
    if (args.serviceId) orFilters.push(`service_id.eq.${args.serviceId}`);

    const { data, error } = await this.sb
      .from("communication_policies")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("is_active", true)
      .or(orFilters.join(","))
      .order("priority", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CommunicationPolicy[];

    const bySpecificity = (p: CommunicationPolicy) =>
      p.service_id === args.serviceId && args.serviceId
        ? 0
        : p.branch_id === args.branchId && args.branchId
          ? 1
          : 2;
    rows.sort((a, b) => bySpecificity(a) - bySpecificity(b));

    return this.merge(rows);
  }

  private merge(rows: CommunicationPolicy[]): ResolvedPolicy {
    const base: ResolvedPolicy = {
      ...DEFAULT_POLICY,
      channels_order: [...DEFAULT_POLICY.channels_order],
      reminder_offsets_minutes: [...DEFAULT_POLICY.reminder_offsets_minutes],
      templates: { ...DEFAULT_POLICY.templates },
    };
    for (const row of rows.slice().reverse()) {
      if (Array.isArray(row.channels_order))
        base.channels_order = row.channels_order as never;
      if (Array.isArray(row.reminder_offsets_minutes))
        base.reminder_offsets_minutes = row.reminder_offsets_minutes as never;
      if (
        row.templates &&
        typeof row.templates === "object" &&
        !Array.isArray(row.templates)
      ) {
        base.templates = {
          ...base.templates,
          ...(row.templates as Record<string, string>),
        };
      }
      base.quiet_hours_start = row.quiet_hours_start ?? base.quiet_hours_start;
      base.quiet_hours_end = row.quiet_hours_end ?? base.quiet_hours_end;
      base.retry_max_attempts = row.retry_max_attempts ?? base.retry_max_attempts;
      base.retry_backoff_minutes =
        row.retry_backoff_minutes ?? base.retry_backoff_minutes;
      base.language = row.language ?? base.language;
      base.respect_person_preferences =
        row.respect_person_preferences ?? base.respect_person_preferences;
      base.id = row.id;
      base.code = row.code;
    }
    return base;
  }

  /** True when `at` falls inside the resolved quiet-hours window. */
  isInQuietHours(policy: ResolvedPolicy, at: Date): boolean {
    if (!policy.quiet_hours_start || !policy.quiet_hours_end) return false;
    const [sh, sm] = policy.quiet_hours_start.split(":").map(Number);
    const [eh, em] = policy.quiet_hours_end.split(":").map(Number);
    const mins = at.getHours() * 60 + at.getMinutes();
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    return s <= e ? mins >= s && mins < e : mins >= s || mins < e;
  }
}
