import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ReleaseWorkspace } from "@/components/laboratory/workspaces";

export const Route = createFileRoute("/_authenticated/laboratory/release")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <ReleaseWorkspace tenantId={activeTenantId} />;
}
