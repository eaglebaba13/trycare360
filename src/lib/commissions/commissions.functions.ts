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
