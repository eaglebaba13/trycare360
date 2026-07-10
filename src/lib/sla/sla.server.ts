/**
 * SLA Service (server-only).
 *
 * - startSlaInstance: create an open SLA instance from an active
 *   sla_definitions row (by kind). No-op if no definition exists.
 * - satisfySla: mark all matching open instances as satisfied (e.g.
 *   first response logged, follow-up completed).
 * - runEscalations: walk open, past-due instances and emit
 *   sla.escalated / sla.breached events + bump escalation_level per
 *   sla_definitions.escalation_rules JSON.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { SlaDefinitionRepository, SlaInstanceRepository } from "./repositories.server";

type SB = SupabaseClient<Database>;

export interface EscalationRule {
  after_minutes: number;
  notify?: string[]; // role codes / user ids
  action?: "reassign" | "notify" | "escalate";
  level?: number;
}

export async function startSlaInstance(
  sb: SB,
  args: {
    tenantId: string;
    entityType: "lead" | "interaction" | "follow_up" | string;
    entityId: string;
    kind: "first_response" | "follow_up" | "callback" | "stage_dwell";
    meta?: Record<string, unknown>;
  },
): Promise<{ id: string; due_at: string } | null> {
  const defs = new SlaDefinitionRepository(sb);
  const def = await defs.findActive(args.tenantId, args.kind);
  if (!def) return null;

  const due = new Date(Date.now() + def.target_minutes * 60_000).toISOString();
  const inst = await new SlaInstanceRepository(sb).insert({
    tenant_id: args.tenantId,
    entity_type: args.entityType,
    entity_id: args.entityId,
    sla_def_id: def.id,
    sla_kind: args.kind,
    due_at: due,
    status: "open",
    meta: (args.meta ?? {}) as never,
  });

  await sb.rpc("emit_automation_event", {
    _tenant_id: args.tenantId,
    _event_type: "sla.started",
    _payload: {
      sla_instance_id: inst.id,
      kind: args.kind,
      entity_type: args.entityType,
      entity_id: args.entityId,
      due_at: due,
    } as never,
    _entity_ref: { type: args.entityType, id: args.entityId } as never,
  });

  return { id: inst.id, due_at: due };
}

export async function satisfySla(
  sb: SB,
  args: { entityType: string; entityId: string; kind?: string },
): Promise<number> {
  return new SlaInstanceRepository(sb).satisfy(args.entityType, args.entityId, args.kind);
}

/**
 * Walk breached/past-due open instances, emit events, and escalate to
 * the next level defined on sla_definitions.escalation_rules[].
 * Called by pg_cron or the operator manually.
 */
export async function runEscalations(sb: SB, tenantId: string): Promise<{ escalated: number; breached: number }> {
  const repo = new SlaInstanceRepository(sb);
  const now = new Date().toISOString();
  const open = await repo.listOpen(tenantId, now);

  let escalated = 0;
  let breached = 0;
  for (const inst of open) {
    // Load definition escalation rules
    if (!inst.sla_def_id) continue;
    const { data: def } = await sb
      .from("sla_definitions")
      .select("escalation_rules")
      .eq("id", inst.sla_def_id)
      .maybeSingle();
    const rules = (def?.escalation_rules ?? []) as unknown as EscalationRule[];
    const overdueMin = Math.max(0, Math.floor((Date.now() - new Date(inst.due_at).getTime()) / 60000));
    const nextLevel = (inst.escalation_level ?? 0) + 1;
    const matched = rules.find(
      (r) => (r.level ?? nextLevel) === nextLevel && overdueMin >= r.after_minutes,
    );

    if (matched) {
      await repo.escalate(inst.id, nextLevel, { last_escalation: matched });
      await sb.rpc("emit_automation_event", {
        _tenant_id: tenantId,
        _event_type: "sla.escalated",
        _payload: {
          sla_instance_id: inst.id,
          kind: inst.sla_kind,
          entity_type: inst.entity_type,
          entity_id: inst.entity_id,
          level: nextLevel,
          notify: matched.notify ?? [],
          action: matched.action ?? "notify",
        } as never,
        _entity_ref: { type: inst.entity_type, id: inst.entity_id } as never,
      });
      escalated++;
    } else {
      // No further rule → mark breached
      const { error } = await sb
        .from("sla_instances")
        .update({ status: "breached", breached_at: new Date().toISOString() })
        .eq("id", inst.id);
      if (!error) {
        breached++;
        await sb.rpc("emit_automation_event", {
          _tenant_id: tenantId,
          _event_type: "sla.breached",
          _payload: {
            sla_instance_id: inst.id,
            kind: inst.sla_kind,
            entity_type: inst.entity_type,
            entity_id: inst.entity_id,
          } as never,
          _entity_ref: { type: inst.entity_type, id: inst.entity_id } as never,
        });
      }
    }
  }
  return { escalated, breached };
}
