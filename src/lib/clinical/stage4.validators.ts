/**
 * Clinical / EMR — Stage 4 Zod validators (client-safe).
 * Extends Stage 2 validators with SOAP versioning, treatment plans,
 * prescriptions, media, consents, and follow-ups.
 */
import { z } from "zod";
import { isoDate, isoDateTime, jsonRecord, tenantId, uuid } from "./validators";

// ---------- SOAP versioning -----------------------------------------------

export const soapSaveVersionSchema = z.object({
  tenantId,
  encounterId: uuid,
  templateCode: z.string().trim().max(80).nullish(),
  subjective: jsonRecord.optional(),
  objective: jsonRecord.optional(),
  assessment: jsonRecord.optional(),
  plan: jsonRecord.optional(),
  isAutosave: z.boolean().optional().default(false),
});

export const soapNoteIdSchema = z.object({ tenantId, encounterId: uuid });

export const soapVersionIdSchema = z.object({
  tenantId,
  encounterId: uuid,
  versionId: uuid,
});

export const soapSignSchema = z.object({
  tenantId,
  encounterId: uuid,
  signatureNote: z.string().trim().max(500).nullish(),
});

// ---------- Treatment plans -----------------------------------------------

const goalSchema = z.object({
  label: z.string().trim().min(1).max(300),
  achieved: z.boolean().optional(),
  notes: z.string().trim().max(1000).nullish(),
});
const milestoneSchema = z.object({
  label: z.string().trim().min(1).max(300),
  due_date: isoDate.nullish(),
  status: z.enum(["pending", "in_progress", "done", "skipped"]).default("pending"),
  notes: z.string().trim().max(1000).nullish(),
});

export const treatmentPlanUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  encounterId: uuid.nullish(),
  protocolId: uuid.nullish(),
  title: z.string().trim().min(1).max(200),
  diagnosis: z.string().trim().max(1000).nullish(),
  goals: z.array(goalSchema).optional().default([]),
  milestones: z.array(milestoneSchema).optional().default([]),
  instructions: z.string().trim().max(4000).nullish(),
  expectedOutcomes: z.string().trim().max(2000).nullish(),
  contraindications: z.string().trim().max(2000).nullish(),
  reviewSchedule: jsonRecord.optional(),
  progress: jsonRecord.optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).default("draft"),
  startDate: isoDate.nullish(),
  endDate: isoDate.nullish(),
});
export type TreatmentPlanUpsertInput = z.infer<typeof treatmentPlanUpsertSchema>;

export const treatmentPlanStatusSchema = z.object({
  tenantId,
  id: uuid,
  status: z.enum(["draft", "active", "completed", "cancelled"]),
});

export const listByPatientSchema = z.object({
  tenantId,
  patientId: uuid,
  limit: z.number().int().positive().max(100).default(50),
});

// ---------- Prescriptions -------------------------------------------------

const prescriptionItemSchema = z.object({
  id: uuid.optional(),
  position: z.number().int().min(0).default(0),
  medication: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(120).nullish(),
  frequency: z.string().trim().max(120).nullish(),
  duration: z.string().trim().max(120).nullish(),
  route: z.string().trim().max(80).nullish(),
  instructions: z.string().trim().max(1000).nullish(),
  refills: z.number().int().min(0).max(24).default(0),
  warnings: z.array(z.string().trim().max(300)).optional().default([]),
});

export const prescriptionUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  encounterId: uuid.nullish(),
  treatmentPlanId: uuid.nullish(),
  notes: z.string().trim().max(2000).nullish(),
  status: z.enum(["draft", "issued", "cancelled", "superseded"]).default("draft"),
  items: z.array(prescriptionItemSchema).min(1),
});
export type PrescriptionUpsertInput = z.infer<typeof prescriptionUpsertSchema>;

export const prescriptionIssueSchema = z.object({
  tenantId,
  id: uuid,
  signatureNote: z.string().trim().max(500).nullish(),
});

// ---------- Clinical media ------------------------------------------------

export const mediaCreateSchema = z.object({
  tenantId,
  patientId: uuid,
  encounterId: uuid.nullish(),
  parentMediaId: uuid.nullish(),
  category: z.enum(["image", "video", "pdf", "report", "before", "after", "body_map"]),
  title: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(2000).nullish(),
  storagePath: z.string().trim().min(1).max(500),
  mime: z.string().trim().max(120).nullish(),
  sizeBytes: z.number().int().min(0).nullish(),
  takenAt: isoDateTime.nullish(),
  bodyRegion: z.string().trim().max(120).nullish(),
  annotations: z.array(jsonRecord).optional().default([]),
});

export const mediaSignedUrlSchema = z.object({
  tenantId,
  id: uuid,
  expiresIn: z.number().int().min(60).max(3600).default(600),
});

export const mediaIdSchema = z.object({ tenantId, id: uuid });

// ---------- Consents -------------------------------------------------------

export const consentUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  encounterId: uuid.nullish(),
  templateId: uuid.nullish(),
  templateCode: z.string().trim().max(80).nullish(),
  templateVersion: z.string().trim().max(40).nullish(),
  status: z.enum(["pending", "accepted", "declined", "signed", "revoked"]).default("pending"),
  actorPersonId: uuid.nullish(),
  actorRole: z.string().trim().max(80).nullish(),
  signedAt: isoDateTime.nullish(),
  notes: z.string().trim().max(2000).nullish(),
  signatureNote: z.string().trim().max(500).nullish(),
});

// ---------- Follow-ups -----------------------------------------------------

export const followupUpsertSchema = z.object({
  tenantId,
  id: uuid.optional(),
  patientId: uuid,
  encounterId: uuid.nullish(),
  treatmentPlanId: uuid.nullish(),
  suggestedIntervalDays: z.number().int().min(0).max(3650).nullish(),
  suggestedDate: isoDate.nullish(),
  reason: z.string().trim().min(1).max(1000),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  status: z.enum(["pending", "scheduled", "completed", "cancelled"]).default("pending"),
  notes: z.string().trim().max(2000).nullish(),
});
