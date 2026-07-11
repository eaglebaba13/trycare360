/**
 * Clinical / EMR — Zod validators (client-safe).
 * Shared between server functions and any future client callers.
 */
import { z } from "zod";

export const uuid = z.string().uuid();
export const tenantId = uuid;
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const isoDateTime = z.string().datetime();
export const jsonRecord = z.record(z.string(), z.unknown());

// ---------- Clinical Knowledge --------------------------------------------

export const listKnowledgeSchema = z.object({
  tenantId,
  kind: z.enum([
    "code_systems",
    "codes",
    "protocols",
    "soap_templates",
    "diagnosis_templates",
    "treatment_protocols",
    "procedure_checklists",
    "consent_templates",
    "prescription_templates",
    "nutrition_plan_templates",
    "followup_templates",
    "ai_prompt_templates",
    "anatomy_grids",
    "scoring_scales",
    "contraindication_rules",
  ]),
  search: z.string().trim().max(120).optional(),
  activeOnly: z.boolean().optional().default(true),
  limit: z.number().int().positive().max(500).default(200),
  offset: z.number().int().min(0).default(0),
});

// ---------- Encounter ------------------------------------------------------

export const encounterCreateSchema = z.object({
  tenantId,
  patientId: uuid,
  encounterType: z.string().trim().min(1).max(60),
  appointmentId: uuid.nullish(),
  branchId: uuid.nullish(),
  primaryDoctorId: uuid.nullish(),
  packageId: uuid.nullish(),
  chiefComplaint: z.string().trim().max(2000).nullish(),
  room: z.string().trim().max(60).nullish(),
  source: z.string().trim().max(60).nullish(),
  startedAt: isoDateTime.nullish(),
  meta: jsonRecord.optional(),
});
export type EncounterCreateInput = z.infer<typeof encounterCreateSchema>;

export const encounterUpdateSchema = z.object({
  tenantId,
  id: uuid,
  status: z.string().trim().min(1).max(40).optional(),
  chiefComplaint: z.string().trim().max(2000).nullish(),
  room: z.string().trim().max(60).nullish(),
  primaryDoctorId: uuid.nullish(),
  branchId: uuid.nullish(),
  endedAt: isoDateTime.nullish(),
  meta: jsonRecord.optional(),
});

export const encounterCloseSchema = z.object({
  tenantId,
  id: uuid,
  endedAt: isoDateTime.optional(),
});

export const encounterIdSchema = z.object({ tenantId, id: uuid });

// ---------- Participants ---------------------------------------------------

export const participantAddSchema = z.object({
  tenantId,
  encounterId: uuid,
  personId: uuid,
  role: z.string().trim().min(1).max(60),
  sourceTenantId: uuid.nullish(),
  joinedAt: isoDateTime.nullish(),
  notes: z.string().trim().max(500).nullish(),
});
export const participantRemoveSchema = z.object({
  tenantId,
  id: uuid,
  leftAt: isoDateTime.nullish(),
});

// ---------- SOAP -----------------------------------------------------------

export const soapSaveSchema = z.object({
  tenantId,
  encounterId: uuid,
  templateCode: z.string().trim().max(80).nullish(),
  subjective: jsonRecord.optional(),
  objective: jsonRecord.optional(),
  assessment: jsonRecord.optional(),
  plan: jsonRecord.optional(),
});

// ---------- Diagnosis / Problems ------------------------------------------

export const problemUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  encounterId: uuid.nullish(),
  category: z.string().trim().max(40).default("problem"),
  display: z.string().trim().min(1).max(300),
  code: z.string().trim().max(80).nullish(),
  codeSystemId: uuid.nullish(),
  severity: z.string().trim().max(40).nullish(),
  status: z.enum(["active", "resolved", "inactive", "recurrence"]).default("active"),
  onsetDate: isoDate.nullish(),
  resolvedDate: isoDate.nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

export const problemResolveSchema = z.object({
  tenantId,
  id: uuid,
  resolvedDate: isoDate.optional(),
  notes: z.string().trim().max(2000).nullish(),
});

// ---------- Vitals ---------------------------------------------------------

export const vitalsRecordSchema = z.object({
  tenantId,
  patientId: uuid,
  encounterId: uuid.nullish(),
  measuredAt: isoDateTime.optional(),
  heightCm: z.number().positive().max(300).nullish(),
  weightKg: z.number().positive().max(500).nullish(),
  bmi: z.number().positive().max(200).nullish(),
  waistCm: z.number().positive().max(300).nullish(),
  hipCm: z.number().positive().max(300).nullish(),
  bpSystolic: z.number().int().positive().max(300).nullish(),
  bpDiastolic: z.number().int().positive().max(250).nullish(),
  heartRate: z.number().int().positive().max(300).nullish(),
  respRate: z.number().int().positive().max(200).nullish(),
  temperatureC: z.number().min(20).max(50).nullish(),
  spo2: z.number().int().min(0).max(100).nullish(),
  notes: z.string().trim().max(1000).nullish(),
});

// ---------- Allergies ------------------------------------------------------

export const allergyUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  substance: z.string().trim().min(1).max(200),
  category: z.string().trim().max(60).nullish(),
  severity: z.string().trim().max(40).nullish(),
  reaction: z.string().trim().max(500).nullish(),
  status: z.enum(["active", "inactive", "resolved", "entered_in_error"]).default("active"),
  onsetDate: isoDate.nullish(),
  source: z.string().trim().max(60).nullish(),
  notes: z.string().trim().max(1000).nullish(),
});

// ---------- Medical / Family / Lifestyle History --------------------------

export const medicalHistoryUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  category: z.string().trim().min(1).max(60),
  summary: z.string().trim().min(1).max(1000),
  code: z.string().trim().max(80).nullish(),
  codeSystemId: uuid.nullish(),
  eventDate: isoDate.nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

export const familyHistoryUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  relation: z.string().trim().min(1).max(60),
  conditionDisplay: z.string().trim().min(1).max(300),
  code: z.string().trim().max(80).nullish(),
  codeSystemId: uuid.nullish(),
  onsetAge: z.number().int().min(0).max(150).nullish(),
  notes: z.string().trim().max(1000).nullish(),
});

export const lifestyleUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  recordedAt: isoDateTime.optional(),
  occupation: z.string().trim().max(120).nullish(),
  smoking: jsonRecord.nullish(),
  alcohol: jsonRecord.nullish(),
  substanceUse: jsonRecord.nullish(),
  diet: jsonRecord.nullish(),
  exercise: jsonRecord.nullish(),
  sleep: jsonRecord.nullish(),
  stress: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

// ---------- Referrals ------------------------------------------------------

export const referralCreateSchema = z.object({
  tenantId,
  patientId: uuid,
  reason: z.string().trim().min(1).max(1000),
  sourceEncounterId: uuid.nullish(),
  fromDoctorId: uuid.nullish(),
  fromBranchId: uuid.nullish(),
  toDoctorId: uuid.nullish(),
  toBranchId: uuid.nullish(),
  toTenantId: uuid.nullish(),
  externalProvider: z.string().trim().max(200).nullish(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  notes: z.string().trim().max(2000).nullish(),
});

export const referralUpdateSchema = z.object({
  tenantId,
  id: uuid,
  status: z.string().trim().min(1).max(40).optional(),
  notes: z.string().trim().max(2000).nullish(),
});

// ---------- Second Opinions ------------------------------------------------

export const secondOpinionCreateSchema = z.object({
  tenantId,
  patientId: uuid,
  question: z.string().trim().min(1).max(2000),
  sourceEncounterId: uuid.nullish(),
  requestedByDoctorId: uuid.nullish(),
  opinionDoctorId: uuid.nullish(),
  opinionTenantId: uuid.nullish(),
});

export const secondOpinionRespondSchema = z.object({
  tenantId,
  id: uuid,
  response: z.string().trim().min(1).max(5000),
  answeredAt: isoDateTime.optional(),
});

// ---------- Clinical Context Loader ---------------------------------------

export const clinicalContextSchema = z.object({
  tenantId,
  personId: uuid,
  encounterId: uuid.nullish(),
  historyLimit: z.number().int().positive().max(50).default(10),
});
