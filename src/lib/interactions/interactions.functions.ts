/**
 * Unified Interaction Engine — Server Functions (Stage 1).
 * Every touch (call, WhatsApp, email, SMS, note, AI consult, workflow, etc.)
 * flows through log_interaction() so timeline + search + workflow are wired.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listInteractionsSchema, logInteractionSchema } from "./validators";

// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
type SB = any;

export const logInteraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => logInteractionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: id, error } = await supabase.rpc("log_interaction", {
      _tenant_id: data.tenant_id,
      _person_id: data.person_id,
      _channel: data.channel,
      _direction: data.direction,
      _subject: data.subject ?? null,
      _body: data.body ?? null,
      _lead_id: data.lead_id ?? null,
      _patient_id: data.patient_id ?? null,
      _outcome: data.outcome ?? null,
      _disposition_code: data.disposition_code ?? null,
      _duration_sec: data.duration_sec ?? null,
      _occurred_at: data.occurred_at ?? new Date().toISOString(),
      _owner_id: data.owner_id ?? null,
      _source: data.source ?? null,
      _external_ref: data.external_ref ?? null,
      _attachments: data.attachments,
      _meta: data.meta,
    });
    if (error) throw error;
    return { id: id as string };
  });

export const listInteractions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listInteractionsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    let q = supabase
      .from("interactions")
      .select("*", { count: "exact" })
      .eq("tenant_id", data.tenant_id)
      .order("occurred_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.person_id) q = q.eq("person_id", data.person_id);
    if (data.lead_id) q = q.eq("lead_id", data.lead_id);
    if (data.patient_id) q = q.eq("patient_id", data.patient_id);
    if (data.channels?.length) q = q.in("channel", data.channels);
    if (data.from) q = q.gte("occurred_at", data.from);
    if (data.to) q = q.lte("occurred_at", data.to);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });
