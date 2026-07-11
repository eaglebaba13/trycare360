/**
 * Clinical / EMR — Server Functions (Phase 2.5 Stage 2).
 *
 * All mutations flow through here. Every function:
 *   - uses requireSupabaseAuth (RLS enforces tenant + clinical permissions)
 *   - validates input via Zod schemas in ./validators
 *   - composes repositories + the encounter engine
 *   - reuses the existing Timeline, Workflow and Search primitives
 * No UI, no routes.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { CLINICAL_EVENTS } from "./events";
import { EncounterEngine, clinicalHelpers } from "./engine.server";
import { ClinicalContextLoader } from "./context-loader.server";
import {
  AllergyRepository,
  ClinicalKnowledgeRepository,
  EncounterRepository,
  FamilyHistoryRepository,
  LifestyleRepository,
  MedicalHistoryRepository,
  ParticipantRepository,
  ProblemRepository,
  ReferralRepository,
  SecondOpinionRepository,
  VitalsRepository,
} from "./repositories.server";
import {
  allergyUpsertSchema,
  clinicalContextSchema,
  encounterCloseSchema,
  encounterCreateSchema,
  encounterIdSchema,
  encounterUpdateSchema,
  familyHistoryUpsertSchema,
  lifestyleUpsertSchema,
  listKnowledgeSchema,
  medicalHistoryUpsertSchema,
  participantAddSchema,
  participantRemoveSchema,
  problemResolveSchema,
  problemUpsertSchema,
  referralCreateSchema,
  referralUpdateSchema,
  secondOpinionCreateSchema,
  secondOpinionRespondSchema,
  soapSaveSchema,
  vitalsRecordSchema,
} from "./validators";

// ============================================================
// KNOWLEDGE
// ============================================================

export const listClinicalKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listKnowledgeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ClinicalKnowledgeRepository(context.supabase);
    const rows = await repo.list(data.kind, data.tenantId, {
      search: data.search,
      activeOnly: data.activeOnly,
      limit: data.limit,
      offset: data.offset,
    });
    return { rows };
  });

// ============================================================
// ENCOUNTER
// ============================================================

export const createEncounter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => encounterCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new EncounterEngine(context.supabase);
    const { encounter, context: preload } = await engine.createEncounter({
      tenantId: data.tenantId,
      patientId: data.patientId,
      encounterType: data.encounterType,
      appointmentId: data.appointmentId ?? null,
      branchId: data.branchId ?? null,
      primaryDoctorId: data.primaryDoctorId ?? null,
      packageId: data.packageId ?? null,
      chiefComplaint: data.chiefComplaint ?? null,
      room: data.room ?? null,
      source: data.source ?? null,
      startedAt: data.startedAt ?? null,
      meta: data.meta,
      createdBy: context.userId,
    });
    return { encounter, context: preload };
  });

export const updateEncounter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => encounterUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new EncounterEngine(context.supabase);
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.chiefComplaint !== undefined) patch.chief_complaint = data.chiefComplaint;
    if (data.room !== undefined) patch.room = data.room;
    if (data.primaryDoctorId !== undefined) patch.primary_doctor_id = data.primaryDoctorId;
    if (data.branchId !== undefined) patch.branch_id = data.branchId;
    if (data.endedAt !== undefined) patch.ended_at = data.endedAt;
    if (data.meta !== undefined) patch.meta = data.meta as Json;
    const encounter = await engine.updateEncounter(data.tenantId, data.id, patch, context.userId);
    return { encounter };
  });

export const closeEncounter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => encounterCloseSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new EncounterEngine(context.supabase);
    const encounter = await engine.updateEncounter(
      data.tenantId,
      data.id,
      { status: "closed", ended_at: data.endedAt ?? new Date().toISOString() },
      context.userId,
    );
    return { encounter };
  });

export const getEncounter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => encounterIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new EncounterRepository(context.supabase);
    const encounter = await repo.getById(data.id);
    if (!encounter || encounter.tenant_id !== data.tenantId) throw new Error("Not found");
    return { encounter };
  });

export const listEncountersForPatient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    encounterIdSchema.transform((v) => ({ tenantId: v.tenantId, patientId: v.id })).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new EncounterRepository(context.supabase);
    const rows = await repo.listForPatient(data.tenantId, data.patientId);
    return { rows };
  });

// ============================================================
// SOAP (stored on clinical_encounters.meta.soap; templated)
// ============================================================

export const saveSoap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soapSaveSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new EncounterRepository(context.supabase);
    const encounter = await repo.getById(data.encounterId);
    if (!encounter || encounter.tenant_id !== data.tenantId) throw new Error("Not found");

    const existingMeta = (encounter.meta ?? {}) as Record<string, unknown>;
    const soap = {
      template_code: data.templateCode ?? null,
      subjective: data.subjective ?? {},
      objective: data.objective ?? {},
      assessment: data.assessment ?? {},
      plan: data.plan ?? {},
      updated_at: new Date().toISOString(),
      updated_by: context.userId,
    };
    const nextMeta = { ...existingMeta, soap } as Json;
    const updated = await repo.update(data.encounterId, { meta: nextMeta });

    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: encounter.patient_id,
        eventType: "clinical.soap.saved",
        title: "SOAP note saved",
        meta: { encounter_id: data.encounterId, template_code: data.templateCode ?? null },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.SOAP_SAVED,
        { encounter_id: data.encounterId, patient_id: encounter.patient_id },
        { entity: "clinical_encounter", id: data.encounterId },
      ),
    ]);
    return { encounter: updated };
  });

// ============================================================
// PARTICIPANTS
// ============================================================

export const addEncounterParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => participantAddSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ParticipantRepository(context.supabase);
    const row = await repo.insert({
      tenant_id: data.tenantId,
      encounter_id: data.encounterId,
      person_id: data.personId,
      role: data.role,
      source_tenant_id: data.sourceTenantId ?? null,
      joined_at: data.joinedAt ?? new Date().toISOString(),
      notes: data.notes ?? null,
    });
    await clinicalHelpers.emitEvent(
      context.supabase,
      data.tenantId,
      CLINICAL_EVENTS.PARTICIPANT_ADDED,
      { encounter_id: data.encounterId, person_id: data.personId, role: data.role },
      { entity: "clinical_encounter", id: data.encounterId },
    );
    return { participant: row };
  });

export const removeEncounterParticipant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => participantRemoveSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ParticipantRepository(context.supabase);
    const row = await repo.markLeft(data.id, data.leftAt ?? new Date().toISOString());
    await clinicalHelpers.emitEvent(
      context.supabase,
      data.tenantId,
      CLINICAL_EVENTS.PARTICIPANT_REMOVED,
      { encounter_id: row.encounter_id, participant_id: row.id, person_id: row.person_id },
      { entity: "clinical_encounter", id: row.encounter_id },
    );
    return { participant: row };
  });

// ============================================================
// PROBLEMS / DIAGNOSIS
// ============================================================

export const upsertProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => problemUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ProblemRepository(context.supabase);
    const isNew = !data.id;
    const row = await repo.upsert({
      id: data.id,
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      encounter_id: data.encounterId ?? null,
      category: data.category,
      display: data.display,
      code: data.code ?? null,
      code_system_id: data.codeSystemId ?? null,
      severity: data.severity ?? null,
      status: data.status,
      onset_date: data.onsetDate ?? null,
      resolved_date: data.resolvedDate ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: isNew ? "clinical.problem.created" : "clinical.problem.updated",
        title: isNew ? `Problem added: ${data.display}` : `Problem updated: ${data.display}`,
        meta: { problem_id: row.id, encounter_id: data.encounterId ?? null },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        isNew ? CLINICAL_EVENTS.PROBLEM_CREATED : CLINICAL_EVENTS.PROBLEM_UPDATED,
        { problem_id: row.id, patient_id: data.patientId, display: data.display, status: data.status },
        { entity: "clinical_problem", id: row.id },
      ),
    ]);
    return { problem: row };
  });

export const resolveProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => problemResolveSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ProblemRepository(context.supabase);
    const row = await repo.update(data.id, {
      status: "resolved",
      resolved_date: data.resolvedDate ?? new Date().toISOString().slice(0, 10),
      notes: data.notes ?? undefined,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: row.patient_id,
        eventType: "clinical.problem.resolved",
        title: `Problem resolved: ${row.display}`,
        meta: { problem_id: row.id },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.PROBLEM_RESOLVED,
        { problem_id: row.id, patient_id: row.patient_id },
        { entity: "clinical_problem", id: row.id },
      ),
    ]);
    return { problem: row };
  });

// ============================================================
// VITALS
// ============================================================

export const recordVitals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vitalsRecordSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new VitalsRepository(context.supabase);
    const row = await repo.insert({
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      encounter_id: data.encounterId ?? null,
      measured_at: data.measuredAt ?? new Date().toISOString(),
      height_cm: data.heightCm ?? null,
      weight_kg: data.weightKg ?? null,
      bmi: data.bmi ?? null,
      waist_cm: data.waistCm ?? null,
      hip_cm: data.hipCm ?? null,
      bp_systolic: data.bpSystolic ?? null,
      bp_diastolic: data.bpDiastolic ?? null,
      heart_rate: data.heartRate ?? null,
      resp_rate: data.respRate ?? null,
      temperature_c: data.temperatureC ?? null,
      spo2: data.spo2 ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: "clinical.vitals.recorded",
        title: "Vitals recorded",
        meta: { vitals_id: row.id, encounter_id: data.encounterId ?? null },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.VITALS_RECORDED,
        { vitals_id: row.id, patient_id: data.patientId, encounter_id: data.encounterId ?? null },
        { entity: "clinical_vitals", id: row.id },
      ),
    ]);
    return { vitals: row };
  });

// ============================================================
// ALLERGIES
// ============================================================

export const upsertAllergy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => allergyUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AllergyRepository(context.supabase);
    const isNew = !data.id;
    const row = await repo.upsert({
      id: data.id,
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      substance: data.substance,
      category: data.category ?? null,
      severity: data.severity ?? null,
      reaction: data.reaction ?? null,
      status: data.status,
      onset_date: data.onsetDate ?? null,
      source: data.source ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: isNew ? "clinical.allergy.recorded" : "clinical.allergy.updated",
        title: isNew ? `Allergy recorded: ${data.substance}` : `Allergy updated: ${data.substance}`,
        meta: { allergy_id: row.id, severity: data.severity ?? null },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        isNew ? CLINICAL_EVENTS.ALLERGY_RECORDED : CLINICAL_EVENTS.ALLERGY_UPDATED,
        { allergy_id: row.id, patient_id: data.patientId, substance: data.substance },
        { entity: "clinical_allergy", id: row.id },
      ),
    ]);
    return { allergy: row };
  });

// ============================================================
// MEDICAL / FAMILY / LIFESTYLE HISTORY
// ============================================================

export const upsertMedicalHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => medicalHistoryUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new MedicalHistoryRepository(context.supabase);
    const row = await repo.upsert({
      id: data.id,
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      category: data.category,
      summary: data.summary,
      code: data.code ?? null,
      code_system_id: data.codeSystemId ?? null,
      event_date: data.eventDate ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: "clinical.medical_history.recorded",
        title: `Medical history: ${data.summary}`,
        meta: { medical_history_id: row.id, category: data.category },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.MEDICAL_HISTORY_RECORDED,
        { medical_history_id: row.id, patient_id: data.patientId, category: data.category },
        { entity: "clinical_medical_history", id: row.id },
      ),
    ]);
    return { record: row };
  });

export const upsertFamilyHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => familyHistoryUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new FamilyHistoryRepository(context.supabase);
    const row = await repo.upsert({
      id: data.id,
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      relation: data.relation,
      condition_display: data.conditionDisplay,
      code: data.code ?? null,
      code_system_id: data.codeSystemId ?? null,
      onset_age: data.onsetAge ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: "clinical.family_history.recorded",
        title: `Family history: ${data.conditionDisplay} (${data.relation})`,
        meta: { family_history_id: row.id },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.FAMILY_HISTORY_RECORDED,
        { family_history_id: row.id, patient_id: data.patientId, relation: data.relation },
        { entity: "clinical_family_history", id: row.id },
      ),
    ]);
    return { record: row };
  });

export const upsertLifestyleHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => lifestyleUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new LifestyleRepository(context.supabase);
    const row = await repo.upsert({
      id: data.id,
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      recorded_at: data.recordedAt ?? new Date().toISOString(),
      occupation: data.occupation ?? null,
      smoking: (data.smoking ?? null) as Json,
      alcohol: (data.alcohol ?? null) as Json,
      substance_use: (data.substanceUse ?? null) as Json,
      diet: (data.diet ?? null) as Json,
      exercise: (data.exercise ?? null) as Json,
      sleep: (data.sleep ?? null) as Json,
      stress: data.stress ?? null,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: "clinical.lifestyle.recorded",
        title: "Lifestyle history updated",
        meta: { lifestyle_id: row.id },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.LIFESTYLE_RECORDED,
        { lifestyle_id: row.id, patient_id: data.patientId },
        { entity: "clinical_lifestyle_history", id: row.id },
      ),
    ]);
    return { record: row };
  });

// ============================================================
// REFERRALS
// ============================================================

export const createReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => referralCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ReferralRepository(context.supabase);
    const row = await repo.insert({
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      reason: data.reason,
      source_encounter_id: data.sourceEncounterId ?? null,
      from_doctor_id: data.fromDoctorId ?? null,
      from_branch_id: data.fromBranchId ?? null,
      to_doctor_id: data.toDoctorId ?? null,
      to_branch_id: data.toBranchId ?? null,
      to_tenant_id: data.toTenantId ?? null,
      external_provider: data.externalProvider ?? null,
      priority: data.priority,
      notes: data.notes ?? null,
      created_by: context.userId,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: "clinical.referral.created",
        title: `Referral created (${data.priority})`,
        body: data.reason,
        meta: { referral_id: row.id },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.REFERRAL_CREATED,
        {
          referral_id: row.id,
          patient_id: data.patientId,
          to_doctor_id: data.toDoctorId ?? null,
          to_tenant_id: data.toTenantId ?? null,
          priority: data.priority,
        },
        { entity: "clinical_referral", id: row.id },
      ),
    ]);
    return { referral: row };
  });

export const updateReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => referralUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ReferralRepository(context.supabase);
    const patch: Record<string, unknown> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    const row = await repo.update(data.id, patch);
    await clinicalHelpers.emitEvent(
      context.supabase,
      data.tenantId,
      CLINICAL_EVENTS.REFERRAL_UPDATED,
      { referral_id: row.id, patient_id: row.patient_id, status: row.status },
      { entity: "clinical_referral", id: row.id },
    );
    return { referral: row };
  });

// ============================================================
// SECOND OPINIONS
// ============================================================

export const requestSecondOpinion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => secondOpinionCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new SecondOpinionRepository(context.supabase);
    const row = await repo.insert({
      tenant_id: data.tenantId,
      patient_id: data.patientId,
      question: data.question,
      source_encounter_id: data.sourceEncounterId ?? null,
      requested_by_doctor_id: data.requestedByDoctorId ?? null,
      opinion_doctor_id: data.opinionDoctorId ?? null,
      opinion_tenant_id: data.opinionTenantId ?? null,
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: data.patientId,
        eventType: "clinical.second_opinion.requested",
        title: "Second opinion requested",
        body: data.question,
        meta: { second_opinion_id: row.id },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.SECOND_OPINION_REQUESTED,
        {
          second_opinion_id: row.id,
          patient_id: data.patientId,
          opinion_doctor_id: data.opinionDoctorId ?? null,
          opinion_tenant_id: data.opinionTenantId ?? null,
        },
        { entity: "clinical_second_opinion", id: row.id },
      ),
    ]);
    return { secondOpinion: row };
  });

export const respondSecondOpinion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => secondOpinionRespondSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new SecondOpinionRepository(context.supabase);
    const row = await repo.update(data.id, {
      response: data.response,
      answered_at: data.answeredAt ?? new Date().toISOString(),
      status: "completed",
    });
    await Promise.all([
      clinicalHelpers.logTimeline(context.supabase, {
        tenantId: data.tenantId,
        entityType: "person",
        entityId: row.patient_id,
        eventType: "clinical.second_opinion.completed",
        title: "Second opinion completed",
        meta: { second_opinion_id: row.id },
      }),
      clinicalHelpers.emitEvent(
        context.supabase,
        data.tenantId,
        CLINICAL_EVENTS.SECOND_OPINION_COMPLETED,
        { second_opinion_id: row.id, patient_id: row.patient_id },
        { entity: "clinical_second_opinion", id: row.id },
      ),
    ]);
    return { secondOpinion: row };
  });

// ============================================================
// CLINICAL CONTEXT LOADER (single-call assembly)
// ============================================================

export const getClinicalContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => clinicalContextSchema.parse(d))
  .handler(async ({ context, data }) => {
    const loader = new ClinicalContextLoader(context.supabase);
    return loader.getClinicalContext({
      tenantId: data.tenantId,
      personId: data.personId,
      userId: context.userId,
      encounterId: data.encounterId ?? null,
      historyLimit: data.historyLimit,
    });
  });
