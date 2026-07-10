/**
 * Revenue Attribution — Server Functions (Stage 1 skeletons).
 * Full ROI/LTV analytics arrive in Stage 6.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
type SB = any;

export const recordRevenueEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        person_id: uuid,
        source_module: z.string(),
        source_ref: z.string().optional(),
        category: z.enum(["treatment", "product", "membership", "subscription", "consultation", "other"]),
        amount: z.number().nonnegative(),
        currency: z.string().length(3).default("INR"),
        occurred_at: z.string().datetime().optional(),
        lead_id: uuid.optional(),
        doctor_id: uuid.optional(),
        therapist_id: uuid.optional(),
        branch_id: uuid.optional(),
        franchise_id: uuid.optional(),
        master_franchise_id: uuid.optional(),
        product_id: uuid.optional(),
        treatment_id: uuid.optional(),
        membership_id: uuid.optional(),
        subscription_id: uuid.optional(),
        meta: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: id, error } = await supabase.rpc("record_revenue_event", {
      _tenant_id: data.tenant_id,
      _person_id: data.person_id,
      _source_module: data.source_module,
      _source_ref: data.source_ref ?? null,
      _category: data.category,
      _amount: data.amount,
      _currency: data.currency,
      _occurred_at: data.occurred_at ?? new Date().toISOString(),
      _lead_id: data.lead_id ?? null,
      _doctor_id: data.doctor_id ?? null,
      _therapist_id: data.therapist_id ?? null,
      _branch_id: data.branch_id ?? null,
      _franchise_id: data.franchise_id ?? null,
      _master_franchise_id: data.master_franchise_id ?? null,
      _product_id: data.product_id ?? null,
      _treatment_id: data.treatment_id ?? null,
      _membership_id: data.membership_id ?? null,
      _subscription_id: data.subscription_id ?? null,
      _meta: data.meta,
    });
    if (error) throw error;
    return { id: id as string };
  });

export const listCreditsForPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: uuid, person_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: rows, error } = await supabase
      .from("attribution_credits")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .eq("person_id", data.person_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { rows: rows ?? [] };
  });

export const getLtvForPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ person_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: row } = await supabase.from("ltv_person").select("*").eq("person_id", data.person_id).maybeSingle();
    return { ltv: row ?? null };
  });
