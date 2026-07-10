/**
 * Revenue / Attribution repositories (server-only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export type RevenueEventRow = Tables<"revenue_events">;
export type AttributionTouchRow = Tables<"attribution_touches">;
export type AttributionCreditRow = Tables<"attribution_credits">;
export type AttributionCreditInsert = TablesInsert<"attribution_credits">;

export class RevenueEventRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string): Promise<RevenueEventRow | null> {
    const { data, error } = await this.sb.from("revenue_events").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  async listForPerson(personId: string, limit = 200): Promise<RevenueEventRow[]> {
    const { data, error } = await this.sb
      .from("revenue_events")
      .select("*")
      .eq("person_id", personId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}

export class AttributionTouchRepository {
  constructor(private readonly sb: SB) {}
  async listForPerson(personId: string): Promise<AttributionTouchRow[]> {
    const { data, error } = await this.sb
      .from("attribution_touches")
      .select("*")
      .eq("person_id", personId)
      .order("occurred_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}

export class AttributionCreditRepository {
  constructor(private readonly sb: SB) {}
  insertMany(rows: AttributionCreditInsert[]) {
    return this.sb.from("attribution_credits").insert(rows).then((r) => {
      if (r.error) throw new Error(r.error.message);
    });
  }
  async deleteForRevenueEvent(revenueEventId: string): Promise<void> {
    const { error } = await this.sb
      .from("attribution_credits")
      .delete()
      .eq("revenue_event_id", revenueEventId);
    if (error) throw new Error(error.message);
  }
  async listForRevenueEvent(revenueEventId: string): Promise<AttributionCreditRow[]> {
    const { data, error } = await this.sb
      .from("attribution_credits")
      .select("*")
      .eq("revenue_event_id", revenueEventId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
