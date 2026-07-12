import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { BankReconciliationWorkspace } from "@/components/finance/workspaces";

export const Route = createFileRoute("/_authenticated/finance/bank-reconciliation")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <BankReconciliationWorkspace tenantId={activeTenantId} />;
}
