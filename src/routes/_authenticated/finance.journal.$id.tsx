import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { JournalViewer } from "@/components/finance/workspaces";

export const Route = createFileRoute("/_authenticated/finance/journal/$id")({ component: Page });
function Page() {
  const { activeTenantId } = useTenant();
  const { id } = Route.useParams();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <JournalViewer tenantId={activeTenantId} journalId={id} />;
}
