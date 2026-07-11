import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/scheduling/analytics")({
  component: SchedulingAnalyticsLayout,
});

const TABS = [
  { to: "/scheduling/analytics", label: "Executive", exact: true },
  { to: "/scheduling/analytics/resources", label: "Resources" },
  { to: "/scheduling/analytics/queue", label: "Queue" },
  { to: "/scheduling/analytics/capacity", label: "Capacity" },
  { to: "/scheduling/analytics/services", label: "Services" },
  { to: "/scheduling/analytics/patients", label: "Patients" },
  { to: "/scheduling/analytics/communication", label: "Communication" },
  { to: "/scheduling/analytics/reports", label: "Reports" },
];

function SchedulingAnalyticsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard roles={["super_admin", "platform_admin", "admin", "corporate_admin", "master_franchise", "franchise_owner", "center_manager", "marketing", "accounts"]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduling Analytics & Reporting</h1>
          <p className="text-sm text-muted-foreground">
            KPIs, resource, queue, capacity, service, patient, calendar & communication analytics — all derived from the Scheduling KPI Contract (see <code>src/lib/analytics/kpi-definitions.md</code>).
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
