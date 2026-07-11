import { createFileRoute, Outlet, Link, useRouterState } from "@tanstack/react-router";
import { PageContainer } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/revenue")({
  component: RevenueLayout,
});

const TABS = [
  { to: "/revenue", label: "Revenue Events", exact: true },
  { to: "/revenue/attribution", label: "Attribution" },
  { to: "/revenue/commissions", label: "Commissions" },
  { to: "/revenue/plans", label: "Rule Manager" },
  { to: "/revenue/beneficiaries", label: "Beneficiaries" },
  { to: "/revenue/preview", label: "Preview" },
  { to: "/revenue/audit", label: "Audit" },
];

function RevenueLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PageContainer title="Revenue & Commission" description="Attribution paths, revenue ledger, commission plans and accruals.">
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
