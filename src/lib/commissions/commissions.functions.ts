/**
 * Commission & Incentive Engine — Server Functions (Stage 1 skeletons).
 * Calculation, review workflow and payout land in later stages.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
type SB = any;

export const listBeneficiaryTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as SB;
    const { data, error } = await supabase
      .from("commission_beneficiary_types")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return { rows: data ?? [] };
  });

export const listPlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: rows, error } = await supabase
      .from("commission_plans")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("beneficiary_type")
      .order("version", { ascending: false });
    if (error) throw error;
    return { rows: rows ?? [] };
  });

export const upsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        tenant_id: uuid,
        code: z.string().min(1).max(64),
        name: z.string().min(1).max(255),
        beneficiary_type: z.string(),
        currency: z.string().length(3).default("INR"),
        effective_from: z.string().datetime().optional(),
        effective_to: z.string().datetime().nullable().optional(),
        status: z.enum(["draft", "active", "archived"]).default("draft"),
        notes: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    if (data.id) {
      // bump version + snapshot old
      const { data: existing } = await supabase.from("commission_plans").select("*").eq("id", data.id).single();
      if (existing) {
        await supabase.from("commission_plan_versions").insert({
          tenant_id: existing.tenant_id,
          plan_id: existing.id,
          version: existing.version,
          snapshot: existing,
        });
      }
      const { data: row, error } = await supabase
        .from("commission_plans")
        .update({
          name: data.name,
          currency: data.currency,
          effective_from: data.effective_from,
          effective_to: data.effective_to,
          status: data.status,
          notes: data.notes,
          version: (existing?.version ?? 1) + 1,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return { plan: row };
    }
    const { data: row, error } = await supabase.from("commission_plans").insert(data).select("*").single();
    if (error) throw error;
    return { plan: row };
  });

export const listAccruals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        period_key: z.string().optional(),
        beneficiary_type: z.string().optional(),
        beneficiary_id: uuid.optional(),
        status: z
          .enum(["draft", "calculated", "under_review", "approved", "locked", "paid", "hold", "reversed"])
          .optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    let q = supabase
      .from("commission_accruals")
      .select("*", { count: "exact" })
      .eq("tenant_id", data.tenant_id)
      .order("computed_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.period_key) q = q.eq("period_key", data.period_key);
    if (data.beneficiary_type) q = q.eq("beneficiary_type", data.beneficiary_type);
    if (data.beneficiary_id) q = q.eq("beneficiary_id", data.beneficiary_id);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

// ============================================================
// Stage-2: rule/assignment CRUD, preview and re-compute
// ============================================================

export const upsertRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        tenant_id: uuid,
        plan_id: uuid,
        calc_kind: z.enum([
          "fixed",
          "percent",
          "slab",
          "target",
          "revenue",
          "product",
          "treatment",
          "membership",
          "subscription",
          "campaign",
        ]),
        applies_to: z.record(z.string(), z.unknown()).default({}),
        calc_config: z.record(z.string(), z.unknown()).default({}),
        priority: z.number().int().default(100),
        effective_from: z.string().datetime().optional(),
        effective_to: z.string().datetime().nullable().optional(),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: row, error } = await supabase
      .from("commission_rules")
      .upsert(data)
      .select("*")
      .single();
    if (error) throw error;
    await supabase.from("commission_audit_logs").insert({
      tenant_id: data.tenant_id,
      plan_id: data.plan_id,
      rule_id: row.id,
      actor_id: context.userId,
      action: data.id ? "rule.updated" : "rule.created",
      after: row,
    });
    return { rule: row };
  });

export const upsertAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        tenant_id: uuid,
        plan_id: uuid,
        beneficiary_type: z.string(),
        beneficiary_id: uuid,
        entity_scope: z
          .enum(["global", "branch", "franchise", "campaign", "doctor", "referral", "corporate", "influencer", "academy"])
          .default("global"),
        scope_ref: uuid.nullable().optional(),
        effective_from: z.string().datetime().optional(),
        effective_to: z.string().datetime().nullable().optional(),
        split_pct: z.number().min(0).max(100).nullable().optional(),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: row, error } = await supabase
      .from("commission_assignments")
      .upsert(data)
      .select("*")
      .single();
    if (error) throw error;
    return { assignment: row };
  });

export const previewCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ revenue_event_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: re, error } = await supabase
      .from("revenue_events")
      .select("*")
      .eq("id", data.revenue_event_id)
      .maybeSingle();
    if (error) throw error;
    if (!re) return { previews: [] };
    const { previewCommissionsForEvent } = await import("./calc.server");
    const previews = await previewCommissionsForEvent(supabase, re);
    return { previews };
  });

export const previewCommissionForRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        amount: z.number().nonnegative(),
        currency: z.string().length(3).default("INR"),
        category: z.enum(["treatment", "product", "membership", "subscription", "consultation", "other"]),
        branch_id: uuid.optional(),
        franchise_id: uuid.optional(),
        product_id: uuid.optional(),
        treatment_id: uuid.optional(),
        membership_id: uuid.optional(),
        subscription_id: uuid.optional(),
        doctor_id: uuid.optional(),
        occurred_at: z.string().datetime().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    // Simulate a synthetic revenue event WITHOUT persisting.
    const synthetic = {
      id: "00000000-0000-0000-0000-000000000000",
      tenant_id: data.tenant_id,
      person_id: "00000000-0000-0000-0000-000000000000",
      lead_id: null,
      source_module: "preview",
      source_ref: null,
      category: data.category,
      amount: data.amount,
      currency: data.currency,
      occurred_at: data.occurred_at ?? new Date().toISOString(),
      doctor_id: data.doctor_id ?? null,
      therapist_id: null,
      branch_id: data.branch_id ?? null,
      franchise_id: data.franchise_id ?? null,
      master_franchise_id: null,
      product_id: data.product_id ?? null,
      treatment_id: data.treatment_id ?? null,
      membership_id: data.membership_id ?? null,
      subscription_id: data.subscription_id ?? null,
      meta: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { previewCommissionsForEvent } = await import("./calc.server");
    // biome-ignore lint/suspicious/noExplicitAny: synthetic passes shape check
    const previews = await previewCommissionsForEvent(supabase, synthetic as any);
    return { previews };
  });

export const recomputeCommissionsForEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ revenue_event_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { accrueCommissionsForEvent } = await import("./calc.server");
    return accrueCommissionsForEvent(context.supabase as SB, data.revenue_event_id);
  });
