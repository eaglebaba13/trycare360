import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { SupplierGrid } from "@/components/pharmacy/suppliers";

export const Route = createFileRoute("/_authenticated/pharmacy/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <SupplierGrid tenantId={activeTenantId} />;
}
