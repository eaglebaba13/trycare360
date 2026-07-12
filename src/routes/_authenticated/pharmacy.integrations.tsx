import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import {
  PharmacyIntegrationsHeader,
  IntegrationStatusPanel,
} from "@/components/pharmacy/integrations";

export const Route = createFileRoute("/_authenticated/pharmacy/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <PharmacyIntegrationsHeader />
      <IntegrationStatusPanel tenantId={activeTenantId} />
    </div>
  );
}
