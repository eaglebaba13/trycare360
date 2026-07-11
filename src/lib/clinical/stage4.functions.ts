/**
 * Clinical / EMR — Stage 4 Server Functions.
 *
 * Every mutation:
 *   - uses requireSupabaseAuth (RLS enforces tenant + clinical permissions)
 *   - validates input via Zod schemas in ./stage4.validators
 *   - composes Stage 4 engines
 *   - reuses the existing Timeline, Workflow, Search primitives (via engines)
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  ClinicalConsentEngine,
  ClinicalFollowupEngine,
  ClinicalMediaEngine,
  PrescriptionEngine,
  SoapEngine,
  TreatmentPlanEngine,
} from "./stage4.engine.server";
import {
  ClinicalConsentRepository,
  ClinicalFollowupRepository,
  ClinicalMediaRepository,
  PrescriptionItemRepository,
  PrescriptionRepository,
  SoapNoteRepository,
  TreatmentPlanRepository,
} from "./stage4.repositories.server";
import { EncounterRepository } from "./repositories.server";
import { tenantId as tenantIdSchema } from "./validators";
import {
  consentUpsertSchema,
  followupUpsertSchema,
  listByPatientSchema,
  mediaCreateSchema,
  mediaIdSchema,
  mediaSignedUrlSchema,
  prescriptionIssueSchema,
  prescriptionUpsertSchema,
  soapNoteIdSchema,
  soapSaveVersionSchema,
  soapSignSchema,
  soapVersionIdSchema,
  treatmentPlanStatusSchema,
  treatmentPlanUpsertSchema,
} from "./stage4.validators";

const tenantOnlySchema = z.object({
  tenantId: tenantIdSchema,
  limit: z.number().int().positive().max(200).default(100),
});

async function requireEncounterPatient(
  sb: SupabaseClient<Database>,
  tenantId: string,
  encounterId: string,
): Promise<string> {
  const enc = await new EncounterRepository(sb).getById(encounterId);
  if (!enc || enc.tenant_id !== tenantId) throw new Error("Encounter not found");
  return enc.patient_id;
}

// ============================================================
// SOAP (versioned)
// ============================================================

export const saveSoapVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soapSaveVersionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const patientId = await requireEncounterPatient(context.supabase, data.tenantId, data.encounterId);
    const engine = new SoapEngine(context.supabase);
    return engine.saveVersion({
      tenantId: data.tenantId,
      encounterId: data.encounterId,
      patientId,
      actor: context.userId,
      payload: {
        templateCode: data.templateCode ?? null,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        isAutosave: data.isAutosave,
      },
    });
  });

export const getSoapNote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soapNoteIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SoapEngine(context.supabase);
    return engine.loadForEncounter(data.encounterId);
  });

export const restoreSoapVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soapVersionIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const patientId = await requireEncounterPatient(context.supabase, data.tenantId, data.encounterId);
    const engine = new SoapEngine(context.supabase);
    return engine.restoreVersion({
      tenantId: data.tenantId,
      encounterId: data.encounterId,
      patientId,
      versionId: data.versionId,
      actor: context.userId,
    });
  });

export const signSoapNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soapSignSchema.parse(d))
  .handler(async ({ context, data }) => {
    const patientId = await requireEncounterPatient(context.supabase, data.tenantId, data.encounterId);
    const engine = new SoapEngine(context.supabase);
    const note = await engine.sign({
      tenantId: data.tenantId,
      encounterId: data.encounterId,
      patientId,
      actor: context.userId,
      signatureNote: data.signatureNote ?? null,
    });
    return { note };
  });

// ============================================================
// TREATMENT PLANS
// ============================================================

export const upsertTreatmentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => treatmentPlanUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new TreatmentPlanEngine(context.supabase);
    const plan = await engine.upsert({
      tenantId: data.tenantId,
      id: data.id,
      patientId: data.patientId,
      encounterId: data.encounterId ?? null,
      protocolId: data.protocolId ?? null,
      title: data.title,
      diagnosis: data.diagnosis ?? null,
      goals: data.goals ?? [],
      milestones: data.milestones ?? [],
      instructions: data.instructions ?? null,
      expectedOutcomes: data.expectedOutcomes ?? null,
      contraindications: data.contraindications ?? null,
      reviewSchedule: data.reviewSchedule ?? {},
      progress: data.progress ?? {},
      status: data.status,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      actor: context.userId,
    });
    return { plan };
  });

export const setTreatmentPlanStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => treatmentPlanStatusSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new TreatmentPlanEngine(context.supabase);
    const plan = await engine.setStatus({
      tenantId: data.tenantId,
      id: data.id,
      status: data.status,
      actor: context.userId,
    });
    return { plan };
  });

export const listTreatmentPlansForPatient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listByPatientSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new TreatmentPlanRepository(context.supabase);
    const rows = await repo.listForPatient(data.tenantId, data.patientId, data.limit);
    return { rows };
  });

export const listActiveTreatmentPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantOnlySchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new TreatmentPlanRepository(context.supabase);
    const rows = await repo.listActiveForTenant(data.tenantId, data.limit);
    return { rows };
  });

// ============================================================
// PRESCRIPTIONS
// ============================================================

export const upsertPrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => prescriptionUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PrescriptionEngine(context.supabase);
    return engine.upsert({
      tenantId: data.tenantId,
      id: data.id,
      patientId: data.patientId,
      encounterId: data.encounterId ?? null,
      treatmentPlanId: data.treatmentPlanId ?? null,
      notes: data.notes ?? null,
      status: data.status,
      items: data.items.map((it, idx) => ({
        id: it.id,
        position: it.position ?? idx,
        medication: it.medication,
        dose: it.dose ?? null,
        frequency: it.frequency ?? null,
        duration: it.duration ?? null,
        route: it.route ?? null,
        instructions: it.instructions ?? null,
        refills: it.refills ?? 0,
        warnings: it.warnings ?? [],
      })),
      actor: context.userId,
    });
  });

export const issuePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => prescriptionIssueSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PrescriptionEngine(context.supabase);
    const prescription = await engine.issue({
      tenantId: data.tenantId,
      id: data.id,
      actor: context.userId,
      signatureNote: data.signatureNote ?? null,
    });
    return { prescription };
  });

export const listPrescriptionsForPatient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listByPatientSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PrescriptionRepository(context.supabase);
    const rows = await repo.listForPatient(data.tenantId, data.patientId, data.limit);
    return { rows };
  });

export const getPrescription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PrescriptionRepository(context.supabase);
    const items = new PrescriptionItemRepository(context.supabase);
    const header = await repo.getById(data.id);
    if (!header || header.tenant_id !== data.tenantId) throw new Error("Not found");
    const rows = await items.listForPrescription(header.id);
    return { prescription: header, items: rows };
  });

// ============================================================
// CLINICAL MEDIA
// ============================================================

export const registerClinicalMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ClinicalMediaEngine(context.supabase);
    const media = await engine.register({
      tenantId: data.tenantId,
      patientId: data.patientId,
      encounterId: data.encounterId ?? null,
      parentMediaId: data.parentMediaId ?? null,
      category: data.category,
      title: data.title ?? null,
      description: data.description ?? null,
      storagePath: data.storagePath,
      mime: data.mime ?? null,
      sizeBytes: data.sizeBytes ?? null,
      takenAt: data.takenAt ?? null,
      bodyRegion: data.bodyRegion ?? null,
      annotations: data.annotations ?? [],
      actor: context.userId,
    });
    return { media };
  });

export const listClinicalMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listByPatientSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ClinicalMediaRepository(context.supabase);
    const rows = await repo.listForPatient(data.tenantId, data.patientId, data.limit);
    return { rows };
  });

export const getClinicalMediaSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => mediaSignedUrlSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ClinicalMediaRepository(context.supabase);
    const engine = new ClinicalMediaEngine(context.supabase);
    const media = await repo.getById(data.id);
    if (!media || media.tenant_id !== data.tenantId) throw new Error("Not found");
    const url = await engine.createSignedUrl(media.storage_bucket, media.storage_path, data.expiresIn);
    return { url, media };
  });

// ============================================================
// CONSENTS
// ============================================================

export const upsertClinicalConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => consentUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ClinicalConsentEngine(context.supabase);
    const consent = await engine.upsert({
      tenantId: data.tenantId,
      id: data.id,
      patientId: data.patientId,
      encounterId: data.encounterId ?? null,
      templateId: data.templateId ?? null,
      templateCode: data.templateCode ?? null,
      templateVersion: data.templateVersion ?? null,
      status: data.status,
      actorPersonId: data.actorPersonId ?? null,
      actorRole: data.actorRole ?? null,
      signedAt: data.signedAt ?? null,
      notes: data.notes ?? null,
      signatureNote: data.signatureNote ?? null,
      actor: context.userId,
    });
    return { consent };
  });

export const listClinicalConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listByPatientSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ClinicalConsentRepository(context.supabase);
    const rows = await repo.listForPatient(data.tenantId, data.patientId);
    return { rows: rows.slice(0, data.limit) };
  });

// ============================================================
// FOLLOW-UPS
// ============================================================

export const upsertClinicalFollowup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => followupUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ClinicalFollowupEngine(context.supabase);
    const followup = await engine.upsert({
      tenantId: data.tenantId,
      id: data.id,
      patientId: data.patientId,
      encounterId: data.encounterId ?? null,
      treatmentPlanId: data.treatmentPlanId ?? null,
      suggestedIntervalDays: data.suggestedIntervalDays ?? null,
      suggestedDate: data.suggestedDate ?? null,
      reason: data.reason,
      priority: data.priority,
      status: data.status,
      notes: data.notes ?? null,
      actor: context.userId,
    });
    return { followup };
  });

export const listClinicalFollowups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listByPatientSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ClinicalFollowupRepository(context.supabase);
    const rows = await repo.listForPatient(data.tenantId, data.patientId);
    return { rows: rows.slice(0, data.limit) };
  });

// Also expose an existence check helper for SOAP notes to allow lightweight
// consumption from context loaders / dashboards.
export const getSoapNoteHeader = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => soapNoteIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new SoapNoteRepository(context.supabase);
    const note = await repo.getByEncounter(data.encounterId);
    if (note && note.tenant_id !== data.tenantId) throw new Error("Not found");
    return { note };
  });
