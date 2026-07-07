import { useMemo } from "react";
import { useSession } from "./use-session";
import { ROLES, type RoleCode, type PermissionCode } from "@/lib/rbac";

export function usePermissions() {
  const { data } = useSession();
  const roles = data?.roles.map((r) => r.role_code) ?? [];
  const permissions = data?.permissions ?? [];

  return useMemo(() => {
    const isSuper = roles.includes(ROLES.SUPER_ADMIN);
    return {
      roles,
      permissions,
      isSuperAdmin: isSuper,
      hasRole: (role: RoleCode | string) => isSuper || roles.includes(role),
      hasAnyRole: (list: (RoleCode | string)[]) =>
        isSuper || list.some((r) => roles.includes(r)),
      hasPermission: (perm: PermissionCode | string) =>
        isSuper || permissions.includes(perm),
      hasAnyPermission: (list: (PermissionCode | string)[]) =>
        isSuper || list.some((p) => permissions.includes(p)),
    };
  }, [roles, permissions]);
}
