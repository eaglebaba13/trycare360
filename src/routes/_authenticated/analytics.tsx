import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsLayout,
});

const TABS = [
  { to: "/analytics", label: "Executive", exact: true },
  { to: "/analytics/marketing", label: "Marketing" },
  { to: "/analytics/sales", label: "Sales" },
  { to: "/analytics/revenue", label: "Revenue" },
  { to: "/analytics/commission", label: "Commission" },
  { to: "/analytics/operational", label: "Operational" },
];

function AnalyticsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard roles={["super_admin", "platform_admin", "admin", "corporate_admin", "master_franchise", "franchise_owner", "center_manager", "marketing", "accounts"]}>
      <PageContainer
        title="Executive Analytics & BI"
        description="Executive, marketing, sales, revenue, commission and operational dashboards — all sourced from existing Lead, Revenue, Attribution, Commission, SLA and Interaction engines. Formulas: /src/lib/analytics/kpi-definitions.md."
      >
        <div className="border-b mb-4">
          <nav className="flex flex-wrap gap-1">
            {TABS.map((t) => {
              const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
              return (
                <Link key={t.to} to={t.to} className={cn(
                  "px-3 py-2 text-sm border-b-2 -mb-px",
                  active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
                )}>{t.label}</Link>
              );
            })}
          </nav>
        </div>
        <Outlet />
      </PageContainer>
    </PermissionGuard>
  );
}
