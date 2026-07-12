import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { DispenseQueue } from "@/components/pharmacy/dispense";

export const Route = createFileRoute("/_authenticated/pharmacy/dispense")({
  component: DispensePage,
});

function DispensePage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <DispenseQueue tenantId={activeTenantId} />;
}
