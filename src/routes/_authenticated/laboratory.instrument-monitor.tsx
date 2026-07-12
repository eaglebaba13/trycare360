import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { InstrumentMonitor, InstrumentHealth, InstrumentAlerts, CalibrationMonitor } from "@/components/laboratory/automation";

export const Route = createFileRoute("/_authenticated/laboratory/instrument-monitor")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <InstrumentMonitor tenantId={activeTenantId} />
      <div className="grid gap-4 md:grid-cols-2">
        <InstrumentHealth tenantId={activeTenantId} />
        <InstrumentAlerts tenantId={activeTenantId} />
      </div>
      <CalibrationMonitor tenantId={activeTenantId} />
    </div>
  );
}
