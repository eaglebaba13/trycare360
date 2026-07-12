import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { ControlledRegisterGrid } from "@/components/pharmacy/dispense";

export const Route = createFileRoute("/_authenticated/pharmacy/controlled")({
  component: ControlledPage,
});

function ControlledPage() {
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;
  return <ControlledRegisterGrid tenantId={activeTenantId} />;
}
