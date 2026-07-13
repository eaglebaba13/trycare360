import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ProfitabilityDashboard } from "@/components/finance/analytics";

export const Route = createFileRoute("/_authenticated/finance/analytics/profitability")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <ProfitabilityDashboard tenantId={activeTenantId} />;
}
