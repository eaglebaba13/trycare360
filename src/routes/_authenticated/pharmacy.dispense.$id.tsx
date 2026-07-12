import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { DispenseWorkspace } from "@/components/pharmacy/dispense";

export const Route = createFileRoute("/_authenticated/pharmacy/dispense/$id")({
  component: DispenseDetailPage,
});

function DispenseDetailPage() {
  const { activeTenantId } = useTenant();
  const { id } = Route.useParams();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <DispenseWorkspace tenantId={activeTenantId} dispenseId={id === "new" ? null : id} />;
}
