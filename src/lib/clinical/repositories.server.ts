/**
 * Clinical / EMR — Repositories (server-only).
 * Thin typed wrappers over Supabase table access. All business logic
 * (events, timeline, search indexing) lives in services & server fns.
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

// ---------- Clinical Knowledge (read-only projections) --------------------

export type KnowledgeKind =
  | "code_systems"
  | "codes"
  | "protocols"
  | "soap_templates"
  | "diagnosis_templates"
  | "treatment_protocols"
  | "procedure_checklists"
  | "consent_templates"
  | "prescription_templates"
  | "nutrition_plan_templates"
  | "followup_templates"
  | "ai_prompt_templates"
  | "anatomy_grids"
  | "scoring_scales"
  | "contraindication_rules";

const KNOWLEDGE_TABLE: Record<KnowledgeKind, keyof Database["public"]["Tables"]> = {
  code_systems: "clinical_code_systems",
  codes: "clinical_codes",
  protocols: "clinical_protocols",
  soap_templates: "clinical_soap_templates",
  diagnosis_templates: "clinical_diagnosis_templates",
  treatment_protocols: "clinical_treatment_protocols",
  procedure_checklists: "clinical_procedure_checklists",
  consent_templates: "clinical_consent_templates",
  prescription_templates: "clinical_prescription_templates",
  nutrition_plan_templates: "clinical_nutrition_plan_templates",
  followup_templates: "clinical_followup_templates",
  ai_prompt_templates: "clinical_ai_prompt_templates",
  anatomy_grids: "clinical_anatomy_grids",
  scoring_scales: "clinical_scoring_scales",
  contraindication_rules: "clinical_contraindication_rules",
};

export type KnowledgeRow = Record<string, unknown>;

export class ClinicalKnowledgeRepository {
  // Use a loosely-typed inner client for cross-table generic listing.
  // biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
  private readonly client: any;
  constructor(sb: SB) {
    this.client = sb;
  }

  tableFor(kind: KnowledgeKind) {
    return KNOWLEDGE_TABLE[kind];
  }

  /**
   * Tenant-inheritable read: rows where tenant_id IS NULL (global) OR
   * matches the caller tenant. RLS enforces access.
   */
  async list(
    kind: KnowledgeKind,
    tenantId: string,
    opts: { search?: string; activeOnly?: boolean; limit?: number; offset?: number } = {},
  ): Promise<KnowledgeRow[]> {
    const table = this.tableFor(kind);
    let q = this.client.from(table).select("*");
    q = q.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    if (opts.activeOnly !== false && kind !== "code_systems" && kind !== "codes") {
      q = q.eq("is_active", true);
    }
    if (opts.search) {
      const s = opts.search.replace(/[%_,]/g, "");
      q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%`);
    }
    q = q.order("name", { ascending: true }).range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 200) - 1);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []) as KnowledgeRow[];
  }
}

// ---------- Encounters -----------------------------------------------------

export type EncounterRow = Tables<"clinical_encounters">;
export type EncounterInsert = TablesInsert<"clinical_encounters">;
export type EncounterUpdate = TablesUpdate<"clinical_encounters">;

export class EncounterRepository {
  constructor(private readonly sb: SB) {}

  async insert(row: EncounterInsert): Promise<EncounterRow> {
    return unwrap(await this.sb.from("clinical_encounters").insert(row).select("*").single());
  }
  async update(id: string, patch: EncounterUpdate): Promise<EncounterRow> {
    return unwrap(
      await this.sb.from("clinical_encounters").update(patch).eq("id", id).select("*").single(),
    );
  }
  async getById(id: string): Promise<EncounterRow | null> {
    return unwrapMaybe(await this.sb.from("clinical_encounters").select("*").eq("id", id).maybeSingle());
  }
  async listForPatient(tenantId: string, patientId: string, limit = 20): Promise<EncounterRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_encounters")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
}

// ---------- Participants ---------------------------------------------------

export type ParticipantRow = Tables<"clinical_encounter_participants">;
export type ParticipantInsert = TablesInsert<"clinical_encounter_participants">;

export class ParticipantRepository {
  constructor(private readonly sb: SB) {}

  async insert(row: ParticipantInsert): Promise<ParticipantRow> {
    return unwrap(
      await this.sb.from("clinical_encounter_participants").insert(row).select("*").single(),
    );
  }
  async markLeft(id: string, leftAt: string): Promise<ParticipantRow> {
    return unwrap(
      await this.sb
        .from("clinical_encounter_participants")
        .update({ left_at: leftAt })
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async listForEncounter(encounterId: string): Promise<ParticipantRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_encounter_participants")
        .select("*")
        .eq("encounter_id", encounterId)
        .order("joined_at", { ascending: true }),
    );
  }
}

// ---------- Problems -------------------------------------------------------

export type ProblemRow = Tables<"clinical_problems">;
export type ProblemInsert = TablesInsert<"clinical_problems">;
export type ProblemUpdate = TablesUpdate<"clinical_problems">;

export class ProblemRepository {
  constructor(private readonly sb: SB) {}

  async upsert(row: ProblemInsert & { id?: string }): Promise<ProblemRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(await this.sb.from("clinical_problems").update(patch).eq("id", id).select("*").single());
    }
    return unwrap(await this.sb.from("clinical_problems").insert(row).select("*").single());
  }
  async update(id: string, patch: ProblemUpdate): Promise<ProblemRow> {
    return unwrap(await this.sb.from("clinical_problems").update(patch).eq("id", id).select("*").single());
  }
  async getById(id: string): Promise<ProblemRow | null> {
    return unwrapMaybe(await this.sb.from("clinical_problems").select("*").eq("id", id).maybeSingle());
  }
  async listActive(tenantId: string, patientId: string): Promise<ProblemRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_problems")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .in("status", ["active", "recurrence"])
        .order("onset_date", { ascending: false, nullsFirst: false }),
    );
  }
}

// ---------- Allergies ------------------------------------------------------

export type AllergyRow = Tables<"clinical_allergies">;
export type AllergyInsert = TablesInsert<"clinical_allergies">;

export class AllergyRepository {
  constructor(private readonly sb: SB) {}

  async upsert(row: AllergyInsert & { id?: string }): Promise<AllergyRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(await this.sb.from("clinical_allergies").update(patch).eq("id", id).select("*").single());
    }
    return unwrap(await this.sb.from("clinical_allergies").insert(row).select("*").single());
  }
  async listActive(tenantId: string, patientId: string): Promise<AllergyRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_allergies")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    );
  }
}

// ---------- Vitals ---------------------------------------------------------

export type VitalsRow = Tables<"clinical_vitals">;
export type VitalsInsert = TablesInsert<"clinical_vitals">;

export class VitalsRepository {
  constructor(private readonly sb: SB) {}

  async insert(row: VitalsInsert): Promise<VitalsRow> {
    return unwrap(await this.sb.from("clinical_vitals").insert(row).select("*").single());
  }
  async listRecent(tenantId: string, patientId: string, limit = 10): Promise<VitalsRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_vitals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("measured_at", { ascending: false })
        .limit(limit),
    );
  }
  async latest(tenantId: string, patientId: string): Promise<VitalsRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("clinical_vitals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
  }
}

// ---------- Medical / Family / Lifestyle history --------------------------

export type MedicalHistoryRow = Tables<"clinical_medical_history">;
export type MedicalHistoryInsert = TablesInsert<"clinical_medical_history">;

export class MedicalHistoryRepository {
  constructor(private readonly sb: SB) {}
  async upsert(row: MedicalHistoryInsert & { id?: string }): Promise<MedicalHistoryRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(
        await this.sb.from("clinical_medical_history").update(patch).eq("id", id).select("*").single(),
      );
    }
    return unwrap(await this.sb.from("clinical_medical_history").insert(row).select("*").single());
  }
  async list(tenantId: string, patientId: string): Promise<MedicalHistoryRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_medical_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("event_date", { ascending: false, nullsFirst: false }),
    );
  }
}

export type FamilyHistoryRow = Tables<"clinical_family_history">;
export type FamilyHistoryInsert = TablesInsert<"clinical_family_history">;

export class FamilyHistoryRepository {
  constructor(private readonly sb: SB) {}
  async upsert(row: FamilyHistoryInsert & { id?: string }): Promise<FamilyHistoryRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(
        await this.sb.from("clinical_family_history").update(patch).eq("id", id).select("*").single(),
      );
    }
    return unwrap(await this.sb.from("clinical_family_history").insert(row).select("*").single());
  }
  async list(tenantId: string, patientId: string): Promise<FamilyHistoryRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_family_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    );
  }
}

export type LifestyleRow = Tables<"clinical_lifestyle_history">;
export type LifestyleInsert = TablesInsert<"clinical_lifestyle_history">;

export class LifestyleRepository {
  constructor(private readonly sb: SB) {}
  async upsert(row: LifestyleInsert & { id?: string }): Promise<LifestyleRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(
        await this.sb.from("clinical_lifestyle_history").update(patch).eq("id", id).select("*").single(),
      );
    }
    return unwrap(await this.sb.from("clinical_lifestyle_history").insert(row).select("*").single());
  }
  async latest(tenantId: string, patientId: string): Promise<LifestyleRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("clinical_lifestyle_history")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
  }
}

// ---------- Referrals ------------------------------------------------------

export type ReferralRow = Tables<"clinical_referrals">;
export type ReferralInsert = TablesInsert<"clinical_referrals">;
export type ReferralUpdate = TablesUpdate<"clinical_referrals">;

export class ReferralRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: ReferralInsert): Promise<ReferralRow> {
    return unwrap(await this.sb.from("clinical_referrals").insert(row).select("*").single());
  }
  async update(id: string, patch: ReferralUpdate): Promise<ReferralRow> {
    return unwrap(await this.sb.from("clinical_referrals").update(patch).eq("id", id).select("*").single());
  }
  async listForPatient(tenantId: string, patientId: string): Promise<ReferralRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_referrals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    );
  }
}

// ---------- Second Opinions -----------------------------------------------

export type SecondOpinionRow = Tables<"clinical_second_opinions">;
export type SecondOpinionInsert = TablesInsert<"clinical_second_opinions">;
export type SecondOpinionUpdate = TablesUpdate<"clinical_second_opinions">;

export class SecondOpinionRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: SecondOpinionInsert): Promise<SecondOpinionRow> {
    return unwrap(await this.sb.from("clinical_second_opinions").insert(row).select("*").single());
  }
  async update(id: string, patch: SecondOpinionUpdate): Promise<SecondOpinionRow> {
    return unwrap(
      await this.sb.from("clinical_second_opinions").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listForPatient(tenantId: string, patientId: string): Promise<SecondOpinionRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_second_opinions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("requested_at", { ascending: false }),
    );
  }
}
