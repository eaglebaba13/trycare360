/**
 * Interaction repository (server-only). Direct table access for
 * timeline queries; mutations use the log_interaction RPC via
 * `interactions.functions.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;
export type InteractionRow = Tables<"interactions">;

export class InteractionRepository {
  constructor(private readonly sb: SB) {}

  async listByPerson(personId: string, limit = 100): Promise<InteractionRow[]> {
    const { data, error } = await this.sb
      .from("interactions")
      .select("*")
      .eq("person_id", personId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async listByLead(leadId: string, limit = 100): Promise<InteractionRow[]> {
    const { data, error } = await this.sb
      .from("interactions")
      .select("*")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async countByChannel(tenantId: string, from: string, to: string) {
    const { data, error } = await this.sb
      .from("interactions")
      .select("channel")
      .eq("tenant_id", tenantId)
      .gte("occurred_at", from)
      .lte("occurred_at", to);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const r of data ?? []) counts[r.channel] = (counts[r.channel] ?? 0) + 1;
    return counts;
  }
}
