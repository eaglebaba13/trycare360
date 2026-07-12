import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ReportingGuard, PathologyReportWorkspace } from "@/components/laboratory/reporting";

export const Route = createFileRoute("/_authenticated/laboratory/pathology/reporting")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <ReportingGuard>
      <PathologyReportWorkspace tenantId={activeTenantId} />
    </ReportingGuard>
  );
}
