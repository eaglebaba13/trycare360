import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { AnalyzerDashboard, AutomationQueue } from "@/components/laboratory/automation";

export const Route = createFileRoute("/_authenticated/laboratory/analyzers")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-4">
      <AnalyzerDashboard tenantId={activeTenantId} />
      <AutomationQueue tenantId={activeTenantId} />
    </div>
  );
}
