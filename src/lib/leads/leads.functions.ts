/**
 * Lead 360 — Server Functions (Stage 1).
 * All mutations flow through here. UI arrives in later stages.
 * Identity is preserved: every lead references public.persons.id.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  leadAssignSchema,
  leadConvertSchema,
  leadCreateSchema,
  leadIdSchema,
  leadListSchema,
  leadStageChangeSchema,
  leadUpdateSchema,
} from "./validators";

// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
type SB = any;

function newLeadCode() {
  const now = new Date();
  const s = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `L-${s}-${r}`;
}

export const createLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const payload = { ...data, lead_code: data.lead_code ?? newLeadCode() };
    const { data: row, error } = await supabase.from("leads").insert(payload).select("*").single();
    if (error) throw error;

    if (data.source || data.campaign_id || data.utm_campaign) {
      await supabase.from("lead_source_history").insert({
        tenant_id: data.tenant_id,
        lead_id: row.id,
        source: data.source,
        sub_source: data.sub_source,
        campaign_id: data.campaign_id,
        meta_campaign_id: data.meta_campaign_id,
        google_campaign_id: data.google_campaign_id,
        ad_id: data.ad_id,
        creative_id: data.creative_id,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        landing_page: data.landing_page,
        referrer: data.referrer,
        device: data.device,
      });

      await supabase.from("attribution_touches").insert({
        tenant_id: data.tenant_id,
        person_id: data.person_id,
        lead_id: row.id,
        touch_kind: "first",
        source: data.source,
        campaign_id: data.campaign_id,
        meta_campaign_id: data.meta_campaign_id,
        google_campaign_id: data.google_campaign_id,
        ad_id: data.ad_id,
        creative_id: data.creative_id,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        utm_term: data.utm_term,
        utm_content: data.utm_content,
        landing_page: data.landing_page,
        device: data.device,
      });
    }
    return { lead: row };
  });

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    let q = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.stage_code) q = q.eq("stage_code", data.stage_code);
    if (data.owner_id) q = q.eq("owner_id", data.owner_id);
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    if (data.franchise_id) q = q.eq("franchise_id", data.franchise_id);
    if (data.source) q = q.eq("source", data.source);
    if (data.q) q = q.ilike("lead_code", `%${data.q}%`);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: row, error } = await supabase.from("leads").select("*").eq("id", data.id).single();
    if (error) throw error;
    return { lead: row };
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { id, ...patch } = data;
    const { data: row, error } = await supabase.from("leads").update(patch).eq("id", id).select("*").single();
    if (error) throw error;
    return { lead: row };
  });

export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadAssignSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    // Trigger writes lead_assignments history on owner change.
    const { data: row, error } = await supabase
      .from("leads")
      .update({ owner_id: data.owner_id })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    if (data.reason || data.assignment_kind) {
      await supabase
        .from("lead_assignments")
        .update({ reason: data.reason ?? null, assignment_kind: data.assignment_kind })
        .eq("lead_id", data.id)
        .is("ended_at", null);
    }
    return { lead: row };
  });

export const moveStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadStageChangeSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    // biome-ignore lint/suspicious/noExplicitAny: dynamic patch
    const patch: any = { stage_code: data.stage_code };
    if (data.stage_code === "won") {
      patch.status = "won";
      patch.won_reason_id = data.won_reason_id ?? null;
    } else if (data.stage_code === "lost") {
      patch.status = "lost";
      patch.lost_reason_id = data.lost_reason_id ?? null;
    }
    const { data: row, error } = await supabase.from("leads").update(patch).eq("id", data.id).select("*").single();
    if (error) throw error;
    return { lead: row };
  });

export const convertLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => leadConvertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: lead, error: e1 } = await supabase.from("leads").select("*").eq("id", data.id).single();
    if (e1) throw e1;

    let revenueEventId: string | null = null;
    if (data.revenue) {
      const { data: reId, error: e2 } = await supabase.rpc("record_revenue_event", {
        _tenant_id: lead.tenant_id,
        _person_id: lead.person_id,
        _source_module: data.revenue.source_module,
        _source_ref: data.revenue.source_ref ?? data.ref ?? lead.id,
        _category: data.revenue.category,
        _amount: data.revenue.amount,
        _currency: data.revenue.currency,
        _lead_id: lead.id,
        _doctor_id: data.revenue.doctor_id ?? null,
        _therapist_id: data.revenue.therapist_id ?? null,
        _branch_id: data.revenue.branch_id ?? lead.branch_id,
        _franchise_id: data.revenue.franchise_id ?? lead.franchise_id,
        _master_franchise_id: data.revenue.master_franchise_id ?? lead.master_franchise_id,
        _product_id: data.revenue.product_id ?? null,
        _treatment_id: data.revenue.treatment_id ?? null,
        _membership_id: data.revenue.membership_id ?? null,
        _subscription_id: data.revenue.subscription_id ?? null,
      });
      if (e2) throw e2;
      revenueEventId = reId as string;
    }

    const { data: updated, error: e3 } = await supabase
      .from("leads")
      .update({
        converted_person_id: lead.person_id,
        converted_at: new Date().toISOString(),
        converted_to: data.to,
        stage_code: "won",
        status: "won",
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (e3) throw e3;

    return { lead: updated, revenue_event_id: revenueEventId };
  });
