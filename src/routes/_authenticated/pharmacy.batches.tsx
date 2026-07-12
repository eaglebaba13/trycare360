import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { BatchGrid } from "@/components/pharmacy/batches";

export const Route = createFileRoute("/_authenticated/pharmacy/batches")({
  component: BatchesPage,
});

function BatchesPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <BatchGrid tenantId={activeTenantId} withinDays={720} />;
}
