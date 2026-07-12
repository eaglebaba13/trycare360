import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ReportingGuard, AmendmentBrowserWorkspace } from "@/components/laboratory/reporting";

export const Route = createFileRoute("/_authenticated/laboratory/amendments")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <ReportingGuard>
      <AmendmentBrowserWorkspace tenantId={activeTenantId} />
    </ReportingGuard>
  );
}
