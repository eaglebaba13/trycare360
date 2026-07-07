import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";

type Props = {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
};

export function PermissionGuard({
  roles,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: Props) {
  const p = usePermissions();
  if (p.isSuperAdmin) return <>{children}</>;

  const roleOk = !roles
    ? true
    : requireAll
      ? roles.every((r) => p.hasRole(r))
      : p.hasAnyRole(roles);

  const permOk = !permissions
    ? true
    : requireAll
      ? permissions.every((x) => p.hasPermission(x))
      : p.hasAnyPermission(permissions);

  return roleOk && permOk ? <>{children}</> : <>{fallback}</>;
}
