/**
 * Organization Management API
 * Server functions for org tree, departments, employees, users, roles.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- ORG TREE ----------
export type OrgUnitRow = {
  id: string;
  parent_id: string | null;
  tenant_id: string;
  type: string;
  name: string;
  code: string | null;
};

export const listOrgUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }): Promise<OrgUnitRow[]> => {
    let q = context.supabase
      .from("org_units")
      .select("id, parent_id, tenant_id, type, name, code")
      .order("name", { ascending: true });
    if (data.tenantId) q = q.eq("tenant_id", data.tenantId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as OrgUnitRow[];
  });

export const upsertOrgUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        tenant_id: z.string().uuid(),
        parent_id: z.string().uuid().nullable().optional(),
        type: z.enum([
          "platform",
          "corporate",
          "state_master",
          "city_franchise",
          "express_center",
          "advanced_center",
          "department",
        ]),
        name: z.string().min(1),
        code: z.string().optional().nullable(),
        meta: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const payload = { ...data, meta: (data.meta ?? {}) as Record<string, unknown> };
    const { data: row, error } = await context.supabase
      .from("org_units")
      // biome-ignore lint/suspicious/noExplicitAny: broad upsert
      .upsert(payload as any)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: row?.id ?? "" };
  });

export const deleteOrgUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("org_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moveOrgUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        unitId: z.string().uuid(),
        newParentId: z.string().uuid().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("move_org_unit", {
      _unit_id: data.unitId,
      _new_parent_id: data.newParentId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ROLES / PERMISSIONS ----------
export const listRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("roles")
      .select("code, name, level, description, is_customer_facing")
      .order("level", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("permissions")
      .select("code, resource, action, description")
      .order("resource", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listRolePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("role_permissions")
      .select("role_code, permission_code");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        role_code: z.string(),
        permission_code: z.string(),
        enabled: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (data.enabled) {
      const { error } = await context.supabase
        .from("role_permissions")
        .upsert({ role_code: data.role_code, permission_code: data.permission_code });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("role_permissions")
        .delete()
        .eq("role_code", data.role_code)
        .eq("permission_code", data.permission_code);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const bulkSetRolePermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        role_code: z.string(),
        permission_codes: z.array(z.string()),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error: delErr } = await context.supabase
      .from("role_permissions")
      .delete()
      .eq("role_code", data.role_code);
    if (delErr) throw new Error(delErr.message);
    if (data.permission_codes.length > 0) {
      const rows = data.permission_codes.map((p) => ({
        role_code: data.role_code,
        permission_code: p,
      }));
      const { error } = await context.supabase.from("role_permissions").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const createOrCloneRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        code: z.string().min(2).regex(/^[a-z0-9_]+$/),
        name: z.string().min(2),
        level: z.number().int().default(0),
        description: z.string().optional(),
        cloneFrom: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("roles").insert({
      code: data.code,
      name: data.name,
      level: data.level ?? 0,
      description: data.description ?? null,
    });
    if (error) throw new Error(error.message);
    if (data.cloneFrom) {
      const { data: perms } = await context.supabase
        .from("role_permissions")
        .select("permission_code")
        .eq("role_code", data.cloneFrom);
      if (perms && perms.length > 0) {
        const rows = perms.map((p) => ({
          role_code: data.code,
          permission_code: p.permission_code,
        }));
        const { error: insErr } = await context.supabase.from("role_permissions").insert(rows);
        if (insErr) throw new Error(insErr.message);
      }
    }
    return { ok: true };
  });

// ---------- USERS ----------
export type PlatformUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  roles: { role_code: string; org_unit_id: string | null; tenant_id: string | null }[];
};

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformUser[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Verify caller is super admin or has users:manage
    const { data: isSuper } = await context.supabase.rpc("is_super_admin", {
      _user_id: context.userId,
    });
    if (!isSuper) {
      const { data: canManage } = await context.supabase.rpc("has_permission", {
        _user_id: context.userId,
        _permission: "users:manage",
        _org_unit_id: null,
      });
      if (!canManage) throw new Error("Not authorized");
    }

    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    const ids = authUsers.users.map((u) => u.id);
    const [{ data: profiles }, { data: userRoles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name, avatar_url, email").in("id", ids),
      supabaseAdmin
        .from("user_roles")
        .select("user_id, role_code, org_unit_id, tenant_id, valid_to")
        .in("user_id", ids),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const rMap = new Map<string, PlatformUser["roles"]>();
    for (const r of userRoles ?? []) {
      if (r.valid_to && new Date(r.valid_to) < new Date()) continue;
      const list = rMap.get(r.user_id) ?? [];
      list.push({
        role_code: r.role_code,
        org_unit_id: r.org_unit_id,
        tenant_id: r.tenant_id,
      });
      rMap.set(r.user_id, list);
    }
    return authUsers.users.map((u) => {
      const p = pMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? p?.email ?? null,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        is_active: !u.banned_until || new Date(u.banned_until) < new Date(),
        created_at: u.created_at,
        roles: rMap.get(u.id) ?? [],
      };
    });
  });

async function assertUsersManage(context: {
  supabase: { rpc: (...args: unknown[]) => unknown };
  userId: string;
}) {
  const rpc = context.supabase.rpc as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown }>;
  const { data: isSuper } = await rpc("is_super_admin", { _user_id: context.userId });
  if (isSuper) return;
  const { data: can } = await rpc("has_permission", {
    _user_id: context.userId,
    _permission: "users:manage",
    _org_unit_id: null,
  });
  if (!can) throw new Error("Not authorized");
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email(),
        full_name: z.string().optional(),
        role_code: z.string().optional(),
        org_unit_id: z.string().uuid().nullable().optional(),
        tenant_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertUsersManage(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name ?? null },
    });
    if (error) throw new Error(error.message);
    const userId = inv.user?.id;
    if (userId && data.role_code) {
      await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role_code: data.role_code,
        org_unit_id: data.org_unit_id ?? null,
        tenant_id: data.tenant_id ?? null,
        granted_by: context.userId,
      });
    }
    return { ok: true, user_id: userId };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertUsersManage(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertUsersManage(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role_code: z.string(),
        org_unit_id: z.string().uuid().nullable().optional(),
        tenant_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("user_roles").insert({
      user_id: data.user_id,
      role_code: data.role_code,
      org_unit_id: data.org_unit_id ?? null,
      tenant_id: data.tenant_id ?? null,
      granted_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("user_roles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("user_roles")
      .select("id, role_code, org_unit_id, tenant_id, valid_from, valid_to")
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listRoleHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("role_history")
      .select("id, user_id, role_code, action, org_unit_id, tenant_id, performed_by, performed_at")
      .order("performed_at", { ascending: false })
      .limit(500);
    if (data.user_id) q = q.eq("user_id", data.user_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- SUMMARY ----------
export const orgSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const countOf = async (table: string, filters?: Record<string, unknown>) => {
      let q = context.supabase.from(table).select("id", { head: true, count: "exact" });
      if (filters) for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
      const { count } = await q;
      return count ?? 0;
    };
    const [
      companies,
      brands,
      tenants,
      orgUnits,
      corporate,
      stateMaster,
      cityFranchise,
      advancedCenters,
      expressCenters,
      departments,
      employees,
    ] = await Promise.all([
      countOf("companies"),
      countOf("brands"),
      countOf("tenants"),
      countOf("org_units"),
      countOf("org_units", { type: "corporate" }),
      countOf("org_units", { type: "state_master" }),
      countOf("org_units", { type: "city_franchise" }),
      countOf("org_units", { type: "advanced_center" }),
      countOf("org_units", { type: "express_center" }),
      countOf("departments", { is_active: true }),
      countOf("employees", { is_active: true }),
    ]);
    return {
      companies,
      brands,
      tenants,
      orgUnits,
      corporate,
      stateMaster,
      cityFranchise,
      advancedCenters,
      expressCenters,
      departments,
      employees,
    };
  });
