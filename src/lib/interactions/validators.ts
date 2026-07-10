import { z } from "zod";

const uuid = z.string().uuid();

export const INTERACTION_CHANNELS = [
  "call", "whatsapp", "sms", "email", "ai_consult", "note", "task", "workflow",
  "document", "payment_reminder", "follow_up", "appointment", "meeting", "walk_in",
  "system", "push",
] as const;

export const logInteractionSchema = z.object({
  tenant_id: uuid,
  person_id: uuid,
  channel: z.enum(INTERACTION_CHANNELS),
  direction: z.enum(["in", "out", "system"]).default("system"),
  subject: z.string().max(255).optional(),
  body: z.string().optional(),
  lead_id: uuid.optional(),
  patient_id: uuid.optional(),
  outcome: z.string().max(64).optional(),
  disposition_code: z.string().max(64).optional(),
  duration_sec: z.number().int().nonnegative().optional(),
  occurred_at: z.string().datetime().optional(),
  owner_id: uuid.optional(),
  source: z.string().max(64).optional(),
  external_ref: z.string().max(255).optional(),
  attachments: z.array(z.record(z.string(), z.unknown())).default([]),
  meta: z.record(z.string(), z.unknown()).default({}),
});
export type LogInteractionInput = z.infer<typeof logInteractionSchema>;

export const listInteractionsSchema = z.object({
  tenant_id: uuid,
  person_id: uuid.optional(),
  lead_id: uuid.optional(),
  patient_id: uuid.optional(),
  channels: z.array(z.enum(INTERACTION_CHANNELS)).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});
