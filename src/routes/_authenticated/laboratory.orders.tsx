import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { OrderGrid } from "@/components/laboratory/workspaces";

export const Route = createFileRoute("/_authenticated/laboratory/orders")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <OrderGrid tenantId={activeTenantId} />;
}
