import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { AdjustmentDialog, AdjustmentHistory } from "@/components/pharmacy/adjustments";
import { PharmacyActionBar } from "@/components/pharmacy/shell";

export const Route = createFileRoute("/_authenticated/pharmacy/adjustments")({
  component: AdjustmentsPage,
});

function AdjustmentsPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-3">
      <PharmacyActionBar>
        <AdjustmentDialog tenantId={activeTenantId} />
      </PharmacyActionBar>
      <AdjustmentHistory tenantId={activeTenantId} />
    </div>
  );
}
