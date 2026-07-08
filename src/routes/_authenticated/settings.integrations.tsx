import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Cable, Webhook, KeyRound, ScrollText, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGuard } from "@/components/permission-guard";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsLayout,
});

const NAV = [
  { to: "/settings/integrations", label: "Dashboard", icon: Activity, exact: true },
  { to: "/settings/integrations/catalog", label: "Catalog", icon: LayoutGrid },
  { to: "/settings/integrations/connections", label: "Connections", icon: Cable },
  { to: "/settings/integrations/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/settings/integrations/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/settings/integrations/logs", label: "Logs", icon: ScrollText },
];

function IntegrationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard permissions={["integrations:read"]} roles={["super_admin", "corporate_admin"]}>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl lg:text-3xl font-semibold tracking-tight">Integration Center</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Single choke-point for every third-party service. All business modules dispatch
            through this layer — no module calls an external API directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 mb-6 border-b">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm border-b-2 -mb-px transition-colors",
                  active
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </div>
        <Outlet />
      </div>
    </PermissionGuard>
  );
}
