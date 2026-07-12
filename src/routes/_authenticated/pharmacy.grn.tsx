import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { GoodsReceiptGrid } from "@/components/pharmacy/purchase";

export const Route = createFileRoute("/_authenticated/pharmacy/grn")({
  component: GrnPage,
});

function GrnPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <GoodsReceiptGrid tenantId={activeTenantId} />;
}
