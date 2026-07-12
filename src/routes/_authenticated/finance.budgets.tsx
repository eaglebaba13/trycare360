import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { BudgetWorkspace } from "@/components/finance/workspaces";

export const Route = createFileRoute("/_authenticated/finance/budgets")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <BudgetWorkspace tenantId={activeTenantId} />;
}
