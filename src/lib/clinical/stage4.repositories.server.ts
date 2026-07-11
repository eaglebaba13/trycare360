/**
 * Clinical / EMR — Stage 4 repositories (server-only).
 * Thin typed wrappers around the Stage 4 tables. All business logic
 * (events, timeline, search) lives in stage4.engine.server.ts.
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

// ---------- SOAP -----------------------------------------------------------

export type SoapNoteRow = Tables<"clinical_soap_notes">;
export type SoapNoteInsert = TablesInsert<"clinical_soap_notes">;
export type SoapNoteUpdate = TablesUpdate<"clinical_soap_notes">;
export type SoapVersionRow = Tables<"clinical_soap_versions">;
export type SoapVersionInsert = TablesInsert<"clinical_soap_versions">;

export class SoapNoteRepository {
  constructor(private readonly sb: SB) {}
  async getByEncounter(encounterId: string): Promise<SoapNoteRow | null> {
    return unwrapMaybe(
      await this.sb.from("clinical_soap_notes").select("*").eq("encounter_id", encounterId).maybeSingle(),
    );
  }
  async insert(row: SoapNoteInsert): Promise<SoapNoteRow> {
    return unwrap(await this.sb.from("clinical_soap_notes").insert(row).select("*").single());
  }
  async update(id: string, patch: SoapNoteUpdate): Promise<SoapNoteRow> {
    return unwrap(
      await this.sb.from("clinical_soap_notes").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export class SoapVersionRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: SoapVersionInsert): Promise<SoapVersionRow> {
    return unwrap(await this.sb.from("clinical_soap_versions").insert(row).select("*").single());
  }
  async listForNote(soapNoteId: string): Promise<SoapVersionRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_soap_versions")
        .select("*")
        .eq("soap_note_id", soapNoteId)
        .order("version_no", { ascending: false }),
    );
  }
  async getById(id: string): Promise<SoapVersionRow | null> {
    return unwrapMaybe(await this.sb.from("clinical_soap_versions").select("*").eq("id", id).maybeSingle());
  }
}

// ---------- Treatment plans -----------------------------------------------

export type TreatmentPlanRow = Tables<"clinical_treatment_plans">;
export type TreatmentPlanInsert = TablesInsert<"clinical_treatment_plans">;
export type TreatmentPlanUpdate = TablesUpdate<"clinical_treatment_plans">;

export class TreatmentPlanRepository {
  constructor(private readonly sb: SB) {}
  async upsert(row: TreatmentPlanInsert & { id?: string }): Promise<TreatmentPlanRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(
        await this.sb.from("clinical_treatment_plans").update(patch).eq("id", id).select("*").single(),
      );
    }
    return unwrap(await this.sb.from("clinical_treatment_plans").insert(row).select("*").single());
  }
  async update(id: string, patch: TreatmentPlanUpdate): Promise<TreatmentPlanRow> {
    return unwrap(
      await this.sb.from("clinical_treatment_plans").update(patch).eq("id", id).select("*").single(),
    );
  }
  async getById(id: string): Promise<TreatmentPlanRow | null> {
    return unwrapMaybe(await this.sb.from("clinical_treatment_plans").select("*").eq("id", id).maybeSingle());
  }
  async listForPatient(tenantId: string, patientId: string, limit = 50): Promise<TreatmentPlanRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_treatment_plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async listActiveForTenant(tenantId: string, limit = 100): Promise<TreatmentPlanRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_treatment_plans")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["draft", "active"])
        .order("updated_at", { ascending: false })
        .limit(limit),
    );
  }
}

// ---------- Prescriptions -------------------------------------------------

export type PrescriptionRow = Tables<"clinical_prescriptions">;
export type PrescriptionInsert = TablesInsert<"clinical_prescriptions">;
export type PrescriptionUpdate = TablesUpdate<"clinical_prescriptions">;
export type PrescriptionItemRow = Tables<"clinical_prescription_items">;
export type PrescriptionItemInsert = TablesInsert<"clinical_prescription_items">;

export class PrescriptionRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: PrescriptionInsert): Promise<PrescriptionRow> {
    return unwrap(await this.sb.from("clinical_prescriptions").insert(row).select("*").single());
  }
  async update(id: string, patch: PrescriptionUpdate): Promise<PrescriptionRow> {
    return unwrap(
      await this.sb.from("clinical_prescriptions").update(patch).eq("id", id).select("*").single(),
    );
  }
  async getById(id: string): Promise<PrescriptionRow | null> {
    return unwrapMaybe(await this.sb.from("clinical_prescriptions").select("*").eq("id", id).maybeSingle());
  }
  async listForPatient(tenantId: string, patientId: string, limit = 50): Promise<PrescriptionRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_prescriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async listRecentForTenant(tenantId: string, limit = 100): Promise<PrescriptionRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_prescriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
}

export class PrescriptionItemRepository {
  constructor(private readonly sb: SB) {}
  async listForPrescription(prescriptionId: string): Promise<PrescriptionItemRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_prescription_items")
        .select("*")
        .eq("prescription_id", prescriptionId)
        .order("position", { ascending: true }),
    );
  }
  async deleteForPrescription(prescriptionId: string): Promise<void> {
    const { error } = await this.sb
      .from("clinical_prescription_items")
      .delete()
      .eq("prescription_id", prescriptionId);
    if (error) throw new Error(error.message);
  }
  async insertMany(rows: PrescriptionItemInsert[]): Promise<PrescriptionItemRow[]> {
    if (!rows.length) return [];
    return unwrapList(
      await this.sb.from("clinical_prescription_items").insert(rows).select("*"),
    );
  }
}

// ---------- Media ---------------------------------------------------------

export type MediaRow = Tables<"clinical_media">;
export type MediaInsert = TablesInsert<"clinical_media">;
export type MediaUpdate = TablesUpdate<"clinical_media">;

export class ClinicalMediaRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: MediaInsert): Promise<MediaRow> {
    return unwrap(await this.sb.from("clinical_media").insert(row).select("*").single());
  }
  async update(id: string, patch: MediaUpdate): Promise<MediaRow> {
    return unwrap(await this.sb.from("clinical_media").update(patch).eq("id", id).select("*").single());
  }
  async getById(id: string): Promise<MediaRow | null> {
    return unwrapMaybe(await this.sb.from("clinical_media").select("*").eq("id", id).maybeSingle());
  }
  async listForPatient(tenantId: string, patientId: string, limit = 100): Promise<MediaRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_media")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async listRecentForTenant(tenantId: string, limit = 100): Promise<MediaRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_media")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
}

// ---------- Consents ------------------------------------------------------

export type ConsentRow = Tables<"clinical_consents">;
export type ConsentInsert = TablesInsert<"clinical_consents">;
export type ConsentUpdate = TablesUpdate<"clinical_consents">;

export class ClinicalConsentRepository {
  constructor(private readonly sb: SB) {}
  async upsert(row: ConsentInsert & { id?: string }): Promise<ConsentRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(
        await this.sb.from("clinical_consents").update(patch).eq("id", id).select("*").single(),
      );
    }
    return unwrap(await this.sb.from("clinical_consents").insert(row).select("*").single());
  }
  async listForPatient(tenantId: string, patientId: string): Promise<ConsentRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_consents")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
    );
  }
}

// ---------- Follow-ups ----------------------------------------------------

export type FollowupRow = Tables<"clinical_followups">;
export type FollowupInsert = TablesInsert<"clinical_followups">;
export type FollowupUpdate = TablesUpdate<"clinical_followups">;

export class ClinicalFollowupRepository {
  constructor(private readonly sb: SB) {}
  async upsert(row: FollowupInsert & { id?: string }): Promise<FollowupRow> {
    if (row.id) {
      const { id, ...patch } = row;
      return unwrap(await this.sb.from("clinical_followups").update(patch).eq("id", id).select("*").single());
    }
    return unwrap(await this.sb.from("clinical_followups").insert(row).select("*").single());
  }
  async listForPatient(tenantId: string, patientId: string): Promise<FollowupRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_followups")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("patient_id", patientId)
        .order("suggested_date", { ascending: true, nullsFirst: false }),
    );
  }
  async listPendingForTenant(tenantId: string, limit = 100): Promise<FollowupRow[]> {
    return unwrapList(
      await this.sb
        .from("clinical_followups")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("status", ["pending", "scheduled"])
        .order("suggested_date", { ascending: true, nullsFirst: false })
        .limit(limit),
    );
  }
}
