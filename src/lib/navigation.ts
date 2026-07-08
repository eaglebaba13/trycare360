/**
 * Role-aware navigation registry.
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  Bell,
  FileText,
  Settings,
  Workflow,
  Database,
} from "lucide-react";

import { ROLES, type RoleCode } from "./rbac";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: RoleCode[];
  permission?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      { label: "Notifications", to: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Organization",
        to: "/organization",
        icon: Building2,
        roles: [ROLES.SUPER_ADMIN, ROLES.CORPORATE_ADMIN, ROLES.MASTER_FRANCHISE, ROLES.FRANCHISE_OWNER],
      },
      { label: "Users", to: "/organization/users", icon: Users, permission: "users:manage" },
      { label: "Roles & Permissions", to: "/organization/roles", icon: ShieldCheck, roles: [ROLES.SUPER_ADMIN, ROLES.PLATFORM_ADMIN, ROLES.ADMIN, ROLES.CORPORATE_ADMIN] },
      { label: "Audit Log", to: "/admin/audit", icon: FileText, permission: "audit:read" },
    ],
  },
  {
    label: "Automation",
    items: [
      {
        label: "Workflows & Automation",
        to: "/automation",
        icon: Workflow,
        roles: [ROLES.SUPER_ADMIN, ROLES.CORPORATE_ADMIN],
      },
      {
        label: "Data Foundation",
        to: "/data",
        icon: Database,
        roles: [ROLES.SUPER_ADMIN, ROLES.CORPORATE_ADMIN],
      },
    ],
  },

  {
    label: "Configuration",
    items: [
      {
        label: "Settings",
        to: "/settings",
        icon: Settings,
        roles: [ROLES.SUPER_ADMIN, ROLES.CORPORATE_ADMIN],
      },
    ],
  },
];

export const ROLE_HOME: Record<RoleCode, string> = {
  super_admin: "/dashboard",
  platform_admin: "/dashboard",
  admin: "/dashboard",
  corporate_admin: "/dashboard",
  master_franchise: "/dashboard",
  franchise_owner: "/dashboard",
  center_manager: "/dashboard",
  doctor: "/dashboard",
  hair_consultant: "/dashboard",
  skin_consultant: "/dashboard",
  nutritionist: "/dashboard",
  therapist: "/dashboard",
  telecaller: "/dashboard",
  sales_executive: "/dashboard",
  marketing: "/dashboard",
  accounts: "/dashboard",
  hr: "/dashboard",
  inventory_manager: "/dashboard",
  purchase_manager: "/dashboard",
  vendor: "/dashboard",
  academy_trainer: "/dashboard",
  student: "/dashboard",
  customer: "/dashboard",
};

export function filterNav(groups: NavGroup[], roles: string[], permissions: string[]): NavGroup[] {
  const isSuper = roles.includes(ROLES.SUPER_ADMIN);
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (isSuper) return true;
        if (i.roles && !i.roles.some((r) => roles.includes(r))) return false;
        if (i.permission && !permissions.includes(i.permission)) return false;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);
}
