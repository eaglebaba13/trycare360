/**
 * Lead Intake — Server Functions.
 * Authenticated intake for internal callers (imports, manual entry).
 * Public webhook intake lives at /api/public/leads/intake/$provider.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const intakeSchema = z.object({
  provider: z.enum(["meta", "google", "whatsapp", "web_form", "ai_consultation", "import", "manual", "other"]),
  tenant_id: z.string().uuid(),
  full_name: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  default_dial: z.string().nullable().optional(),
  source: z.string().optional(),
  sub_source: z.string().optional(),
  campaign_id: z.string().optional(),
  meta_campaign_id: z.string().optional(),
  google_campaign_id: z.string().optional(),
  ad_id: z.string().optional(),
  creative_id: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  landing_page: z.string().optional(),
  referrer: z.string().optional(),
  device: z.string().optional(),
  branch_id: z.string().uuid().nullable().optional(),
  franchise_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  external_ref: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
});

export const createLeadIntake = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => intakeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { intakeLead } = await import("./intake.server");
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    return intakeLead(context.supabase as any, data);
  });
