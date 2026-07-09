import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutGrid,
  Users,
  UserPlus,
  GitMerge,
  History,
  Network,
  Tags,
  ShieldCheck,
  Upload,
  CopyCheck,
} from "lucide-react";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/people")({
  component: PeopleLayout,
});

const NAV = [
  { to: "/people", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/people/list", label: "People", icon: Users },
  { to: "/people/new", label: "New Person", icon: UserPlus },
  { to: "/people/duplicates", label: "Duplicate Queue", icon: CopyCheck },
  { to: "/people/merges", label: "Merge History", icon: GitMerge },
  { to: "/people/relationships", label: "Relationships", icon: Network },
  { to: "/people/tags", label: "Tags", icon: Tags },
  { to: "/people/verification", label: "Verification", icon: ShieldCheck },
  { to: "/people/import", label: "Import Center", icon: Upload },
  { to: "/people/audit", label: "Audit", icon: History },
];

function PeopleLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard
      roles={[
        "super_admin",
        "platform_admin",
        "admin",
        "corporate_admin",
        "master_franchise",
        "franchise_owner",
        "center_manager",
      ]}
    >
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden md:flex w-60 flex-col border-r bg-card/40 p-3">
          <div className="px-3 py-2 mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <div className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Master Registry
            </div>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to) && item.to !== "/people";
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground/80 hover:bg-muted/50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
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
