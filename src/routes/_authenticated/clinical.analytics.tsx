import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clinical/analytics")({
  component: ClinicalAnalyticsLayout,
});

const TABS = [
  { to: "/clinical/analytics", label: "Executive", exact: true },
  { to: "/clinical/analytics/performance", label: "Performance" },
  { to: "/clinical/analytics/quality", label: "Quality" },
  { to: "/clinical/analytics/outcomes", label: "Outcomes" },
  { to: "/clinical/analytics/compliance", label: "Compliance" },
  { to: "/clinical/analytics/ai", label: "AI" },
  { to: "/clinical/analytics/reports", label: "Reports" },
];

function ClinicalAnalyticsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard roles={["super_admin", "platform_admin", "admin", "corporate_admin", "master_franchise", "franchise_owner", "center_manager", "doctor", "hair_consultant", "skin_consultant", "nutritionist", "therapist"]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clinical Analytics & Enterprise Reporting</h1>
          <p className="text-sm text-muted-foreground">
            Executive, performance, quality, outcomes, compliance & AI dashboards — all sourced from the Clinical / EMR
            engines (Stages 1–5) via the Stage 6 Analytics Service. Formulas locked in{" "}
            <code>src/lib/analytics/kpi-definitions.md</code>. No duplicate reporting engine.
          </p>
        </div>
        <div className="border-b">
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
      </div>
    </PermissionGuard>
  );
}
