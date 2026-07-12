import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { PharmacyExecutiveDashboard } from "@/components/pharmacy/analytics";

export const Route = createFileRoute("/_authenticated/pharmacy/analytics/")({
  component: PharmacyExecutivePage,
});

function PharmacyExecutivePage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <PharmacyExecutiveDashboard tenantId={activeTenantId} />;
}
