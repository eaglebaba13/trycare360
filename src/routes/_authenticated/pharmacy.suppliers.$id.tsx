import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import {
  SupplierProfile,
  SupplierScorecard,
  SupplierPerformanceChart,
  SupplierProductsGrid,
  SupplierLicensePanel,
  SupplierContactsPanel,
} from "@/components/pharmacy/supplier-detail";

export const Route = createFileRoute("/_authenticated/pharmacy/suppliers/$id")({
  component: SupplierDetailPage,
});

function SupplierDetailPage() {
  const { activeTenantId } = useTenant();
  const { id } = Route.useParams();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4 min-w-0">
        <SupplierProfile tenantId={activeTenantId} supplierId={id} />
        <SupplierScorecard tenantId={activeTenantId} supplierId={id} />
        <SupplierPerformanceChart tenantId={activeTenantId} supplierId={id} />
        <SupplierProductsGrid tenantId={activeTenantId} supplierId={id} />
      </div>
      <div className="space-y-4">
        <SupplierLicensePanel tenantId={activeTenantId} supplierId={id} />
        <SupplierContactsPanel tenantId={activeTenantId} supplierId={id} />
      </div>
    </div>
  );
}
