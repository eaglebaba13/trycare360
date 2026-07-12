import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { TransferWizard, TransferTimeline } from "@/components/pharmacy/transfers";
import { Button } from "@/components/ui/button";
import { PharmacyActionBar } from "@/components/pharmacy/shell";

export const Route = createFileRoute("/_authenticated/pharmacy/transfers")({
  component: TransfersPage,
});

function TransfersPage() {
  const { activeTenantId } = useTenant();
  const [wizardOpen, setWizardOpen] = useState(false);
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <PharmacyActionBar>
        <Button size="sm" variant={wizardOpen ? "outline" : "default"} onClick={() => setWizardOpen((v) => !v)}>
          {wizardOpen ? "Hide wizard" : "New transfer"}
        </Button>
      </PharmacyActionBar>
      {wizardOpen && <TransferWizard tenantId={activeTenantId} onDone={() => setWizardOpen(false)} />}
      <TransferTimeline tenantId={activeTenantId} />
    </div>
  );
}
