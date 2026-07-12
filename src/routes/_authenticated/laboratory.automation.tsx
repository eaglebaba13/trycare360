import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { AutomationOverviewPage } from "@/components/laboratory/automation";

export const Route = createFileRoute("/_authenticated/laboratory/automation")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <AutomationOverviewPage tenantId={activeTenantId} />;
}
