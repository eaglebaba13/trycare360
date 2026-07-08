/**
 * TRYCARE360 — RBAC constants
 * Roles and permission codes shared across UI + server.
 */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  PLATFORM_ADMIN: "platform_admin",
  ADMIN: "admin",
  CORPORATE_ADMIN: "corporate_admin",
  MASTER_FRANCHISE: "master_franchise",
  FRANCHISE_OWNER: "franchise_owner",
  CENTER_MANAGER: "center_manager",
  DOCTOR: "doctor",
  HAIR_CONSULTANT: "hair_consultant",
  SKIN_CONSULTANT: "skin_consultant",
  NUTRITIONIST: "nutritionist",
  THERAPIST: "therapist",
  TELECALLER: "telecaller",
  SALES_EXECUTIVE: "sales_executive",
  MARKETING: "marketing",
  ACCOUNTS: "accounts",
  HR: "hr",
  INVENTORY_MANAGER: "inventory_manager",
  PURCHASE_MANAGER: "purchase_manager",
  VENDOR: "vendor",
  ACADEMY_TRAINER: "academy_trainer",
  STUDENT: "student",
  CUSTOMER: "customer",
} as const;

/**
 * Roles that must not appear in end-user UI (dropdowns, badges, tables).
 * super_admin is a hidden platform-owner role; assignment happens out-of-band.
 */
export const HIDDEN_ROLES: readonly string[] = ["super_admin"];
export const isHiddenRole = (code: string) => HIDDEN_ROLES.includes(code);

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  TENANTS_READ: "tenants:read",
  TENANTS_WRITE: "tenants:write",
  ORG_UNITS_READ: "org_units:read",
  ORG_UNITS_WRITE: "org_units:write",
  USER_ROLES_READ: "user_roles:read",
  USER_ROLES_WRITE: "user_roles:write",
  AUDIT_READ: "audit:read",
  NOTIFICATIONS_READ: "notifications:read",
  FILES_READ: "files:read",
  FILES_WRITE: "files:write",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_LABELS: Record<RoleCode, string> = {
  super_admin: "Super Admin",
  platform_admin: "Platform Admin",
  admin: "Administrator",
  corporate_admin: "Corporate Admin",
  master_franchise: "Master Franchise",
  franchise_owner: "Franchise Owner",
  center_manager: "Center Manager",
  doctor: "Doctor",
  hair_consultant: "Hair Consultant",
  skin_consultant: "Skin Consultant",
  nutritionist: "Nutritionist",
  therapist: "Therapist",
  telecaller: "Telecaller",
  sales_executive: "Sales Executive",
  marketing: "Marketing",
  accounts: "Accounts",
  hr: "HR",
  inventory_manager: "Inventory Manager",
  purchase_manager: "Purchase Manager",
  vendor: "Vendor",
  academy_trainer: "Academy Trainer",
  student: "Student",
  customer: "Customer",
};
