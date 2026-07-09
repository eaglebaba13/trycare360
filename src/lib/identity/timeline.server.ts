/**
 * Person Timeline Service (Stage E).
 *
 * Returns a chronologically ordered feed of events for a person by
 * reading the existing `timeline_events` table, plus lightweight
 * synthesized entries derived from identity-domain tables
 * (verifications, merge history, role attachments) so the timeline
 * remains useful before every producer has been migrated to emit into
 * `timeline_events` directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface TimelineEntry {
  ts: string;
  source: "timeline_events" | "verification" | "merge" | "role";
  event_type: string;
  title: string;
  body: string | null;
  meta: Record<string, unknown>;
}

export class TimelineService {
  constructor(private readonly sb: SB) {}

  async forPerson(tenantId: string, personId: string, limit = 100): Promise<TimelineEntry[]> {
    const [events, verifs, merges] = await Promise.all([
      this.sb
        .from("timeline_events")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("entity_type", "person")
        .eq("entity_id", personId)
        .order("ts", { ascending: false })
        .limit(limit),
      this.sb
        .from("person_verifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .order("initiated_at", { ascending: false })
        .limit(50),
      this.sb
        .from("person_merge_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const out: TimelineEntry[] = [];

    for (const e of (events.data ?? []) as Tables<"timeline_events">[]) {
      out.push({
        ts: e.ts,
        source: "timeline_events",
        event_type: e.event_type,
        title: e.title,
        body: e.body,
        meta: (e.meta as Record<string, unknown>) ?? {},
      });
    }
    for (const v of (verifs.data ?? []) as Tables<"person_verifications">[]) {
      out.push({
        ts: v.initiated_at ?? v.created_at,
        source: "verification",
        event_type: `verification.${v.status}`,
        title: `Verification (${v.method}) — ${v.status}`,
        body: v.notes ?? null,
        meta: { method: v.method, provider: v.provider, level: v.level },
      });
    }
    for (const m of (merges.data ?? []) as Tables<"person_merge_history">[]) {
      out.push({
        ts: m.created_at,
        source: "merge",
        event_type: `merge.${m.operation}`,
        title:
          m.operation === "merge"
            ? `Merged into ${m.target_person_id}`
            : `Unmerged from ${m.target_person_id}`,
        body: m.reason ?? null,
        meta: {
          source_person_id: m.source_person_id,
          target_person_id: m.target_person_id,
          rows_repointed: m.rows_repointed,
        },
      });
    }

    out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return out.slice(0, limit);
  }
}
