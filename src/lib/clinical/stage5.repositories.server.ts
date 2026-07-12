/**
 * Clinical / EMR — Stage 5 repositories (server-only).
 * Thin typed wrappers around the three Stage 5 tables:
 *   - clinical_ai_recommendations
 *   - clinical_ai_conversations
 *   - clinical_ai_audit
 * All business logic (events, timeline, AI call) lives in the engines.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("Row not found");
  return res.data;
}
function unwrapMaybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function unwrapList<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export type AiRecommendationRow = Tables<"clinical_ai_recommendations">;
export type AiRecommendationInsert = TablesInsert<"clinical_ai_recommendations">;
export type AiRecommendationUpdate = TablesUpdate<"clinical_ai_recommendations">;

export class AiRecommendationRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: AiRecommendationInsert): Promise<AiRecommendationRow> {
    return unwrap(
      await this.sb.from("clinical_ai_recommendations").insert(row).select("*").single(),
    );
  }
  async insertMany(rows: AiRecommendationInsert[]): Promise<AiRecommendationRow[]> {
    if (!rows.length) return [];
    return unwrapList(
      await this.sb.from("clinical_ai_recommendations").insert(rows).select("*"),
    );
  }
  async update(id: string, patch: AiRecommendationUpdate): Promise<AiRecommendationRow> {
    return unwrap(
      await this.sb
        .from("clinical_ai_recommendations")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async getById(id: string): Promise<AiRecommendationRow | null> {
    return unwrapMaybe(
      await this.sb.from("clinical_ai_recommendations").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(args: {
    tenantId: string;
    encounterId?: string | null;
    patientId?: string | null;
    status?: string | null;
    kind?: string | null;
    limit?: number;
  }): Promise<AiRecommendationRow[]> {
    let q = this.sb
      .from("clinical_ai_recommendations")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 50);
    if (args.encounterId) q = q.eq("encounter_id", args.encounterId);
    if (args.patientId) q = q.eq("patient_id", args.patientId);
    if (args.status) q = q.eq("status", args.status);
    if (args.kind) q = q.eq("kind", args.kind);
    return unwrapList(await q);
  }
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export type AiConversationRow = Tables<"clinical_ai_conversations">;
export type AiConversationInsert = TablesInsert<"clinical_ai_conversations">;
export type AiConversationUpdate = TablesUpdate<"clinical_ai_conversations">;

export class AiConversationRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: AiConversationInsert): Promise<AiConversationRow> {
    return unwrap(await this.sb.from("clinical_ai_conversations").insert(row).select("*").single());
  }
  async update(id: string, patch: AiConversationUpdate): Promise<AiConversationRow> {
    return unwrap(
      await this.sb.from("clinical_ai_conversations").update(patch).eq("id", id).select("*").single(),
    );
  }
  async getById(id: string): Promise<AiConversationRow | null> {
    return unwrapMaybe(
      await this.sb.from("clinical_ai_conversations").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(args: {
    tenantId: string;
    encounterId?: string | null;
    patientId?: string | null;
    limit?: number;
  }): Promise<AiConversationRow[]> {
    let q = this.sb
      .from("clinical_ai_conversations")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 50);
    if (args.encounterId) q = q.eq("encounter_id", args.encounterId);
    if (args.patientId) q = q.eq("patient_id", args.patientId);
    return unwrapList(await q);
  }
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export type AiAuditRow = Tables<"clinical_ai_audit">;
export type AiAuditInsert = TablesInsert<"clinical_ai_audit">;

export class AiAuditRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: AiAuditInsert): Promise<AiAuditRow> {
    return unwrap(await this.sb.from("clinical_ai_audit").insert(row).select("*").single());
  }
  async list(args: {
    tenantId: string;
    encounterId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    limit?: number;
  }): Promise<AiAuditRow[]> {
    let q = this.sb
      .from("clinical_ai_audit")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 100);
    if (args.encounterId) q = q.eq("encounter_id", args.encounterId);
    if (args.entityType) q = q.eq("entity_type", args.entityType);
    if (args.entityId) q = q.eq("entity_id", args.entityId);
    return unwrapList(await q);
  }
}

// ---------------------------------------------------------------------------
// Prompt templates (read-only helper reusing the Stage 1 table)
// ---------------------------------------------------------------------------

export type PromptTemplateRow = Tables<"clinical_ai_prompt_templates">;

export class PromptTemplateRepository {
  constructor(private readonly sb: SB) {}
  async list(args: {
    tenantId: string;
    purpose?: string | null;
    activeOnly?: boolean;
  }): Promise<PromptTemplateRow[]> {
    let q = this.sb
      .from("clinical_ai_prompt_templates")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${args.tenantId}`)
      .order("code", { ascending: true })
      .order("version", { ascending: false });
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    if (args.purpose) q = q.eq("purpose", args.purpose);
    return unwrapList(await q);
  }
  /**
   * Resolve the best template for a purpose. Tenant-specific overrides take
   * precedence over the global (tenant_id IS NULL) built-ins. Highest version wins.
   */
  async resolve(args: {
    tenantId: string;
    code?: string | null;
    purpose?: string | null;
    version?: number | null;
  }): Promise<PromptTemplateRow | null> {
    let q = this.sb
      .from("clinical_ai_prompt_templates")
      .select("*")
      .or(`tenant_id.is.null,tenant_id.eq.${args.tenantId}`)
      .eq("is_active", true);
    if (args.code) q = q.eq("code", args.code);
    if (args.purpose) q = q.eq("purpose", args.purpose);
    if (args.version) q = q.eq("version", args.version);
    q = q.order("tenant_id", { ascending: false, nullsFirst: false })
      .order("version", { ascending: false })
      .limit(1);
    const rows = unwrapList(await q);
    return rows[0] ?? null;
  }
}
