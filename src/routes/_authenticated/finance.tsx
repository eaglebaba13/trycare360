import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FinanceShell } from "@/components/finance/shell";

export const Route = createFileRoute("/_authenticated/finance")({
  component: () => (
    <FinanceShell>
      <Outlet />
    </FinanceShell>
  ),
});
