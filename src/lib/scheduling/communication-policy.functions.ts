/**
 * Communication Policy — CRUD server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

const policyInputSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  code: z.string().min(2).max(80),
  name: z.string().min(2).max(200),
  scope: z.enum(["tenant", "branch", "service"]).default("tenant"),
  branch_id: uuid.nullish(),
  service_id: uuid.nullish(),
  channels_order: z.array(z.string()).default(["whatsapp", "sms", "email", "push"]),
  reminder_offsets_minutes: z.array(z.number().int().positive()).default([1440, 120, 30]),
  templates: z.record(z.string()).default({}),
  quiet_hours_start: z.string().nullish(),
  quiet_hours_end: z.string().nullish(),
  retry_max_attempts: z.number().int().min(0).max(10).default(3),
  retry_backoff_minutes: z.number().int().min(1).max(1440).default(15),
  language: z.string().min(2).max(10).default("en"),
  respect_person_preferences: z.boolean().default(true),
  is_active: z.boolean().default(true),
  priority: z.number().int().default(100),
});

export const listCommunicationPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("communication_policies")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("priority")
      .order("name");
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const upsertCommunicationPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => policyInputSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { id, ...patch } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("communication_policies")
        .update(patch as never)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { policy: row };
    }
    const { data: row, error } = await context.supabase
      .from("communication_policies")
      .insert(patch as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { policy: row };
  });

export const deleteCommunicationPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("communication_policies")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
