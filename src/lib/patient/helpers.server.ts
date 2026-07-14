/**
 * Phase 2.10 Patient Portal — shared server-only helpers.
 *
 * Every helper is a thin wrapper over an existing PLATFORM RPC. The
 * Patient Portal never rolls its own event bus, timeline, search index
 * or notification pipeline.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import type { PatientEvent } from "./events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export async function emitPatientEvent(
  sb: SB,
  args: {
    tenantId?: string | null;
    event: PatientEvent;
    payload: Record<string, unknown>;
    entityRef?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await sb.rpc("emit_automation_event", {
      _tenant_id: args.tenantId ?? null,
      _event_type: args.event,
      _payload: args.payload as never,
      _entity_ref: (args.entityRef ?? null) as never,
    });
  } catch (err) {
    console.warn("[patient] emit event failed", args.event, err);
  }
}

export async function logPatientTimeline(
  sb: SB,
  args: {
    tenantId?: string | null;
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
      _tenant_id: args.tenantId ?? null,
      _entity_type: args.entityType,
      _entity_id: args.entityId,
      _event_type: args.eventType,
      _title: args.title,
      _body: args.body ?? undefined,
      _meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[patient] timeline log failed", args.eventType, err);
  }
}

export async function indexPatientSearch(
  sb: SB,
  args: {
    tenantId?: string | null;
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
      _tenant_id: args.tenantId ?? null,
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
    console.warn("[patient] search index failed", args.entityId, err);
  }
}

/**
 * Resolve the platform patient row for the currently authenticated user.
 * The Patient Portal uses `auth.users.id` (a.k.a. `patient_user_id`) as the
 * primary identity and joins into the platform person/patient records
 * through `patient_profiles`.
 */
export type PatientIdentity = {
  userId: string;
  profile: Tables<"patient_profiles"> | null;
  personId: string | null;
  patientId: string | null;
  tenantId: string | null;
};

export async function resolvePatientIdentity(sb: SB, userId: string): Promise<PatientIdentity> {
  const { data } = await sb
    .from("patient_profiles")
    .select("*")
    .eq("patient_user_id", userId)
    .maybeSingle();
  const profile = (data ?? null) as Tables<"patient_profiles"> | null;
  return {
    userId,
    profile,
    personId: profile?.person_id ?? null,
    patientId: profile?.patient_id ?? null,
    tenantId: profile?.tenant_id ?? null,
  };
}

/**
 * Assert that `viewerUserId` is either the target user themselves or a
 * family member with an accepted delegation carrying at least the
 * requested capability.
 */
export type FamilyCapability = "view" | "book" | "pay" | "manage";

export async function assertFamilyPermission(
  sb: SB,
  args: {
    viewerUserId: string;
    targetUserId: string;
    capability: FamilyCapability;
  },
): Promise<void> {
  if (args.viewerUserId === args.targetUserId) return;
  const { data } = await sb
    .from("patient_family_members")
    .select("can_view, can_book, can_pay, can_manage, status")
    .eq("primary_user_id", args.targetUserId)
    .eq("member_user_id", args.viewerUserId)
    .eq("status", "accepted")
    .maybeSingle();
  const row = (data ?? null) as {
    can_view: boolean;
    can_book: boolean;
    can_pay: boolean;
    can_manage: boolean;
    status: string;
  } | null;
  if (!row) throw new Error("Forbidden: no family delegation");
  const allowed =
    (args.capability === "view" && row.can_view) ||
    (args.capability === "book" && row.can_book) ||
    (args.capability === "pay" && row.can_pay) ||
    (args.capability === "manage" && row.can_manage);
  if (!allowed) throw new Error(`Forbidden: family delegation lacks '${args.capability}'`);
}

/**
 * Small helper — unwrap a Supabase PostgREST response and throw its error.
 */
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
export function must<T = any>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("Row not found");
  return res.data;
}
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
export function mustMaybe<T = any>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? null) as T | null;
}
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
export function mustList<T = any>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}

export const patientHelpers = {
  emitPatientEvent,
  logPatientTimeline,
  indexPatientSearch,
  resolvePatientIdentity,
  assertFamilyPermission,
};
