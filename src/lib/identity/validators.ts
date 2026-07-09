/**
 * Master Person Registry — Validators & Normalization (client-safe).
 * Zod schemas + phone/email normalization used by both client callers
 * and server functions. Hashing lives in `hashing.server.ts`.
 */
import { z } from "zod";

// ---------- Normalization ----------

/**
 * Normalize an email address: trim + lowercase.
 * Returns null when input is empty/whitespace.
 */
export function normalizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const v = String(input).trim().toLowerCase();
  return v.length ? v : null;
}

/**
 * Normalize a phone number to E.164-ish form (digits only, prefixed with +).
 * If a `countryCode` (e.g. "IN") or default dial code is provided and the
 * number is a plain local number, we prepend the given `defaultDial`.
 * We deliberately keep this lightweight; a full libphonenumber pass can be
 * added later at the same call site.
 */
export function normalizePhone(
  input: string | null | undefined,
  opts?: { defaultDial?: string | null },
): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (hasPlus) return `+${digits}`;
  const dial = (opts?.defaultDial ?? "").replace(/[^\d]/g, "");
  if (dial) return `+${dial}${digits}`;
  // Fallback: assume already includes country code
  return `+${digits}`;
}

// ---------- Common primitives ----------

export const uuid = z.string().uuid();
export const tenantId = uuid;
export const personId = uuid;
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const genderEnum = z.enum(["male", "female", "other", "unknown"]);
export const identityStatusEnum = z.enum(["active", "archived", "merged"]);
export const erasureStateEnum = z.enum(["none", "requested", "erased"]);

// ---------- Person ----------

export const personCreateSchema = z.object({
  tenant_id: tenantId,
  full_name: z.string().trim().min(1).max(200),
  first_name: z.string().trim().max(100).nullish(),
  middle_name: z.string().trim().max(100).nullish(),
  last_name: z.string().trim().max(100).nullish(),
  display_name: z.string().trim().max(200).nullish(),
  salutation: z.string().trim().max(20).nullish(),
  gender: genderEnum.nullish(),
  dob: isoDate.nullish(),
  photo_url: z.string().url().nullish(),
  phone: z.string().trim().max(40).nullish(),
  email: z.string().trim().email().max(200).nullish(),
  national_id: z.string().trim().min(4).max(64).nullish(),
  preferred_language: z.string().trim().max(16).nullish(),
  preferred_channel_code: z.string().trim().max(32).nullish(),
  timezone: z.string().trim().max(64).nullish(),
  marketing_opt_in: z.boolean().optional(),
  service_opt_in: z.boolean().optional(),
  transactional_opt_in: z.boolean().optional(),
  vip_flag: z.boolean().optional(),
  default_dial: z.string().trim().max(6).nullish(),
});
export type PersonCreateInput = z.infer<typeof personCreateSchema>;

export const personUpdateSchema = personCreateSchema
  .partial()
  .extend({ id: personId, tenant_id: tenantId });
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;

export const personSearchSchema = z.object({
  tenant_id: tenantId,
  query: z.string().trim().min(1).max(200).optional(),
  identity_status: identityStatusEnum.optional(),
  vip_only: z.boolean().optional(),
  limit: z.number().int().positive().max(100).default(25),
  offset: z.number().int().min(0).default(0),
});
export type PersonSearchInput = z.infer<typeof personSearchSchema>;

export const personIdSchema = z.object({ tenant_id: tenantId, id: personId });

// ---------- Contact / Address / Relationship / Consent ----------

export const contactChannelEnum = z.enum([
  "mobile",
  "whatsapp",
  "landline",
  "email",
  "fax",
  "other",
]);

export const contactUpsertSchema = z.object({
  id: uuid.optional(),
  tenant_id: tenantId,
  person_id: personId,
  channel: contactChannelEnum,
  value_raw: z.string().trim().min(1).max(200),
  country_code: z.string().trim().max(6).nullish(),
  label: z.string().trim().max(40).nullish(),
  is_primary: z.boolean().optional(),
  is_verified: z.boolean().optional(),
  opt_in: z.boolean().optional(),
  do_not_contact: z.boolean().optional(),
});
export type ContactUpsertInput = z.infer<typeof contactUpsertSchema>;

export const addressUpsertSchema = z.object({
  id: uuid.optional(),
  tenant_id: tenantId,
  person_id: personId,
  address_type: z.string().trim().min(1).max(32),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullish(),
  area: z.string().trim().max(120).nullish(),
  city: z.string().trim().max(120).nullish(),
  district: z.string().trim().max(120).nullish(),
  state: z.string().trim().max(120).nullish(),
  country: z.string().trim().max(80).nullish(),
  pincode: z.string().trim().max(20).nullish(),
  landmark: z.string().trim().max(200).nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  is_primary: z.boolean().optional(),
});
export type AddressUpsertInput = z.infer<typeof addressUpsertSchema>;

export const relationshipUpsertSchema = z.object({
  tenant_id: tenantId,
  from_person_id: personId,
  to_person_id: personId,
  relationship_code: z.string().trim().min(1).max(40),
  is_primary: z.boolean().optional(),
  is_emergency: z.boolean().optional(),
  notes: z.string().trim().max(500).nullish(),
  valid_from: isoDate.nullish(),
  valid_to: isoDate.nullish(),
}).refine((v) => v.from_person_id !== v.to_person_id, {
  message: "from_person_id and to_person_id must differ",
  path: ["to_person_id"],
});
export type RelationshipUpsertInput = z.infer<typeof relationshipUpsertSchema>;

export const consentRecordSchema = z.object({
  tenant_id: tenantId,
  person_id: personId,
  purpose_code: z.string().trim().min(1).max(60),
  consent_version: z.string().trim().min(1).max(40),
  granted: z.boolean(),
  source: z.string().trim().max(60).nullish(),
  evidence_url: z.string().url().nullish(),
});
export type ConsentRecordInput = z.infer<typeof consentRecordSchema>;

// ---------- Verification ----------

export const verificationMethodEnum = z.enum([
  "manual",
  "otp",
  "document",
  "video_kyc",
  "biometric",
  "third_party",
]);
export const verificationStatusEnum = z.enum([
  "initiated",
  "pending",
  "verified",
  "rejected",
  "expired",
]);

export const verifyPersonSchema = z.object({
  tenant_id: tenantId,
  person_id: personId,
  method: verificationMethodEnum,
  status: verificationStatusEnum,
  document_type: z.string().trim().max(40).nullish(),
  document_number: z.string().trim().max(64).nullish(),
  document_url: z.string().url().nullish(),
  provider: z.string().trim().max(60).nullish(),
  provider_ref: z.string().trim().max(120).nullish(),
  expires_at: z.string().datetime().nullish(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type VerifyPersonInput = z.infer<typeof verifyPersonSchema>;

// ---------- Roles / Patient ----------

export const roleCodeEnum = z.enum([
  "patient",
  "doctor",
  "employee",
  "franchise_owner",
  "academy_student",
  "lead",
  "corporate_contact",
  "vendor_contact",
]);
export type RoleCode = z.infer<typeof roleCodeEnum>;

export const attachRoleSchema = z.object({
  tenant_id: tenantId,
  person_id: personId,
  role: roleCodeEnum,
  // Free-form role-specific fields; each repository picks what it needs.
  fields: z.record(z.string(), z.unknown()).optional(),
});
export type AttachRoleInput = z.infer<typeof attachRoleSchema>;

export const detachRoleSchema = z.object({
  tenant_id: tenantId,
  person_id: personId,
  role: roleCodeEnum,
  reason: z.string().trim().max(200).nullish(),
});
export type DetachRoleInput = z.infer<typeof detachRoleSchema>;

export const createPatientFromPersonSchema = z.object({
  tenant_id: tenantId,
  person_id: personId,
  mrn: z.string().trim().max(40).nullish(),
  blood_group: z.string().trim().max(8).nullish(),
  primary_doctor_id: uuid.nullish(),
  home_branch_id: uuid.nullish(),
});
export type CreatePatientFromPersonInput = z.infer<typeof createPatientFromPersonSchema>;

export const archivePersonSchema = z.object({
  tenant_id: tenantId,
  id: personId,
  reason: z.string().trim().max(200).nullish(),
});
export type ArchivePersonInput = z.infer<typeof archivePersonSchema>;
