/**
 * SLA repositories (server-only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export type SlaDefinitionRow = Tables<"sla_definitions">;
export type SlaInstanceRow = Tables<"sla_instances">;
export type SlaInstanceInsert = TablesInsert<"sla_instances">;

export class SlaDefinitionRepository {
  constructor(private readonly sb: SB) {}
  async findActive(tenantId: string, kind: string): Promise<SlaDefinitionRow | null> {
    const { data, error } = await this.sb
      .from("sla_definitions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("kind", kind)
      .eq("is_active", true)
      .order("target_minutes", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
}

export class SlaInstanceRepository {
  constructor(private readonly sb: SB) {}
  insert(row: SlaInstanceInsert): Promise<SlaInstanceRow> {
    return this.sb.from("sla_instances").insert(row).select("*").single().then((r) => {
      if (r.error) throw new Error(r.error.message);
      if (!r.data) throw new Error("insert failed");
      return r.data;
    });
  }
  async satisfy(entityType: string, entityId: string, kind?: string): Promise<number> {
    let q = this.sb
      .from("sla_instances")
      .update({ status: "satisfied", satisfied_at: new Date().toISOString() })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "open");
    if (kind) q = q.eq("sla_kind", kind);
    const { data, error } = await q.select("id");
    if (error) throw new Error(error.message);
    return (data ?? []).length;
  }
  async listOpen(tenantId: string, dueBefore?: string): Promise<SlaInstanceRow[]> {
    let q = this.sb
      .from("sla_instances")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("status", "open")
      .order("due_at", { ascending: true });
    if (dueBefore) q = q.lte("due_at", dueBefore);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async escalate(id: string, level: number, meta: Record<string, unknown>) {
    const { error } = await this.sb
      .from("sla_instances")
      .update({
        escalation_level: level,
        escalated_at: new Date().toISOString(),
        meta: meta as never,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
