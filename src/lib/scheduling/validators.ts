/**
 * Scheduling Platform — Zod validators (client-safe).
 * Consumed by server functions AND typed client callers.
 */
import { z } from "zod";

export const uuid = z.string().uuid();
export const tenantId = uuid;
export const isoDateTime = z.string().datetime();
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ---------- Slot search / availability ----------------------------------

export const findSlotsSchema = z.object({
  tenant_id: tenantId,
  service_id: uuid,
  service_variant_id: uuid.nullish(),
  branch_id: uuid.nullish(),
  franchise_id: uuid.nullish(),
  org_unit_id: uuid.nullish(),
  doctor_id: uuid.nullish(),
  resource_group_id: uuid.nullish(),
  preferred_resource_ids: z.array(uuid).optional(),
  from: isoDateTime,
  to: isoDateTime,
  duration_minutes: z.number().int().positive().max(24 * 60).optional(),
  delivery_mode: z
    .enum(["in_clinic", "video", "home_visit", "phone"])
    .default("in_clinic"),
  timezone: z.string().max(64).default("UTC"),
  limit: z.number().int().positive().max(200).default(50),
  cross_branch: z.boolean().optional(),
  respect_capacity: z.boolean().default(true),
  respect_policies: z.boolean().default(true),
});
export type FindSlotsInput = z.infer<typeof findSlotsSchema>;

export const checkAvailabilitySchema = z.object({
  tenant_id: tenantId,
  service_id: uuid,
  service_variant_id: uuid.nullish(),
  branch_id: uuid,
  starts_at: isoDateTime,
  duration_minutes: z.number().int().positive().max(24 * 60),
  doctor_id: uuid.nullish(),
  room_resource_id: uuid.nullish(),
  resource_ids: z.array(uuid).optional(),
});
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

export const holdSlotSchema = z.object({
  tenant_id: tenantId,
  service_id: uuid,
  branch_id: uuid,
  doctor_id: uuid.nullish(),
  room_resource_id: uuid.nullish(),
  resource_ids: z.array(uuid).optional(),
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  ttl_seconds: z.number().int().positive().max(60 * 60).default(300),
  hold_reason: z.string().max(120).default("booking_in_progress"),
  booking_context: z.record(z.string(), z.unknown()).optional(),
});
export type HoldSlotInput = z.infer<typeof holdSlotSchema>;

export const releaseHoldSchema = z.object({
  tenant_id: tenantId,
  hold_id: uuid,
});

export const generateSlotsSchema = z.object({
  tenant_id: tenantId,
  branch_id: uuid,
  resource_id: uuid.nullish(),
  service_id: uuid.nullish(),
  from: isoDate,
  to: isoDate,
});

// ---------- Appointment lifecycle ---------------------------------------

export const bookAppointmentSchema = z.object({
  tenant_id: tenantId,
  person_id: uuid,
  service_id: uuid,
  service_variant_id: uuid.nullish(),
  appointment_type_id: uuid.nullish(),
  appointment_reason_id: uuid.nullish(),
  branch_id: uuid,
  org_unit_id: uuid.nullish(),
  franchise_id: uuid.nullish(),
  doctor_id: uuid.nullish(),
  primary_resource_id: uuid.nullish(),
  room_resource_id: uuid.nullish(),
  resource_group_id: uuid.nullish(),
  additional_resource_ids: z.array(uuid).optional(),
  starts_at: isoDateTime,
  duration_minutes: z.number().int().positive().max(24 * 60),
  timezone: z.string().max(64).default("UTC"),
  delivery_mode: z
    .enum(["in_clinic", "video", "home_visit", "phone"])
    .default("in_clinic"),
  booking_source: z
    .enum([
      "website",
      "ai_consult",
      "telecaller",
      "mobile_app",
      "reception",
      "walk_in",
      "api",
      "workflow",
    ])
    .default("reception"),
  booking_channel: z.string().max(60).nullish(),
  lead_id: uuid.nullish(),
  package_id: uuid.nullish(),
  sequence_item_id: uuid.nullish(),
  series_id: uuid.nullish(),
  parent_appointment_id: uuid.nullish(),
  household_id: uuid.nullish(),
  membership_id: uuid.nullish(),
  is_emergency: z.boolean().optional(),
  is_vip: z.boolean().optional(),
  is_walk_in: z.boolean().optional(),
  priority_weight: z.number().min(0).max(1000).optional(),
  notes: z.string().max(2000).nullish(),
  internal_notes: z.string().max(2000).nullish(),
  pickup_location: z.record(z.string(), z.unknown()).nullish(),
  dropoff_location: z.record(z.string(), z.unknown()).nullish(),
  service_location: z.record(z.string(), z.unknown()).nullish(),
  meta: z.record(z.string(), z.unknown()).optional(),
  hold_id: uuid.nullish(),
  attribution_touch_id: uuid.nullish(),
  policy_override_reason: z.string().max(500).nullish(),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  reason_code: z.string().max(60),
  reason_notes: z.string().max(1000).nullish(),
  cancelled_by_role: z
    .enum(["patient", "clinic", "doctor", "system"])
    .default("clinic"),
  refund_requested: z.boolean().optional(),
  release_resources: z.boolean().default(true),
  offer_waitlist: z.boolean().default(true),
});

export const rescheduleAppointmentSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  new_starts_at: isoDateTime,
  new_duration_minutes: z.number().int().positive().max(24 * 60).optional(),
  new_branch_id: uuid.nullish(),
  new_doctor_id: uuid.nullish(),
  new_room_resource_id: uuid.nullish(),
  reason: z.string().max(1000).nullish(),
  requested_by_role: z
    .enum(["patient", "clinic", "doctor", "system"])
    .default("clinic"),
});

export const checkinSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  at: isoDateTime.optional(),
  checkin_channel: z
    .enum(["reception", "kiosk", "self", "mobile", "qr"])
    .default("reception"),
  notes: z.string().max(1000).nullish(),
});

export const completeSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  completed_at: isoDateTime.optional(),
  outcome_notes: z.string().max(2000).nullish(),
});

export const startSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  started_at: isoDateTime.optional(),
});

export const feedbackSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  rating: z.number().int().min(1).max(5),
  nps: z.number().int().min(0).max(10).nullish(),
  comments: z.string().max(2000).nullish(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const noShowSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
  reason: z.string().max(500).nullish(),
  charge_no_show_fee: z.boolean().optional(),
});

// ---------- Queue --------------------------------------------------------

export const issueTokenSchema = z.object({
  tenant_id: tenantId,
  branch_id: uuid,
  queue_id: uuid.nullish(),
  appointment_id: uuid.nullish(),
  person_id: uuid.nullish(),
  priority: z.number().int().min(0).max(1000).default(0),
  is_vip: z.boolean().optional(),
  is_emergency: z.boolean().optional(),
  notes: z.string().max(500).nullish(),
});

export const queueTokenActionSchema = z.object({
  tenant_id: tenantId,
  token_id: uuid,
  actor_notes: z.string().max(500).nullish(),
});

export const queueTransferSchema = z.object({
  tenant_id: tenantId,
  token_id: uuid,
  target_queue_id: uuid,
  reason: z.string().max(500).nullish(),
});

// ---------- Waitlist -----------------------------------------------------

export const waitlistFindSchema = z.object({
  tenant_id: tenantId,
  branch_id: uuid,
  service_id: uuid,
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  doctor_id: uuid.nullish(),
  limit: z.number().int().positive().max(50).default(5),
});

export const waitlistOfferSchema = z.object({
  tenant_id: tenantId,
  waitlist_id: uuid,
  slot_starts_at: isoDateTime,
  slot_ends_at: isoDateTime,
  branch_id: uuid,
  doctor_id: uuid.nullish(),
  ttl_seconds: z.number().int().positive().max(24 * 60 * 60).default(1800),
  channel: z.enum(["sms", "email", "whatsapp", "call", "push"]).default("sms"),
});

export const waitlistOfferIdSchema = z.object({
  tenant_id: tenantId,
  offer_id: uuid,
});

// ---------- Capacity -----------------------------------------------------

export const capacityCheckSchema = z.object({
  tenant_id: tenantId,
  branch_id: uuid,
  service_id: uuid.nullish(),
  dimension_code: z.string().max(60),
  bucket_start: isoDateTime,
  bucket_end: isoDateTime,
  units_required: z.number().int().positive().default(1),
});

// ---------- Recurrence / Packages ---------------------------------------

export const materializeRecurrenceSchema = z.object({
  tenant_id: tenantId,
  series_id: uuid,
  horizon_days: z.number().int().positive().max(365).default(60),
});

export const createPackageSequenceSchema = z.object({
  tenant_id: tenantId,
  person_id: uuid,
  package_plan_id: uuid,
  branch_id: uuid,
  doctor_id: uuid.nullish(),
  start_date: isoDate,
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const validateDependenciesSchema = z.object({
  tenant_id: tenantId,
  service_id: uuid,
  person_id: uuid,
  starts_at: isoDateTime,
});

// ---------- Policy -------------------------------------------------------

export const evaluatePolicyContextSchema = z.object({
  tenant_id: tenantId,
  branch_id: uuid.nullish(),
  franchise_id: uuid.nullish(),
  service_id: uuid.nullish(),
  service_variant_id: uuid.nullish(),
  doctor_id: uuid.nullish(),
  person_id: uuid.nullish(),
  booking_source: z.string().max(60).nullish(),
  action: z.enum([
    "book",
    "cancel",
    "reschedule",
    "check_in",
    "no_show",
    "walk_in",
    "hold",
  ]),
  starts_at: isoDateTime.optional(),
  now: isoDateTime.optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});
export type EvaluatePolicyContext = z.infer<
  typeof evaluatePolicyContextSchema
>;

// ---------- IDs ---------------------------------------------------------

export const appointmentIdSchema = z.object({
  tenant_id: tenantId,
  appointment_id: uuid,
});
