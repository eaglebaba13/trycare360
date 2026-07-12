import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ExpiryDashboard } from "@/components/pharmacy/expiry";

export const Route = createFileRoute("/_authenticated/pharmacy/expiry")({
  component: ExpiryPage,
});

function ExpiryPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <ExpiryDashboard tenantId={activeTenantId} />;
}
