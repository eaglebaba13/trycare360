/**
 * Clinical / EMR — Stage 5 Zod validators (client-safe).
 * AI Assistant, Recommendations, Conversations.
 */
import { z } from "zod";
import { jsonRecord, tenantId, uuid } from "./validators";

// Every AI purpose recognised by the assistant. Kept as a literal union so
// the UI can enumerate them; the backend also accepts any tenant-defined
// prompt template code, so we keep this as a string with a fallback.
export const AI_PURPOSES = [
  "encounter_summary",
  "soap_summary",
  "problem_summary",
  "treatment_summary",
  "medication_summary",
  "timeline_summary",
  "patient_summary",
  "soap_draft",
  "soap_improve",
  "discharge_summary",
  "consultation_summary",
  "referral_letter",
  "patient_instructions",
  "visit_summary",
  "differential",
  "treatment_suggestion",
  "contraindication_check",
  "checklist",
  "followup",
  "nutrition",
  "referral",
] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

export const REC_KINDS = [
  "diagnosis",
  "differential",
  "treatment",
  "contraindication",
  "drug_allergy",
  "checklist",
  "followup",
  "nutrition",
  "referral",
  "soap_improvement",
] as const;
export type RecKind = (typeof REC_KINDS)[number];

export const REC_STATUSES = ["draft", "suggested", "accepted", "rejected", "archived"] as const;
export type RecStatus = (typeof REC_STATUSES)[number];

// ---- assistant request -----------------------------------------------------

export const assistantRunSchema = z.object({
  tenantId,
  encounterId: uuid.nullish(),
  patientId: uuid.nullish(),
  purpose: z.string().trim().min(1).max(80), // AiPurpose or a tenant template code
  templateCode: z.string().trim().max(80).nullish(),
  templateVersion: z.number().int().positive().nullish(),
  modelHint: z.string().trim().max(120).nullish(),
  extraInstructions: z.string().trim().max(4000).nullish(),
  overrideContext: jsonRecord.optional(),
  saveRecommendations: z.boolean().optional().default(false),
});

export const conversationListSchema = z.object({
  tenantId,
  encounterId: uuid.nullish(),
  patientId: uuid.nullish(),
  limit: z.number().int().positive().max(200).default(50),
});

export const conversationFeedbackSchema = z.object({
  tenantId,
  id: uuid,
  feedback: z.enum(["up", "down"]),
  note: z.string().trim().max(2000).nullish(),
});

// ---- recommendations -------------------------------------------------------

export const recommendationUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  encounterId: uuid.nullish(),
  patientId: uuid,
  kind: z.enum(REC_KINDS),
  targetType: z.string().trim().max(80).nullish(),
  targetId: uuid.nullish(),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(2000).nullish(),
  body: jsonRecord.optional().default({}),
  sources: z.array(jsonRecord).optional().default([]),
  confidence: z.number().min(0).max(1).nullish(),
  severity: z.enum(["info", "low", "moderate", "high", "critical"]).nullish(),
  model: z.string().trim().max(120).nullish(),
  modelVersion: z.string().trim().max(80).nullish(),
  promptTemplateId: uuid.nullish(),
  promptTemplateCode: z.string().trim().max(80).nullish(),
  promptTemplateVersion: z.number().int().positive().nullish(),
  conversationId: uuid.nullish(),
  status: z.enum(REC_STATUSES).default("draft"),
  statusReason: z.string().trim().max(500).nullish(),
});

export const recommendationStatusSchema = z.object({
  tenantId,
  id: uuid,
  status: z.enum(REC_STATUSES),
  reason: z.string().trim().max(500).nullish(),
  appliedRef: jsonRecord.optional(),
});

export const recommendationListSchema = z.object({
  tenantId,
  encounterId: uuid.nullish(),
  patientId: uuid.nullish(),
  status: z.enum(REC_STATUSES).nullish(),
  kind: z.enum(REC_KINDS).nullish(),
  limit: z.number().int().positive().max(200).default(50),
});

export const recommendationIdSchema = z.object({ tenantId, id: uuid });

// ---- prompt templates ------------------------------------------------------

export const promptTemplatesListSchema = z.object({
  tenantId,
  purpose: z.string().trim().max(80).nullish(),
  activeOnly: z.boolean().optional().default(true),
});

// ---- audit -----------------------------------------------------------------

export const auditListSchema = z.object({
  tenantId,
  encounterId: uuid.nullish(),
  entityType: z.string().trim().max(80).nullish(),
  entityId: uuid.nullish(),
  limit: z.number().int().positive().max(200).default(100),
});
