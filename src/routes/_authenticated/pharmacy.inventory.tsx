import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { InventoryGrid } from "@/components/pharmacy/inventory";

export const Route = createFileRoute("/_authenticated/pharmacy/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <InventoryGrid tenantId={activeTenantId} />;
}
