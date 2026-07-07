import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Network,
  Layers,
  Users,
  ShieldCheck,
  Building2,
  UserRound,
} from "lucide-react";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/organization")({
  component: OrganizationLayout,
});

const NAV = [
  { to: "/organization", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/organization/tree", label: "Org Tree", icon: Network },
  { to: "/organization/departments", label: "Departments", icon: Layers },
  { to: "/organization/employees", label: "Employees", icon: UserRound },
  { to: "/organization/users", label: "Users", icon: Users },
  { to: "/organization/roles", label: "Roles & Permissions", icon: ShieldCheck },
];

function OrganizationLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard
      roles={["super_admin", "corporate_admin", "master_franchise", "franchise_owner"]}
    >
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden md:flex w-60 flex-col border-r bg-card/40 p-3">
          <div className="px-3 py-2 mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <div className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Organization
            </div>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </PermissionGuard>
  );
}
