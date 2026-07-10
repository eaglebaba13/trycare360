import { z } from "zod";

export const uuid = z.string().uuid();

export const leadCreateSchema = z.object({
  tenant_id: uuid,
  person_id: uuid,
  lead_code: z.string().min(1).max(64).optional(),
  source: z.string().max(64).optional(),
  sub_source: z.string().max(64).optional(),
  campaign_id: z.string().max(128).optional(),
  meta_campaign_id: z.string().max(128).optional(),
  google_campaign_id: z.string().max(128).optional(),
  ad_id: z.string().max(128).optional(),
  creative_id: z.string().max(128).optional(),
  keyword: z.string().max(255).optional(),
  landing_page: z.string().max(512).optional(),
  referrer: z.string().max(512).optional(),
  device: z.string().max(64).optional(),
  browser: z.string().max(64).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  country: z.string().max(2).optional(),
  utm_source: z.string().max(128).optional(),
  utm_medium: z.string().max(128).optional(),
  utm_campaign: z.string().max(128).optional(),
  utm_term: z.string().max(128).optional(),
  utm_content: z.string().max(128).optional(),
  owner_id: uuid.optional(),
  branch_id: uuid.optional(),
  franchise_id: uuid.optional(),
  master_franchise_id: uuid.optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  stage_code: z.string().max(64).default("new"),
  assessment_session_id: uuid.optional(),
  referral_source: z.string().max(128).optional(),
  referral_partner_id: uuid.optional(),
  expected_value: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("INR"),
  meta: z.record(z.string(), z.unknown()).default({}),
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadUpdateSchema = leadCreateSchema.partial().extend({ id: uuid });
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export const leadListSchema = z.object({
  tenant_id: uuid,
  stage_code: z.string().optional(),
  owner_id: uuid.optional(),
  branch_id: uuid.optional(),
  franchise_id: uuid.optional(),
  source: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
});

export const leadIdSchema = z.object({ id: uuid });

export const leadAssignSchema = z.object({
  id: uuid,
  owner_id: uuid.nullable(),
  reason: z.string().max(255).optional(),
  assignment_kind: z
    .enum(["auto", "manual", "round_robin", "escalation", "transfer", "system"])
    .default("manual"),
});

export const leadStageChangeSchema = z.object({
  id: uuid,
  stage_code: z.string().min(1),
  won_reason_id: uuid.optional(),
  lost_reason_id: uuid.optional(),
  notes: z.string().max(2000).optional(),
});

export const leadConvertSchema = z.object({
  id: uuid,
  to: z.enum(["patient", "appointment", "treatment", "membership", "subscription"]),
  ref: z.string().optional(),
  revenue: z
    .object({
      amount: z.number().nonnegative(),
      currency: z.string().length(3).default("INR"),
      category: z.enum(["treatment", "product", "membership", "subscription", "consultation", "other"]),
      source_module: z.string().default("lead_convert"),
      source_ref: z.string().optional(),
      doctor_id: uuid.optional(),
      therapist_id: uuid.optional(),
      branch_id: uuid.optional(),
      franchise_id: uuid.optional(),
      master_franchise_id: uuid.optional(),
      product_id: uuid.optional(),
      treatment_id: uuid.optional(),
      membership_id: uuid.optional(),
      subscription_id: uuid.optional(),
    })
    .optional(),
});
