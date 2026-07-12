import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { WarehouseTree, WarehouseMap, BinExplorer } from "@/components/pharmacy/warehouses";

export const Route = createFileRoute("/_authenticated/pharmacy/warehouses")({
  component: WarehousesPage,
});

function WarehousesPage() {
  const { activeTenantId } = useTenant();
  const [selected, setSelected] = useState<string | null>(null);
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <WarehouseTree tenantId={activeTenantId} selectedId={selected} onSelect={setSelected} />
      <div className="space-y-4">
        <WarehouseMap tenantId={activeTenantId} warehouseId={selected} />
        <BinExplorer tenantId={activeTenantId} warehouseId={selected} />
      </div>
    </div>
  );
}
