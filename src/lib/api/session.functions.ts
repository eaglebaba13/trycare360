/**
 * Session bootstrap server function.
 * Returns: profile, roles (with tenant/org_unit), permission codes, unread count.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SessionUserRole = {
  role_code: string;
  tenant_id: string | null;
  org_unit_id: string | null;
};

export type SessionBootstrap = {
  userId: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    active_tenant_id: string | null;
    active_org_unit_id: string | null;
  } | null;
  roles: SessionUserRole[];
  permissions: string[];
  tenants: { id: string; name: string; code: string }[];
  unreadNotifications: number;
};

export const getSessionBootstrap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SessionBootstrap> => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: rolesRows }, { count: unread }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, email, avatar_url, active_tenant_id, active_org_unit_id",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role_code, tenant_id, org_unit_id, valid_to")
        .eq("user_id", userId),
      supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .is("read_at", null),
    ]);

    const activeRoles = (rolesRows ?? []).filter(
      (r) => !r.valid_to || new Date(r.valid_to) > new Date(),
    );

    const roleCodes = Array.from(new Set(activeRoles.map((r) => r.role_code)));

    let permissions: string[] = [];
    if (roleCodes.length > 0) {
      const { data: perms } = await supabase
        .from("role_permissions")
        .select("permission_code")
        .in("role_code", roleCodes);
      permissions = Array.from(new Set((perms ?? []).map((p) => p.permission_code)));
    }

    const tenantIds = Array.from(
      new Set(activeRoles.map((r) => r.tenant_id).filter(Boolean) as string[]),
    );
    let tenants: { id: string; name: string; code: string }[] = [];
    if (tenantIds.length > 0) {
      const { data: t } = await supabase
        .from("tenants")
        .select("id, name, code")
        .in("id", tenantIds);
      tenants = t ?? [];
    }

    return {
      userId,
      profile: profile ?? null,
      roles: activeRoles.map(({ role_code, tenant_id, org_unit_id }) => ({
        role_code,
        tenant_id,
        org_unit_id,
      })),
      permissions,
      tenants,
      unreadNotifications: unread ?? 0,
    };
  });
