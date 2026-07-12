/**
 * Phase 2.6 Pharmacy — shared server-only helpers.
 *
 * Wraps the platform-wide Workflow Engine, Timeline, and Search RPCs so
 * every pharmacy engine emits events identically. Pharmacy NEVER
 * introduces its own event bus.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PharmacyEventType } from "./events";

type SB = SupabaseClient<Database>;

export async function emitPharmacyEvent(
  sb: SB,
  tenantId: string,
  event: PharmacyEventType,
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
    console.warn("[pharmacy] emit event failed", event, err);
  }
}

export async function logPharmacyTimeline(
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
    console.warn("[pharmacy] timeline log failed", args.eventType, err);
  }
}

export async function indexPharmacySearch(
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
    console.warn("[pharmacy] search index failed", args.entityId, err);
  }
}

/**
 * Emit a `revenue_events` row through the shared Revenue module. Pharmacy
 * never bills directly — it only records the revenue signal for
 * downstream Billing / Commission / Analytics.
 */
export async function recordPharmacyRevenue(
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
      category: args.category ?? "pharmacy_dispense",
      source_module: "pharmacy",
      source_ref: args.sourceRef,
      branch_id: args.branchId ?? null,
      doctor_id: args.doctorId ?? null,
      meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[pharmacy] revenue emit failed", err);
  }
}

/**
 * Deterministic numbering helper: PREFIX-YYYYMMDD-HHMMSS-XXX. Real
 * per-branch sequential numbering can be layered later; for Stage 2 we
 * generate a collision-safe number without a DB counter.
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

export const pharmacyHelpers = {
  emitPharmacyEvent,
  logPharmacyTimeline,
  indexPharmacySearch,
  recordPharmacyRevenue,
  nextDocumentNumber,
};
