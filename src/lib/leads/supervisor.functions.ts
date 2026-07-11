/**
 * Supervisor Console — Server Functions.
 * Read-only aggregations + light overrides (priority, reassignment).
 * Reuses existing tables: leads, lead_follow_ups, sla_instances, interactions.
 * No new business logic — thin queries + calls to existing assignLead.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth escape
type SB = any;

export const listTeamStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

    const [{ data: leads }, { data: followUps }, { data: slas }, { data: calls }] =
      await Promise.all([
        supabase
          .from("leads")
          .select("owner_id, status, stage_code, lead_score, created_at, converted_at, expected_value")
          .eq("tenant_id", data.tenant_id)
          .not("owner_id", "is", null),
        supabase
          .from("lead_follow_ups")
          .select("owner_id, status, due_at")
          .eq("tenant_id", data.tenant_id),
        supabase
          .from("sla_instances")
          .select("assigned_to, status, breached_at")
          .eq("tenant_id", data.tenant_id)
          .eq("entity_type", "lead"),
        supabase
          .from("interactions")
          .select("owner_id, channel, occurred_at, duration_sec, outcome")
          .eq("tenant_id", data.tenant_id)
          .gte("occurred_at", startOfDay),
      ]);

    const by = new Map<string, {
      owner_id: string;
      total: number; open: number; hot: number; converted_today: number;
      revenue_today: number; pending_followups: number; missed_followups: number;
      sla_open: number; sla_breached: number; calls_today: number; talk_time: number;
    }>();
    const get = (id: string) => {
      let r = by.get(id);
      if (!r) {
        r = { owner_id: id, total: 0, open: 0, hot: 0, converted_today: 0, revenue_today: 0,
          pending_followups: 0, missed_followups: 0, sla_open: 0, sla_breached: 0, calls_today: 0, talk_time: 0 };
        by.set(id, r);
      }
      return r;
    };

    const startTs = Date.parse(startOfDay);
    for (const l of leads ?? []) {
      const r = get(l.owner_id);
      r.total++;
      if (l.status === "open") r.open++;
      if (Number(l.lead_score ?? 0) >= 70) r.hot++;
      if (l.converted_at && Date.parse(l.converted_at) >= startTs) {
        r.converted_today++;
        r.revenue_today += Number(l.expected_value ?? 0);
      }
    }
    const now = Date.now();
    for (const f of followUps ?? []) {
      if (!f.owner_id) continue;
      const r = get(f.owner_id);
      if (f.status === "pending") {
        r.pending_followups++;
        if (Date.parse(f.due_at) < now) r.missed_followups++;
      }
    }
    for (const s of slas ?? []) {
      if (!s.assigned_to) continue;
      const r = get(s.assigned_to);
      if (s.status === "open") r.sla_open++;
      if (s.breached_at) r.sla_breached++;
    }
    for (const c of calls ?? []) {
      if (!c.owner_id) continue;
      const r = get(c.owner_id);
      if (c.channel === "call") {
        r.calls_today++;
        r.talk_time += Number(c.duration_sec ?? 0);
      }
    }
    return { rows: [...by.values()].sort((a, b) => b.total - a.total) };
  });

export const listQueueDistribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: rows } = await supabase
      .from("leads")
      .select("owner_id, stage_code, priority, status")
      .eq("tenant_id", data.tenant_id)
      .eq("status", "open");
    const byOwner = new Map<string, Record<string, number>>();
    for (const r of rows ?? []) {
      const owner = r.owner_id ?? "unassigned";
      const bucket = byOwner.get(owner) ?? {};
      bucket[r.stage_code] = (bucket[r.stage_code] ?? 0) + 1;
      bucket.total = (bucket.total ?? 0) + 1;
      byOwner.set(owner, bucket);
    }
    return { distribution: [...byOwner.entries()].map(([owner_id, buckets]) => ({ owner_id, ...buckets })) };
  });

export const overrideSlaPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid, priority: z.enum(["low", "normal", "high", "critical"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const supabase = context.supabase as SB;
    const { data: cur } = await supabase.from("sla_instances").select("meta").eq("id", data.id).single();
    const meta = { ...(cur?.meta ?? {}), priority: data.priority, priority_override_at: new Date().toISOString() };
    const { data: row, error } = await supabase
      .from("sla_instances")
      .update({ meta })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return { sla: row };
  });
