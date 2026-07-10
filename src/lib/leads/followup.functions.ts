/**
 * Follow-up Queue — Server Functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const scheduleFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        lead_id: uuid,
        due_at: z.string(),
        kind: z.enum(["call", "whatsapp", "email", "sms", "task", "callback"]).default("call"),
        notes: z.string().max(2000).optional(),
        owner_id: uuid.nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const supabase = context.supabase as any;
    const { data: row, error } = await supabase
      .from("lead_follow_ups")
      .insert({
        tenant_id: data.tenant_id,
        lead_id: data.lead_id,
        due_at: data.due_at,
        kind: data.kind,
        notes: data.notes ?? null,
        owner_id: data.owner_id ?? null,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;

    await supabase.from("leads").update({ next_follow_up_at: data.due_at }).eq("id", data.lead_id);

    await supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: "lead.follow_up_scheduled",
      _payload: { lead_id: data.lead_id, follow_up_id: row.id, due_at: data.due_at, kind: data.kind },
      _entity_ref: { type: "lead", id: data.lead_id },
    });

    return { follow_up: row };
  });

export const completeFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, outcome: z.string().optional() }).parse(d))
  .handler(async ({ context, data }) => {
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const supabase = context.supabase as any;
    const { data: row, error } = await supabase
      .from("lead_follow_ups")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    await supabase.rpc("emit_automation_event", {
      _tenant_id: row.tenant_id,
      _event_type: "lead.follow_up_completed",
      _payload: { follow_up_id: row.id, lead_id: row.lead_id, outcome: data.outcome ?? null },
      _entity_ref: { type: "lead", id: row.lead_id },
    });
    return { follow_up: row };
  });

export const snoozeFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, new_due_at: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const supabase = context.supabase as any;
    const { data: row, error } = await supabase
      .from("lead_follow_ups")
      .update({ due_at: data.new_due_at })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return { follow_up: row };
  });

export const listFollowUps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        owner_id: uuid.nullable().optional(),
        before: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { FollowUpRepository } = await import("./repositories.server");
    // biome-ignore lint/suspicious/noExplicitAny: SB generic depth
    const repo = new FollowUpRepository(context.supabase as any);
    const rows = await repo.listDue({
      tenantId: data.tenant_id,
      ownerId: data.owner_id ?? null,
      before: data.before,
      limit: data.limit,
      offset: data.offset,
    });
    return { rows };
  });
