import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { AnalyzerInstrumentPanel, AnalyzerQueuePanel } from "@/components/laboratory/workspaces";

export const Route = createFileRoute("/_authenticated/laboratory/instruments")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <AnalyzerInstrumentPanel tenantId={activeTenantId} />
      <AnalyzerQueuePanel tenantId={activeTenantId} />
    </div>
  );
}
