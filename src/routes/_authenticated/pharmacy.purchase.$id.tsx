import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { PurchaseOrderWorkspace } from "@/components/pharmacy/purchase";

export const Route = createFileRoute("/_authenticated/pharmacy/purchase/$id")({
  component: PurchaseDetailPage,
});

function PurchaseDetailPage() {
  const { activeTenantId } = useTenant();
  const { id } = Route.useParams();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <PurchaseOrderWorkspace tenantId={activeTenantId} poId={id} />;
}
