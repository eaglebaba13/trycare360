import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { VendorBillViewer } from "@/components/finance/workspaces";

export const Route = createFileRoute("/_authenticated/finance/vendor-bills/$id")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  const { id } = Route.useParams();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <VendorBillViewer tenantId={activeTenantId} billId={id} />;
}
