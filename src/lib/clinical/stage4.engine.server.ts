/**
 * Clinical / EMR — Stage 4 engine services (server-only).
 *
 * All Stage 4 writes flow through these services. Every service composes:
 *   Persist → Timeline (log_timeline_event) → Workflow (emit_automation_event)
 *
 * No parallel APIs. No duplicate event/timeline/search primitives — the
 * existing Stage 2 `clinicalHelpers` are reused.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { CLINICAL_EVENTS, type ClinicalEvent } from "./events";
import { clinicalHelpers } from "./engine.server";
import { AllergyRepository } from "./repositories.server";
import {
  ClinicalConsentRepository,
  ClinicalFollowupRepository,
  ClinicalMediaRepository,
  PrescriptionItemRepository,
  PrescriptionRepository,
  SoapNoteRepository,
  SoapVersionRepository,
  TreatmentPlanRepository,
  type MediaInsert,
  type MediaRow,
  type PrescriptionItemInsert,
  type PrescriptionItemRow,
  type PrescriptionRow,
  type SoapNoteRow,
  type SoapVersionRow,
  type TreatmentPlanRow,
} from "./stage4.repositories.server";

type SB = SupabaseClient<Database>;
type Actor = string | null | undefined;

function emit(
  sb: SB,
  tenantId: string,
  event: ClinicalEvent,
  payload: Record<string, unknown>,
  entityRef?: Record<string, unknown> | null,
): Promise<void> {
  return clinicalHelpers.emitEvent(sb, tenantId, event, payload, entityRef ?? null);
}

function timeline(
  sb: SB,
  args: {
    tenantId: string;
    patientId: string;
    eventType: string;
    title: string;
    body?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  return clinicalHelpers.logTimeline(sb, {
    tenantId: args.tenantId,
    entityType: "person",
    entityId: args.patientId,
    eventType: args.eventType,
    title: args.title,
    body: args.body ?? null,
    meta: args.meta ?? {},
  });
}

// ---------------------------------------------------------------------------
// Versioned SOAP engine
// ---------------------------------------------------------------------------

export interface SoapVersionPayload {
  templateCode?: string | null;
  subjective?: Record<string, unknown>;
  objective?: Record<string, unknown>;
  assessment?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  isAutosave?: boolean;
}

export class SoapEngine {
  private readonly notes: SoapNoteRepository;
  private readonly versions: SoapVersionRepository;
  constructor(private readonly sb: SB) {
    this.notes = new SoapNoteRepository(sb);
    this.versions = new SoapVersionRepository(sb);
  }

  private async ensureNote(args: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    templateCode?: string | null;
    actor: Actor;
  }): Promise<SoapNoteRow> {
    const existing = await this.notes.getByEncounter(args.encounterId);
    if (existing) return existing;
    return this.notes.insert({
      tenant_id: args.tenantId,
      encounter_id: args.encounterId,
      patient_id: args.patientId,
      template_code: args.templateCode ?? null,
      status: "draft",
      created_by: args.actor ?? null,
    });
  }

  async saveVersion(args: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    actor: Actor;
    payload: SoapVersionPayload;
  }): Promise<{ note: SoapNoteRow; version: SoapVersionRow }> {
    const note = await this.ensureNote({
      tenantId: args.tenantId,
      encounterId: args.encounterId,
      patientId: args.patientId,
      templateCode: args.payload.templateCode,
      actor: args.actor,
    });
    const nextVersionNo = (note.version_count ?? 0) + 1;
    const version = await this.versions.insert({
      tenant_id: args.tenantId,
      soap_note_id: note.id,
      version_no: nextVersionNo,
      template_code: args.payload.templateCode ?? note.template_code ?? null,
      subjective: (args.payload.subjective ?? {}) as Json,
      objective: (args.payload.objective ?? {}) as Json,
      assessment: (args.payload.assessment ?? {}) as Json,
      plan: (args.payload.plan ?? {}) as Json,
      is_autosave: args.payload.isAutosave ?? false,
      saved_by: args.actor ?? null,
      saved_at: new Date().toISOString(),
    });
    const updatedNote = await this.notes.update(note.id, {
      current_version_id: version.id,
      version_count: nextVersionNo,
      template_code: version.template_code,
      status: note.status === "signed" ? "amended" : "draft",
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: "clinical.soap.versioned",
        title: `SOAP v${nextVersionNo} saved${args.payload.isAutosave ? " (autosave)" : ""}`,
        meta: { encounter_id: args.encounterId, soap_note_id: note.id, version_id: version.id, version_no: nextVersionNo },
      }),
      emit(
        this.sb,
        args.tenantId,
        CLINICAL_EVENTS.SOAP_VERSIONED,
        {
          soap_note_id: note.id,
          version_id: version.id,
          version_no: nextVersionNo,
          encounter_id: args.encounterId,
          patient_id: args.patientId,
          is_autosave: args.payload.isAutosave ?? false,
        },
        { entity: "clinical_soap_note", id: note.id },
      ),
    ]);
    return { note: updatedNote, version };
  }

  async restoreVersion(args: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    versionId: string;
    actor: Actor;
  }): Promise<{ note: SoapNoteRow; version: SoapVersionRow }> {
    const source = await this.versions.getById(args.versionId);
    if (!source || source.tenant_id !== args.tenantId) throw new Error("Version not found");
    const note = await this.ensureNote({
      tenantId: args.tenantId,
      encounterId: args.encounterId,
      patientId: args.patientId,
      templateCode: source.template_code,
      actor: args.actor,
    });
    if (source.soap_note_id !== note.id) throw new Error("Version does not belong to this encounter");
    const nextVersionNo = (note.version_count ?? 0) + 1;
    const version = await this.versions.insert({
      tenant_id: args.tenantId,
      soap_note_id: note.id,
      version_no: nextVersionNo,
      template_code: source.template_code,
      subjective: source.subjective,
      objective: source.objective,
      assessment: source.assessment,
      plan: source.plan,
      is_autosave: false,
      restored_from_version_id: source.id,
      saved_by: args.actor ?? null,
      saved_at: new Date().toISOString(),
    });
    const updatedNote = await this.notes.update(note.id, {
      current_version_id: version.id,
      version_count: nextVersionNo,
      status: "amended",
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: "clinical.soap.restored",
        title: `SOAP restored from v${source.version_no}`,
        meta: { encounter_id: args.encounterId, restored_from: source.id, new_version: version.id },
      }),
      emit(
        this.sb,
        args.tenantId,
        CLINICAL_EVENTS.SOAP_RESTORED,
        {
          soap_note_id: note.id,
          restored_from_version_id: source.id,
          new_version_id: version.id,
          encounter_id: args.encounterId,
          patient_id: args.patientId,
        },
        { entity: "clinical_soap_note", id: note.id },
      ),
    ]);
    return { note: updatedNote, version };
  }

  async sign(args: {
    tenantId: string;
    encounterId: string;
    patientId: string;
    actor: Actor;
    signatureNote?: string | null;
  }): Promise<SoapNoteRow> {
    const existing = await this.notes.getByEncounter(args.encounterId);
    if (!existing) throw new Error("No SOAP note to sign");
    const signedAt = new Date().toISOString();
    const updated = await this.notes.update(existing.id, {
      status: "signed",
      signed_by: args.actor ?? null,
      signed_at: signedAt,
      signature_meta: {
        signed_by: args.actor ?? null,
        signed_at: signedAt,
        note: args.signatureNote ?? null,
        method: "electronic_placeholder",
      } as Json,
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: "clinical.soap.signed",
        title: "SOAP note signed",
        meta: { encounter_id: args.encounterId, soap_note_id: existing.id },
      }),
      emit(
        this.sb,
        args.tenantId,
        CLINICAL_EVENTS.SOAP_SIGNED,
        { soap_note_id: existing.id, encounter_id: args.encounterId, patient_id: args.patientId },
        { entity: "clinical_soap_note", id: existing.id },
      ),
    ]);
    return updated;
  }

  async loadForEncounter(encounterId: string): Promise<{
    note: SoapNoteRow | null;
    current: SoapVersionRow | null;
    versions: SoapVersionRow[];
  }> {
    const note = await this.notes.getByEncounter(encounterId);
    if (!note) return { note: null, current: null, versions: [] };
    const versions = await this.versions.listForNote(note.id);
    const current = note.current_version_id
      ? versions.find((v) => v.id === note.current_version_id) ?? null
      : versions[0] ?? null;
    return { note, current, versions };
  }
}

// ---------------------------------------------------------------------------
// Treatment plan engine
// ---------------------------------------------------------------------------

export class TreatmentPlanEngine {
  private readonly plans: TreatmentPlanRepository;
  constructor(private readonly sb: SB) {
    this.plans = new TreatmentPlanRepository(sb);
  }

  async upsert(args: {
    tenantId: string;
    id?: string;
    patientId: string;
    encounterId?: string | null;
    protocolId?: string | null;
    title: string;
    diagnosis?: string | null;
    goals: unknown[];
    milestones: unknown[];
    instructions?: string | null;
    expectedOutcomes?: string | null;
    contraindications?: string | null;
    reviewSchedule?: Record<string, unknown>;
    progress?: Record<string, unknown>;
    status: "draft" | "active" | "completed" | "cancelled";
    startDate?: string | null;
    endDate?: string | null;
    actor: Actor;
  }): Promise<TreatmentPlanRow> {
    const isNew = !args.id;
    const row = await this.plans.upsert({
      id: args.id,
      tenant_id: args.tenantId,
      patient_id: args.patientId,
      encounter_id: args.encounterId ?? null,
      protocol_id: args.protocolId ?? null,
      title: args.title,
      diagnosis: args.diagnosis ?? null,
      goals: args.goals as Json,
      milestones: args.milestones as Json,
      instructions: args.instructions ?? null,
      expected_outcomes: args.expectedOutcomes ?? null,
      contraindications: args.contraindications ?? null,
      review_schedule: (args.reviewSchedule ?? {}) as Json,
      progress: (args.progress ?? {}) as Json,
      status: args.status,
      start_date: args.startDate ?? null,
      end_date: args.endDate ?? null,
      created_by: args.actor ?? null,
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: isNew ? "clinical.treatment_plan.created" : "clinical.treatment_plan.updated",
        title: isNew ? `Treatment plan created: ${row.title}` : `Treatment plan updated: ${row.title}`,
        meta: { treatment_plan_id: row.id, status: row.status },
      }),
      emit(
        this.sb,
        args.tenantId,
        isNew ? CLINICAL_EVENTS.TREATMENT_PLAN_CREATED : CLINICAL_EVENTS.TREATMENT_PLAN_UPDATED,
        {
          treatment_plan_id: row.id,
          patient_id: args.patientId,
          encounter_id: args.encounterId ?? null,
          status: row.status,
        },
        { entity: "clinical_treatment_plan", id: row.id },
      ),
    ]);
    return row;
  }

  async setStatus(args: {
    tenantId: string;
    id: string;
    status: "draft" | "active" | "completed" | "cancelled";
    actor: Actor;
  }): Promise<TreatmentPlanRow> {
    const existing = await this.plans.getById(args.id);
    if (!existing || existing.tenant_id !== args.tenantId) throw new Error("Treatment plan not found");
    const row = await this.plans.update(args.id, { status: args.status });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: row.patient_id,
        eventType: "clinical.treatment_plan.updated",
        title: `Treatment plan → ${args.status}: ${row.title}`,
        meta: { treatment_plan_id: row.id, status: args.status },
      }),
      emit(
        this.sb,
        args.tenantId,
        CLINICAL_EVENTS.TREATMENT_PLAN_UPDATED,
        { treatment_plan_id: row.id, patient_id: row.patient_id, status: args.status },
        { entity: "clinical_treatment_plan", id: row.id },
      ),
    ]);
    return row;
  }
}

// ---------------------------------------------------------------------------
// Prescription engine
// ---------------------------------------------------------------------------

export interface PrescriptionItemPayload {
  id?: string;
  position: number;
  medication: string;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  instructions?: string | null;
  refills: number;
  warnings: string[];
}

export class PrescriptionEngine {
  private readonly headers: PrescriptionRepository;
  private readonly items: PrescriptionItemRepository;
  private readonly allergies: AllergyRepository;
  constructor(private readonly sb: SB) {
    this.headers = new PrescriptionRepository(sb);
    this.items = new PrescriptionItemRepository(sb);
    this.allergies = new AllergyRepository(sb);
  }

  private async computeAllergyFlags(
    tenantId: string,
    patientId: string,
    items: PrescriptionItemPayload[],
  ): Promise<Record<number, string[]>> {
    const allergies = await this.allergies.listActive(tenantId, patientId);
    const substances = allergies.map((a) => a.substance.toLowerCase());
    const flags: Record<number, string[]> = {};
    items.forEach((it, idx) => {
      const med = it.medication.toLowerCase();
      const hits = substances.filter((s) => s && med.includes(s));
      if (hits.length) flags[idx] = hits;
    });
    return flags;
  }

  async upsert(args: {
    tenantId: string;
    id?: string;
    patientId: string;
    encounterId?: string | null;
    treatmentPlanId?: string | null;
    notes?: string | null;
    status: "draft" | "issued" | "cancelled" | "superseded";
    items: PrescriptionItemPayload[];
    actor: Actor;
  }): Promise<{ prescription: PrescriptionRow; items: PrescriptionItemRow[]; allergyFlags: Record<number, string[]> }> {
    const flags = await this.computeAllergyFlags(args.tenantId, args.patientId, args.items);

    let header: PrescriptionRow;
    const isNew = !args.id;
    if (args.id) {
      header = await this.headers.update(args.id, {
        notes: args.notes ?? null,
        status: args.status,
        treatment_plan_id: args.treatmentPlanId ?? null,
        encounter_id: args.encounterId ?? null,
      });
    } else {
      header = await this.headers.insert({
        tenant_id: args.tenantId,
        patient_id: args.patientId,
        encounter_id: args.encounterId ?? null,
        treatment_plan_id: args.treatmentPlanId ?? null,
        notes: args.notes ?? null,
        status: args.status,
        created_by: args.actor ?? null,
        prescribed_by: args.actor ?? null,
      });
    }

    await this.items.deleteForPrescription(header.id);
    const rows: PrescriptionItemInsert[] = args.items.map((it, idx) => ({
      tenant_id: args.tenantId,
      prescription_id: header.id,
      position: it.position ?? idx,
      medication: it.medication,
      dose: it.dose ?? null,
      frequency: it.frequency ?? null,
      duration: it.duration ?? null,
      route: it.route ?? null,
      instructions: it.instructions ?? null,
      refills: it.refills ?? 0,
      warnings: (it.warnings ?? []) as Json,
      allergy_flags: (flags[idx] ?? []) as Json,
      interaction_flags: [] as Json,
    }));
    const inserted = await this.items.insertMany(rows);

    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: isNew ? "clinical.prescription.created" : "clinical.prescription.updated",
        title: isNew ? "Prescription created" : "Prescription updated",
        meta: {
          prescription_id: header.id,
          encounter_id: args.encounterId ?? null,
          status: header.status,
          item_count: inserted.length,
        },
      }),
      emit(
        this.sb,
        args.tenantId,
        isNew ? CLINICAL_EVENTS.PRESCRIPTION_CREATED : CLINICAL_EVENTS.PRESCRIPTION_UPDATED,
        {
          prescription_id: header.id,
          patient_id: args.patientId,
          status: header.status,
          allergy_flag_count: Object.values(flags).flat().length,
        },
        { entity: "clinical_prescription", id: header.id },
      ),
    ]);
    return { prescription: header, items: inserted, allergyFlags: flags };
  }

  async issue(args: {
    tenantId: string;
    id: string;
    actor: Actor;
    signatureNote?: string | null;
  }): Promise<PrescriptionRow> {
    const existing = await this.headers.getById(args.id);
    if (!existing || existing.tenant_id !== args.tenantId) throw new Error("Prescription not found");
    const now = new Date().toISOString();
    const row = await this.headers.update(args.id, {
      status: "issued",
      prescribed_at: now,
      prescribed_by: args.actor ?? existing.prescribed_by ?? null,
      signature_meta: {
        signed_by: args.actor ?? null,
        signed_at: now,
        note: args.signatureNote ?? null,
        method: "electronic_placeholder",
      } as Json,
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: row.patient_id,
        eventType: "clinical.prescription.issued",
        title: "Prescription issued",
        meta: { prescription_id: row.id },
      }),
      emit(
        this.sb,
        args.tenantId,
        CLINICAL_EVENTS.PRESCRIPTION_ISSUED,
        { prescription_id: row.id, patient_id: row.patient_id },
        { entity: "clinical_prescription", id: row.id },
      ),
    ]);
    return row;
  }
}

// ---------------------------------------------------------------------------
// Clinical media engine
// ---------------------------------------------------------------------------

export class ClinicalMediaEngine {
  private readonly repo: ClinicalMediaRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ClinicalMediaRepository(sb);
  }

  async register(args: {
    tenantId: string;
    patientId: string;
    encounterId?: string | null;
    parentMediaId?: string | null;
    category: MediaInsert["category"];
    title?: string | null;
    description?: string | null;
    storagePath: string;
    mime?: string | null;
    sizeBytes?: number | null;
    takenAt?: string | null;
    bodyRegion?: string | null;
    annotations?: unknown[];
    actor: Actor;
  }): Promise<MediaRow> {
    let versionNo = 1;
    if (args.parentMediaId) {
      const parent = await this.repo.getById(args.parentMediaId);
      if (parent && parent.tenant_id === args.tenantId) {
        versionNo = (parent.version_no ?? 1) + 1;
      }
    }
    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      patient_id: args.patientId,
      encounter_id: args.encounterId ?? null,
      parent_media_id: args.parentMediaId ?? null,
      category: args.category,
      title: args.title ?? null,
      description: args.description ?? null,
      storage_bucket: "clinical-media",
      storage_path: args.storagePath,
      mime: args.mime ?? null,
      size_bytes: args.sizeBytes ?? null,
      taken_at: args.takenAt ?? null,
      body_region: args.bodyRegion ?? null,
      annotations: (args.annotations ?? []) as Json,
      version_no: versionNo,
      is_private: true,
      uploaded_by: args.actor ?? null,
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: "clinical.media.uploaded",
        title: `Clinical media uploaded (${row.category})`,
        meta: {
          media_id: row.id,
          category: row.category,
          encounter_id: args.encounterId ?? null,
          version_no: versionNo,
        },
      }),
      emit(
        this.sb,
        args.tenantId,
        CLINICAL_EVENTS.MEDIA_UPLOADED,
        {
          media_id: row.id,
          patient_id: args.patientId,
          category: row.category,
          version_no: versionNo,
        },
        { entity: "clinical_media", id: row.id },
      ),
    ]);
    return row;
  }

  async createSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string | null> {
    const { data, error } = await this.sb.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw new Error(error.message);
    return data?.signedUrl ?? null;
  }
}

// ---------------------------------------------------------------------------
// Consent engine
// ---------------------------------------------------------------------------

export class ClinicalConsentEngine {
  private readonly repo: ClinicalConsentRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ClinicalConsentRepository(sb);
  }

  async upsert(args: {
    tenantId: string;
    id?: string;
    patientId: string;
    encounterId?: string | null;
    templateId?: string | null;
    templateCode?: string | null;
    templateVersion?: string | null;
    status: "pending" | "accepted" | "declined" | "signed" | "revoked";
    actorPersonId?: string | null;
    actorRole?: string | null;
    signedAt?: string | null;
    notes?: string | null;
    signatureNote?: string | null;
    actor: Actor;
  }) {
    const isNew = !args.id;
    const signedAt =
      args.status === "signed" ? args.signedAt ?? new Date().toISOString() : args.signedAt ?? null;
    const signatureMeta =
      args.status === "signed"
        ? ({
            signed_by: args.actor ?? null,
            signed_at: signedAt,
            note: args.signatureNote ?? null,
            method: "electronic_placeholder",
          } as Json)
        : ({} as Json);
    const row = await this.repo.upsert({
      id: args.id,
      tenant_id: args.tenantId,
      patient_id: args.patientId,
      encounter_id: args.encounterId ?? null,
      template_id: args.templateId ?? null,
      template_code: args.templateCode ?? null,
      template_version: args.templateVersion ?? null,
      status: args.status,
      actor_person_id: args.actorPersonId ?? null,
      actor_role: args.actorRole ?? null,
      signed_at: signedAt,
      signature_meta: signatureMeta,
      notes: args.notes ?? null,
      created_by: args.actor ?? null,
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: isNew ? "clinical.consent.recorded" : "clinical.consent.updated",
        title: `Consent ${args.status}${args.templateCode ? ` (${args.templateCode})` : ""}`,
        meta: { consent_id: row.id, status: args.status, template_code: args.templateCode ?? null },
      }),
      emit(
        this.sb,
        args.tenantId,
        isNew ? CLINICAL_EVENTS.CONSENT_RECORDED : CLINICAL_EVENTS.CONSENT_UPDATED,
        {
          consent_id: row.id,
          patient_id: args.patientId,
          status: args.status,
          template_id: args.templateId ?? null,
        },
        { entity: "clinical_consent", id: row.id },
      ),
    ]);
    return row;
  }
}

// ---------------------------------------------------------------------------
// Follow-up engine
// ---------------------------------------------------------------------------

export class ClinicalFollowupEngine {
  private readonly repo: ClinicalFollowupRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ClinicalFollowupRepository(sb);
  }

  async upsert(args: {
    tenantId: string;
    id?: string;
    patientId: string;
    encounterId?: string | null;
    treatmentPlanId?: string | null;
    suggestedIntervalDays?: number | null;
    suggestedDate?: string | null;
    reason: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: "pending" | "scheduled" | "completed" | "cancelled";
    notes?: string | null;
    actor: Actor;
  }) {
    const isNew = !args.id;
    const row = await this.repo.upsert({
      id: args.id,
      tenant_id: args.tenantId,
      patient_id: args.patientId,
      encounter_id: args.encounterId ?? null,
      treatment_plan_id: args.treatmentPlanId ?? null,
      suggested_interval_days: args.suggestedIntervalDays ?? null,
      suggested_date: args.suggestedDate ?? null,
      reason: args.reason,
      priority: args.priority,
      status: args.status,
      notes: args.notes ?? null,
      created_by: args.actor ?? null,
    });
    await Promise.all([
      timeline(this.sb, {
        tenantId: args.tenantId,
        patientId: args.patientId,
        eventType: isNew ? "clinical.followup.created" : "clinical.followup.updated",
        title: `Follow-up ${args.status} (${args.priority})`,
        body: args.reason,
        meta: {
          followup_id: row.id,
          status: args.status,
          suggested_date: args.suggestedDate ?? null,
        },
      }),
      emit(
        this.sb,
        args.tenantId,
        isNew ? CLINICAL_EVENTS.FOLLOWUP_CREATED : CLINICAL_EVENTS.FOLLOWUP_UPDATED,
        {
          followup_id: row.id,
          patient_id: args.patientId,
          treatment_plan_id: args.treatmentPlanId ?? null,
          priority: args.priority,
          status: args.status,
        },
        { entity: "clinical_followup", id: row.id },
      ),
    ]);
    return row;
  }
}
