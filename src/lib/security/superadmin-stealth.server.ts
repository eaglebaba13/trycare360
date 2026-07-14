/**
 * Stealth Super Admin Mode — server-only helpers.
 *
 * Central place for API-layer sanitation. DB-layer RLS restricts SELECT of
 * Super-Admin-owned rows for non-Super viewers (see migrations); these helpers
 * additionally mask actor identity on rows that ARE visible so that even if
 * a Super Admin acted on a shared record (e.g. system-wide config), the
 * actor is presented as "System" to every non-Super viewer.
 *
 * RULE: Real Super Admin identity NEVER crosses the API boundary to any
 * viewer that is not the Super Admin themselves. Evidence is preserved in
 * the database; masking happens only at the read/API layer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
type SB = SupabaseClient<Database> | any;

const SUPER_ROLE = "super_admin";

/** Masked actor tokens shown to non-Super viewers. */
export const SYSTEM_ACTOR = Object.freeze({
  actor_id: null as string | null,
  actor_type: "platform_system" as const,
  actor_name: "System",
  actor_email: null as string | null,
  actor_phone: null as string | null,
});

/** In-request cache of super-admin user ids, keyed per SB client. */
const superIdCache = new WeakMap<object, Promise<Set<string>>>();

async function loadSuperAdminIds(sb: SB): Promise<Set<string>> {
  const cached = superIdCache.get(sb as object);
  if (cached) return cached;
  const p = (async () => {
    const ids = new Set<string>();
    try {
      // service_role bypasses RLS; from auth-middleware context.supabase the
      // stealth policy returns only rows the caller can already see, which is
      // fine — the caller can't unmask what they can't see anyway. For a full
      // list we prefer supabaseAdmin. Fall through gracefully.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, valid_to")
        .eq("role_code", SUPER_ROLE);
      const now = Date.now();
      for (const r of (data ?? []) as { user_id: string; valid_to: string | null }[]) {
        if (!r.valid_to || new Date(r.valid_to).getTime() > now) ids.add(r.user_id);
      }
    } catch {
      /* swallow — best effort */
    }
    return ids;
  })();
  superIdCache.set(sb as object, p);
  return p;
}

/** True if the given user is a Super Admin (any active assignment). */
export async function isSuperAdminUser(sb: SB, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const ids = await loadSuperAdminIds(sb);
  return ids.has(userId);
}

/** Central rule: may this viewer see real Super Admin identity? */
export async function canRevealSuperAdminIdentity(sb: SB, viewerId: string | null | undefined): Promise<boolean> {
  return isSuperAdminUser(sb, viewerId);
}

/** Filter helper: drop rows whose `column` references a Super Admin user. */
export async function excludeSuperAdmins<T extends Record<string, unknown>>(
  sb: SB,
  rows: T[],
  column: keyof T = "user_id" as keyof T,
): Promise<T[]> {
  const ids = await loadSuperAdminIds(sb);
  if (ids.size === 0) return rows;
  return rows.filter((r) => {
    const v = r[column];
    return !(typeof v === "string" && ids.has(v));
  });
}

/** Drop role assignments that reference the super_admin role code. */
export function excludeSuperAdminRole<T extends { role_code?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => r.role_code !== SUPER_ROLE);
}

/** Mask a single record's actor identity fields when the actor is Super Admin. */
export function maskActorRecord<T extends Record<string, unknown>>(
  row: T,
  actorIds: Set<string>,
  actorKey = "actor_id",
): T {
  const v = row[actorKey];
  if (typeof v !== "string" || !actorIds.has(v)) return row;
  const patch: Record<string, unknown> = { ...row, [actorKey]: SYSTEM_ACTOR.actor_id };
  if ("actor_name" in row) patch.actor_name = SYSTEM_ACTOR.actor_name;
  if ("actor_type" in row) patch.actor_type = SYSTEM_ACTOR.actor_type;
  if ("actor_email" in row) patch.actor_email = SYSTEM_ACTOR.actor_email;
  if ("actor_phone" in row) patch.actor_phone = SYSTEM_ACTOR.actor_phone;
  if ("performed_by" in row) patch.performed_by = null;
  if ("created_by" in row) patch.created_by = null;
  if ("updated_by" in row) patch.updated_by = null;
  if ("approved_by" in row) patch.approved_by = null;
  if ("assigned_by" in row) patch.assigned_by = null;
  if ("granted_by" in row) patch.granted_by = null;
  return patch as T;
}

/** Mask a whole list — used by audit/timeline/activity endpoints. */
export async function sanitizeActorPayload<T extends Record<string, unknown>>(
  sb: SB,
  rows: T[],
  viewerId: string | null | undefined,
  options: { actorKeys?: string[] } = {},
): Promise<T[]> {
  if (await canRevealSuperAdminIdentity(sb, viewerId)) return rows;
  const ids = await loadSuperAdminIds(sb);
  if (ids.size === 0) return rows;
  const keys = options.actorKeys ?? [
    "actor_id",
    "performed_by",
    "created_by",
    "updated_by",
    "approved_by",
    "assigned_by",
    "granted_by",
  ];
  return rows.map((r) => {
    let out = r;
    for (const k of keys) out = maskActorRecord(out, ids, k);
    return out;
  });
}

/** Filter both the target user AND the role_code from user-role rows. */
export async function sanitizeUserRoleRows<T extends { user_id?: string; role_code?: string | null }>(
  sb: SB,
  rows: T[],
  viewerId: string | null | undefined,
): Promise<T[]> {
  if (await canRevealSuperAdminIdentity(sb, viewerId)) return rows;
  const filtered = excludeSuperAdminRole(rows);
  return excludeSuperAdmins(sb, filtered, "user_id" as keyof T);
}

/** Filter super_admin out of a list of user rows keyed by id. */
export async function sanitizeUserList<T extends { id?: string }>(
  sb: SB,
  rows: T[],
  viewerId: string | null | undefined,
): Promise<T[]> {
  if (await canRevealSuperAdminIdentity(sb, viewerId)) return rows;
  const ids = await loadSuperAdminIds(sb);
  return rows.filter((r) => !(r.id && ids.has(r.id)));
}

/** Filter super_admin from the roles master. */
export async function sanitizeRoleMaster<T extends { code?: string }>(
  rows: T[],
  viewerId: string | null | undefined,
  sb: SB,
): Promise<T[]> {
  if (await canRevealSuperAdminIdentity(sb, viewerId)) return rows;
  return rows.filter((r) => r.code !== SUPER_ROLE);
}

export const SUPER_ADMIN_ROLE_CODE = SUPER_ROLE;
