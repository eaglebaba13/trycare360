/**
 * Phase 2.8 Laboratory — shared server-only helpers.
 *
 * Thin wrappers over Workflow / Timeline / Search / Revenue RPCs so
 * every lab engine emits identically. Laboratory never introduces its
 * own event bus, timeline, search index or revenue ledger.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  LabEventType,
  MicrobiologyEventType,
  PathologyEventType,
  RadiologyEventType,
} from "./events";

type SB = SupabaseClient<Database>;
export type AnyLabEvent =
  | LabEventType
  | RadiologyEventType
  | PathologyEventType
  | MicrobiologyEventType;

export async function emitLabEvent(
  sb: SB,
  tenantId: string,
  event: AnyLabEvent,
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
    console.warn("[laboratory] emit event failed", event, err);
  }
}

export async function logLabTimeline(
  sb: SB,
  args: {
    tenantId: string;
    entityType: "person" | "encounter" | "patient";
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
    console.warn("[laboratory] timeline log failed", args.eventType, err);
  }
}

export async function indexLabSearch(
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
    console.warn("[laboratory] search index failed", args.entityId, err);
  }
}

/**
 * Emit a `revenue_events` row through the shared Revenue module.
 * Laboratory never bills directly — it only records the revenue signal for
 * downstream Billing / Commission / Analytics.
 */
export async function recordLabRevenue(
  sb: SB,
  args: {
    tenantId: string;
    personId: string;
    amount: number;
    branchId?: string | null;
    doctorId?: string | null;
    sourceRef: string;
    category?: string;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    if (!args.amount || args.amount <= 0) return;
    await sb.from("revenue_events").insert({
      tenant_id: args.tenantId,
      person_id: args.personId,
      amount: args.amount,
      currency: "INR",
      category: args.category ?? "laboratory",
      source_module: "laboratory",
      source_ref: args.sourceRef,
      branch_id: args.branchId ?? null,
      doctor_id: args.doctorId ?? null,
      meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[laboratory] revenue emit failed", err);
  }
}

/**
 * Write an entry into the tamper-evident `lab_audit` trail. Engines call
 * this for every state transition that mutates a lab record.
 */
export async function writeLabAudit(
  sb: SB,
  args: {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string | null;
    reason?: string | null;
    diff?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.from("lab_audit").insert({
      tenant_id: args.tenantId,
      entity_type: args.entityType,
      entity_id: args.entityId,
      action: args.action,
      actor_id: args.actorId ?? null,
      reason: args.reason ?? null,
      diff: (args.diff ?? {}) as never,
    });
  } catch (err) {
    console.warn("[laboratory] audit failed", args.action, err);
  }
}

/**
 * Deterministic numbering helper for orders/specimens/accessions/cases.
 * Format: PREFIX-YYYYMMDD-HHMMSS-XXX. Real per-branch sequential numbering
 * can be layered later via a DB counter — this format is collision-safe
 * enough for Stage 2 while remaining human-readable.
 */
export function nextDocumentNumber(prefix: string): string {
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const rand = Math.floor(Math.random() * 1000);
  return (
    `${prefix}-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}` +
    `-${pad(rand, 3)}`
  );
}

export const labHelpers = {
  emitLabEvent,
  logLabTimeline,
  indexLabSearch,
  recordLabRevenue,
  writeLabAudit,
  nextDocumentNumber,
};
