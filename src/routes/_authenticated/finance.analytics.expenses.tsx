import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ExpenseDashboard } from "@/components/finance/analytics";

export const Route = createFileRoute("/_authenticated/finance/analytics/expenses")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <ExpenseDashboard tenantId={activeTenantId} />;
}
