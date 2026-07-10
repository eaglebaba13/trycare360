/**
 * Lead Intake — normalizer + find-or-create-person + create-lead.
 *
 * Every intake channel (Meta Lead Ads, Google Lead Forms, WhatsApp,
 * Website Forms, AI Consultation) ends up here. Identity is preserved:
 *   1. Normalize phone/email.
 *   2. Look up existing person by phone OR email.
 *   3. Create person only if none found.
 *   4. Create lead pointing at that person + insert source_history +
 *      attribution first-touch row.
 *   5. Run the assignment rule engine and set owner if resolved.
 *   6. Start the `first_response` SLA instance.
 *
 * This module is server-only (no client bundle).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeEmail, normalizePhone } from "@/lib/identity/validators";
import { resolveAssignment } from "./assignment.server";
import { startSlaInstance } from "@/lib/sla/sla.server";

type SB = SupabaseClient<Database>;

export type IntakeProvider =
  | "meta"
  | "google"
  | "whatsapp"
  | "web_form"
  | "ai_consultation"
  | "import"
  | "manual"
  | "other";

export interface IntakePayload {
  provider: IntakeProvider;
  tenant_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  city?: string | null;
  country?: string | null;
  default_dial?: string | null;

  // Campaign / attribution
  source?: string;
  sub_source?: string;
  campaign_id?: string;
  meta_campaign_id?: string;
  google_campaign_id?: string;
  ad_id?: string;
  creative_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_page?: string;
  referrer?: string;
  device?: string;

  // Extras
  branch_id?: string | null;
  franchise_id?: string | null;
  priority?: "low" | "normal" | "high" | "urgent";
  external_ref?: string; // idempotency key from provider
  meta?: Record<string, unknown>;
}

export interface IntakeResult {
  person_id: string;
  person_deduped: boolean;
  lead_id: string;
  lead_code: string;
  owner_id: string | null;
  assignment: {
    strategy: string;
    matched_rule_id: string | null;
    reason: string;
  };
  duplicate_lead: boolean;
}

function newLeadCode(): string {
  const s = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `L-${s}-${r}`;
}

/** Find an existing person by phone or email; return null if none. */
async function findExistingPerson(
  sb: SB,
  tenantId: string,
  phone: string | null,
  email: string | null,
) {
  if (!phone && !email) return null;
  let q = sb.from("persons").select("*").eq("tenant_id", tenantId).limit(1);
  if (phone && email) q = q.or(`phone_e164.eq.${phone},email_normalized.eq.${email}`);
  else if (phone) q = q.eq("phone_e164", phone);
  else if (email) q = q.eq("email_normalized", email);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function intakeLead(sb: SB, payload: IntakePayload): Promise<IntakeResult> {
  const phone = normalizePhone(payload.phone ?? null, { defaultDial: payload.default_dial ?? undefined });
  const email = normalizeEmail(payload.email ?? null);

  // 1. Idempotency: if we already ingested this external_ref, return it.
  if (payload.external_ref) {
    const { data: existing } = await sb
      .from("leads")
      .select("id, lead_code, owner_id, person_id")
      .eq("tenant_id", payload.tenant_id)
      .contains("meta", { external_ref: payload.external_ref } as never)
      .maybeSingle();
    if (existing) {
      return {
        person_id: existing.person_id,
        person_deduped: true,
        lead_id: existing.id,
        lead_code: existing.lead_code,
        owner_id: existing.owner_id,
        assignment: { strategy: "existing", matched_rule_id: null, reason: "idempotent_replay" },
        duplicate_lead: true,
      };
    }
  }

  // 2. Find-or-create person.
  let person = await findExistingPerson(sb, payload.tenant_id, phone, email);
  let deduped = true;
  if (!person) {
    const fullName =
      payload.full_name ??
      [payload.first_name, payload.last_name].filter(Boolean).join(" ").trim() ??
      "Unknown Lead";
    const { data: created, error } = await sb
      .from("persons")
      .insert({
        tenant_id: payload.tenant_id,
        full_name: fullName || "Unknown Lead",
        first_name: payload.first_name ?? null,
        last_name: payload.last_name ?? null,
        phone_e164: phone,
        email_normalized: email,
        preferred_language: payload.language ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    person = created;
    deduped = false;

    await sb.rpc("emit_automation_event", {
      _tenant_id: payload.tenant_id,
      _event_type: "person.created",
      _payload: { person_id: created.id, source: `lead_intake.${payload.provider}` } as never,
      _entity_ref: { type: "person", id: created.id } as never,
    });
  }

  // 3. Insert lead.
  const leadCode = newLeadCode();
  const source = payload.source ?? payload.provider;
  const mergedMeta = { ...(payload.meta ?? {}), external_ref: payload.external_ref ?? null };

  const { data: lead, error: leadErr } = await sb
    .from("leads")
    .insert({
      tenant_id: payload.tenant_id,
      person_id: person.id,
      lead_code: leadCode,
      source,
      sub_source: payload.sub_source ?? null,
      campaign_id: payload.campaign_id ?? null,
      meta_campaign_id: payload.meta_campaign_id ?? null,
      google_campaign_id: payload.google_campaign_id ?? null,
      ad_id: payload.ad_id ?? null,
      creative_id: payload.creative_id ?? null,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      utm_term: payload.utm_term ?? null,
      utm_content: payload.utm_content ?? null,
      landing_page: payload.landing_page ?? null,
      referrer: payload.referrer ?? null,
      device: payload.device ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      branch_id: payload.branch_id ?? null,
      franchise_id: payload.franchise_id ?? null,
      priority: payload.priority ?? "normal",
      stage_code: "new",
      meta: mergedMeta as never,
    })
    .select("*")
    .single();
  if (leadErr) throw new Error(leadErr.message);

  // 4. Source history + first-touch attribution
  await sb.from("lead_source_history").insert({
    tenant_id: payload.tenant_id,
    lead_id: lead.id,
    source,
    sub_source: payload.sub_source ?? null,
    campaign_id: payload.campaign_id ?? null,
    meta_campaign_id: payload.meta_campaign_id ?? null,
    google_campaign_id: payload.google_campaign_id ?? null,
    ad_id: payload.ad_id ?? null,
    creative_id: payload.creative_id ?? null,
    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_term: payload.utm_term ?? null,
    utm_content: payload.utm_content ?? null,
    landing_page: payload.landing_page ?? null,
    referrer: payload.referrer ?? null,
    device: payload.device ?? null,
    external_ref: payload.external_ref ?? null,
  });
  await sb.from("attribution_touches").insert({
    tenant_id: payload.tenant_id,
    person_id: person.id,
    lead_id: lead.id,
    touch_kind: "first",
    source,
    campaign_id: payload.campaign_id ?? null,
    meta_campaign_id: payload.meta_campaign_id ?? null,
    google_campaign_id: payload.google_campaign_id ?? null,
    ad_id: payload.ad_id ?? null,
    creative_id: payload.creative_id ?? null,
    utm_source: payload.utm_source ?? null,
    utm_medium: payload.utm_medium ?? null,
    utm_campaign: payload.utm_campaign ?? null,
    utm_term: payload.utm_term ?? null,
    utm_content: payload.utm_content ?? null,
    landing_page: payload.landing_page ?? null,
    device: payload.device ?? null,
  });

  // 5. Assignment rule engine.
  const assignment = await resolveAssignment(sb, {
    lead: {
      id: lead.id,
      tenant_id: payload.tenant_id,
      branch_id: lead.branch_id,
      franchise_id: lead.franchise_id,
      city: lead.city,
      country: lead.country,
      source: lead.source,
      utm_campaign: lead.utm_campaign,
      priority: lead.priority,
      stage_code: lead.stage_code,
      referral_source: lead.referral_source,
      meta: lead.meta as Record<string, unknown>,
    },
    person: {
      language: person.preferred_language,
      vip_flag: person.vip_flag,
      pincode: null,
    },
    context: null,
  });
  if (assignment.owner_id) {
    await sb.from("leads").update({ owner_id: assignment.owner_id }).eq("id", lead.id);
  }

  // 6. Start first-response SLA (best-effort).
  try {
    await startSlaInstance(sb, {
      tenantId: payload.tenant_id,
      entityType: "lead",
      entityId: lead.id,
      kind: "first_response",
    });
  } catch {
    // SLA definitions may not be configured for this tenant yet; skip.
  }

  await sb.rpc("emit_automation_event", {
    _tenant_id: payload.tenant_id,
    _event_type: "lead.intake",
    _payload: {
      lead_id: lead.id,
      provider: payload.provider,
      person_id: person.id,
      owner_id: assignment.owner_id,
      external_ref: payload.external_ref ?? null,
    } as never,
    _entity_ref: { type: "lead", id: lead.id } as never,
  });

  return {
    person_id: person.id,
    person_deduped: deduped,
    lead_id: lead.id,
    lead_code: leadCode,
    owner_id: assignment.owner_id,
    assignment: {
      strategy: assignment.strategy,
      matched_rule_id: assignment.matched_rule_id,
      reason: assignment.reason,
    },
    duplicate_lead: false,
  };
}

// -----------------------------------------------------------------------
// Provider-specific normalizers
// -----------------------------------------------------------------------

/**
 * Meta Lead Ads: `{ leadgen_id, form_id, page_id, campaign_id, ad_id,
 * field_data: [{ name, values: [] }] }`.
 */
export function normalizeMetaLead(tenantId: string, raw: Record<string, unknown>): IntakePayload {
  const fields: Record<string, string> = {};
  const fd = (raw.field_data as Array<{ name: string; values: string[] }>) ?? [];
  for (const f of fd) fields[f.name] = f.values?.[0] ?? "";
  return {
    provider: "meta",
    tenant_id: tenantId,
    full_name: fields.full_name || fields.name || null,
    email: fields.email || null,
    phone: fields.phone_number || fields.phone || null,
    city: fields.city || null,
    source: "meta",
    meta_campaign_id: (raw.campaign_id as string) ?? null,
    ad_id: (raw.ad_id as string) ?? null,
    external_ref: (raw.leadgen_id as string) ?? null,
    meta: { form_id: raw.form_id, page_id: raw.page_id, raw_fields: fields },
  };
}

/** Google Lead Forms: `{ google_key, campaign_id, form_id, user_column_data: [{ column_name, string_value }] }`. */
export function normalizeGoogleLead(tenantId: string, raw: Record<string, unknown>): IntakePayload {
  const fields: Record<string, string> = {};
  const cols =
    (raw.user_column_data as Array<{ column_name: string; string_value: string }>) ?? [];
  for (const c of cols) fields[c.column_name.toLowerCase()] = c.string_value;
  return {
    provider: "google",
    tenant_id: tenantId,
    full_name: fields.full_name || fields.name || null,
    email: fields.email || fields["email address"] || null,
    phone: fields.phone_number || fields.phone || null,
    city: fields.city || null,
    source: "google",
    google_campaign_id: (raw.campaign_id as string) ?? null,
    external_ref: (raw.google_key as string) ?? null,
    meta: { form_id: raw.form_id, raw_fields: fields },
  };
}

/** WhatsApp Business: `{ from, wa_id, profile.name, text, template, message_id }`. */
export function normalizeWhatsAppLead(tenantId: string, raw: Record<string, unknown>): IntakePayload {
  const profile = (raw.profile as { name?: string } | undefined) ?? {};
  const from = (raw.from as string) ?? (raw.wa_id as string) ?? null;
  return {
    provider: "whatsapp",
    tenant_id: tenantId,
    full_name: profile.name ?? null,
    phone: from,
    source: "whatsapp",
    external_ref: (raw.message_id as string) ?? null,
    meta: { text: raw.text, template: raw.template },
  };
}

/** Website Form: `{ full_name, phone, email, treatment, utm_*, page }`. */
export function normalizeWebFormLead(tenantId: string, raw: Record<string, unknown>): IntakePayload {
  return {
    provider: "web_form",
    tenant_id: tenantId,
    full_name: (raw.full_name as string) ?? (raw.name as string) ?? null,
    phone: (raw.phone as string) ?? null,
    email: (raw.email as string) ?? null,
    city: (raw.city as string) ?? null,
    source: "web_form",
    utm_source: raw.utm_source as string,
    utm_medium: raw.utm_medium as string,
    utm_campaign: raw.utm_campaign as string,
    utm_term: raw.utm_term as string,
    utm_content: raw.utm_content as string,
    landing_page: (raw.page as string) ?? (raw.landing_page as string) ?? null,
    referrer: raw.referrer as string,
    device: raw.device as string,
    external_ref: (raw.form_submission_id as string) ?? null,
    meta: { treatment: raw.treatment, message: raw.message },
  };
}

/** AI Consultation: `{ session_id, transcript, severity, recommended_treatment, contact: {...} }`. */
export function normalizeAiConsultationLead(
  tenantId: string,
  raw: Record<string, unknown>,
): IntakePayload {
  const contact = (raw.contact as Record<string, unknown>) ?? {};
  return {
    provider: "ai_consultation",
    tenant_id: tenantId,
    full_name: (contact.full_name as string) ?? null,
    phone: (contact.phone as string) ?? null,
    email: (contact.email as string) ?? null,
    source: "ai_consultation",
    priority: raw.severity === "high" ? "high" : "normal",
    external_ref: (raw.session_id as string) ?? null,
    meta: {
      transcript_summary: raw.summary,
      severity: raw.severity,
      recommended_treatment: raw.recommended_treatment,
    },
  };
}
