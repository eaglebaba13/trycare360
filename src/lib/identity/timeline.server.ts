/**
 * Person Timeline Service (Stage E).
 *
 * Returns a chronologically ordered feed of events for a person by
 * reading the existing `timeline_events` table, plus lightweight
 * synthesized entries derived from identity-domain tables
 * (verifications, merge history) so the timeline remains useful
 * before every producer has been migrated to emit into
 * `timeline_events` directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface TimelineEntry {
  ts: string;
  source: "timeline_events" | "verification" | "merge";
  event_type: string;
  title: string;
  body: string | null;
  meta: Json;
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
        .order("performed_at", { ascending: false })
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
        meta: (e.meta ?? {}) as Json,
      });
    }
    for (const v of (verifs.data ?? []) as Tables<"person_verifications">[]) {
      out.push({
        ts: v.initiated_at ?? v.created_at,
        source: "verification",
        event_type: `verification.${v.status}`,
        title: `Verification (${v.method}) — ${v.status}`,
        body: null,
        meta: {
          method: v.method,
          provider: v.provider ?? null,
          document_type: v.document_type ?? null,
          metadata: v.metadata as Json,
        } as Json,
      });
    }
    for (const m of (merges.data ?? []) as Tables<"person_merge_history">[]) {
      out.push({
        ts: m.performed_at,
        source: "merge",
        event_type: `merge.${m.action}`,
        title:
          m.action === "merge"
            ? `Merged into ${m.target_person_id}`
            : `Unmerged from ${m.target_person_id}`,
        body: null,
        meta: {
          source_person_id: m.source_person_id,
          target_person_id: m.target_person_id,
          fk_repoint_summary: m.fk_repoint_summary as Json,
        } as Json,
      });
    }

    out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
    return out.slice(0, limit);
  }
}
