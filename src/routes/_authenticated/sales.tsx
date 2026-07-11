import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesLayout,
});

const TABS = [
  { to: "/sales", label: "Pipeline", exact: true },
  { to: "/sales/assignment", label: "Assignment Manager" },
  { to: "/sales/sla", label: "SLA Monitor" },
  { to: "/sales/supervisor", label: "Supervisor Console" },
];

function SalesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PageContainer title="Sales Operations" description="Pipeline, assignment, SLA, and supervisor tools.">
      <div className="border-b mb-4">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "px-3 py-2 text-sm border-b-2 -mb-px",
                  active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </PageContainer>
  );
}
