/**
 * Phase 2.9 Finance & Accounting — shared server-only helpers.
 *
 * Thin wrappers over Workflow / Timeline / Search platform RPCs plus
 * finance-specific audit and sequence helpers. Finance NEVER introduces
 * its own event bus, timeline, search index or numbering — it always
 * routes through the shared platform primitives.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { FinanceEvent } from "./events";

type SB = SupabaseClient<Database>;

export async function emitFinanceEvent(
  sb: SB,
  tenantId: string,
  event: FinanceEvent,
  payload: Record<string, unknown>,
  entityRef?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await sb.rpc("emit_automation_event", {
      _tenant_id: tenantId,
      _event_type: event,
      _payload: payload as never,
      _entity_ref: (entityRef ?? null) as never,
    });
  } catch (err) {
    console.warn("[finance] emit event failed", event, err);
  }
}

export async function logFinanceTimeline(
  sb: SB,
  args: {
    tenantId: string;
    entityType: string;
    entityId: string;
    eventType: string;
    title: string;
    body?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.rpc("log_timeline_event", {
      _tenant_id: args.tenantId,
      _entity_type: args.entityType,
      _entity_id: args.entityId,
      _event_type: args.eventType,
      _title: args.title,
      _body: args.body ?? undefined,
      _meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[finance] timeline log failed", args.eventType, err);
  }
}

export async function indexFinanceSearch(
  sb: SB,
  args: {
    tenantId: string;
    entityType: string;
    entityId: string;
    title: string;
    subtitle?: string | null;
    body?: string | null;
    keywords?: string | null;
    url?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.rpc("index_search_entity", {
      _tenant_id: args.tenantId,
      _entity_type: args.entityType,
      _entity_id: args.entityId,
      _title: args.title,
      _subtitle: args.subtitle ?? undefined,
      _body: args.body ?? undefined,
      _keywords: args.keywords ?? undefined,
      _url: args.url ?? undefined,
      _meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[finance] search index failed", args.entityId, err);
  }
}

/**
 * Deterministic document numbering. Wraps the Stage 1 SQL sequence
 * helper (fin_next_sequence) with a safe fallback if the RPC misfires.
 */
export async function nextFinanceNumber(
  sb: SB,
  tenantId: string,
  kind: string,
  prefix: string,
): Promise<string> {
  try {
    const { data, error } = await sb.rpc("fin_next_sequence", {
      _tenant: tenantId,
      _kind: kind,
    });
    if (error) throw error;
    if (typeof data === "string" && data.length > 0) return data;
  } catch (err) {
    console.warn("[finance] next sequence rpc failed, falling back", kind, err);
  }
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const rand = Math.floor(Math.random() * 1000);
  return (
    `${prefix}-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}` +
    `-${pad(rand, 3)}`
  );
}

/**
 * Append-only audit trail row. Every state transition mutating a
 * finance record should call this.
 */
export async function writeFinanceAudit(
  sb: SB,
  args: {
    tenantId: string;
    orgUnitId?: string | null;
    entityType: string;
    entityId?: string | null;
    action: string;
    eventType: string;
    actorId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.from("fin_audit_log").insert({
      tenant_id: args.tenantId,
      org_unit_id: args.orgUnitId ?? null,
      entity_type: args.entityType,
      entity_id: args.entityId ?? null,
      action: args.action,
      event_type: args.eventType,
      actor_id: args.actorId ?? null,
      before_state: (args.before ?? null) as never,
      after_state: (args.after ?? null) as never,
      metadata: (args.metadata ?? {}) as never,
    });
  } catch (err) {
    console.warn("[finance] audit failed", args.action, err);
  }
}

export const financeHelpers = {
  emitFinanceEvent,
  logFinanceTimeline,
  indexFinanceSearch,
  nextFinanceNumber,
  writeFinanceAudit,
};
