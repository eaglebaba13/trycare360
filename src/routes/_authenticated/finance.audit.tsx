import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { AuditWorkspace } from "@/components/finance/operations";

export const Route = createFileRoute("/_authenticated/finance/audit")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <AuditWorkspace tenantId={activeTenantId} />;
}
