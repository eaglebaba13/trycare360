import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { IntegrationsPage } from "@/components/laboratory/automation";

export const Route = createFileRoute("/_authenticated/laboratory/integrations")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <IntegrationsPage tenantId={activeTenantId} />;
}
