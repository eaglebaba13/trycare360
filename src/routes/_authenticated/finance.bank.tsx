import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { BankAccountsGrid } from "@/components/finance/workspaces";

export const Route = createFileRoute("/_authenticated/finance/bank")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <BankAccountsGrid tenantId={activeTenantId} />;
}
