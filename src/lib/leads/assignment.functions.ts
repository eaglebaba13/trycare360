/**
 * Lead Assignment — Server Functions.
 * Exposes the rule engine + rule CRUD to the app.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

const conditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "ne", "in", "not_in", "gte", "lte", "contains", "exists"]),
  value: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()])), z.null()])
    .optional(),
});

const ruleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  priority: z.number().int().default(100),
  is_active: z.boolean().default(true),
  conditions: z.array(conditionSchema).default([]),
  strategy: z.enum(["fixed", "manual", "round_robin", "least_busy", "skill_based", "branch_based"]),
  fixed_owner_id: uuid.nullable().optional(),
  pool_owner_ids: z.array(uuid).default([]),
  required_skills: z.array(z.string()).default([]),
  working_hours: z
    .object({ from: z.string(), to: z.string(), days: z.array(z.number().int().min(0).max(6)).optional() })
    .optional(),
});

export const listAssignmentRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { loadRules } = await import("./assignment.server");
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const rules = await loadRules(context.supabase as any, data.tenant_id);
    return { rules };
  });

export const saveAssignmentRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid, rules: z.array(ruleSchema) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { saveRules } = await import("./assignment.server");
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    await saveRules(context.supabase as any, data.tenant_id, data.rules);
    return { ok: true, count: data.rules.length };
  });

export const previewAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        lead: z.record(z.string(), z.unknown()),
        person: z.record(z.string(), z.unknown()).nullable().optional(),
        context: z.record(z.string(), z.unknown()).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { resolveAssignment } = await import("./assignment.server");
    const result = await resolveAssignment(
      // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
      context.supabase as any,
      {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic lead shape
        lead: { tenant_id: data.tenant_id, ...(data.lead as any) },
        // biome-ignore lint/suspicious/noExplicitAny: dynamic
        person: (data.person ?? null) as any,
        // biome-ignore lint/suspicious/noExplicitAny: dynamic
        context: (data.context ?? null) as any,
      },
    );
    return result;
  });

export const autoAssignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lead_id: uuid, reason: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    const { resolveAssignment } = await import("./assignment.server");
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const supabase = context.supabase as any;
    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", data.lead_id).single();
    if (error) throw error;

    const { data: person } = await supabase
      .from("persons")
      .select("preferred_language, vip_flag")
      .eq("id", lead.person_id)
      .maybeSingle();

    const result = await resolveAssignment(supabase, {
      lead,
      person: person
        ? { language: person.preferred_language, vip_flag: person.vip_flag, pincode: null }
        : null,
      context: null,
    });

    if (result.owner_id && result.owner_id !== lead.owner_id) {
      await supabase
        .from("leads")
        .update({ owner_id: result.owner_id })
        .eq("id", lead.id);
    }
    return result;
  });
