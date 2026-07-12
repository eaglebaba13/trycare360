import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ColdChainDashboard } from "@/components/pharmacy/coldchain";

export const Route = createFileRoute("/_authenticated/pharmacy/coldchain")({
  component: ColdChainPage,
});

function ColdChainPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <ColdChainDashboard tenantId={activeTenantId} />;
}
