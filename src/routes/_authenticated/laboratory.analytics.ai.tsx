import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { AiDashboard } from "@/components/laboratory/analytics";

export const Route = createFileRoute("/_authenticated/laboratory/analytics/ai")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <AiDashboard tenantId={activeTenantId} />;
}
