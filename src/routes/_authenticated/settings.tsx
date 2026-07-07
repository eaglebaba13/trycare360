import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Database,
  Map,
  Building2,
  Settings2,
  Cog,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/components/permission-guard";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsLayout,
});

const SETTINGS_NAV = [
  { to: "/settings", label: "Overview", icon: Cog, exact: true },
  { to: "/settings/masters", label: "Master Lists", icon: Database },
  { to: "/settings/territory", label: "Territory", icon: Map },
  { to: "/settings/companies", label: "Companies", icon: Building2 },
  { to: "/settings/global", label: "Global Settings", icon: Settings2 },
  { to: "/settings/platform", label: "Platform Settings", icon: Layers, superAdmin: true },
] as const;

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard roles={["super_admin", "corporate_admin", "platform_admin"]}>
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden md:flex w-60 flex-col border-r bg-card/40 p-3">
          <div className="px-3 py-2 mb-2">
            <div className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Configuration
            </div>
          </div>
          <nav className="space-y-0.5">
            {SETTINGS_NAV.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
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
