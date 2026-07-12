import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ReportingGuard, ResultReviewWorkspace } from "@/components/laboratory/reporting";

export const Route = createFileRoute("/_authenticated/laboratory/result-review")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <ReportingGuard>
      <ResultReviewWorkspace tenantId={activeTenantId} />
    </ReportingGuard>
  );
}
