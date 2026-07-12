import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ReturnDialog, ReturnsList } from "@/components/pharmacy/dispense";

export const Route = createFileRoute("/_authenticated/pharmacy/returns")({
  component: ReturnsPage,
});

function ReturnsPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <ReturnDialog tenantId={activeTenantId} />
      </div>
      <ReturnsList tenantId={activeTenantId} />
    </div>
  );
}
