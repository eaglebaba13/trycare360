import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FinanceAnalyticsShell } from "@/components/finance/analytics";

export const Route = createFileRoute("/_authenticated/finance/analytics")({
  component: () => (
    <FinanceAnalyticsShell>
      <Outlet />
    </FinanceAnalyticsShell>
  ),
});
