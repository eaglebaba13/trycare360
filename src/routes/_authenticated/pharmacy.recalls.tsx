import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { DrugRecallDashboard } from "@/components/pharmacy/recall";

export const Route = createFileRoute("/_authenticated/pharmacy/recalls")({
  component: RecallsPage,
});

function RecallsPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <DrugRecallDashboard tenantId={activeTenantId} />;
}
