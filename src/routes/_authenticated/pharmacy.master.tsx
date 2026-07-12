import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { DrugMasterGrid } from "@/components/pharmacy/master";

export const Route = createFileRoute("/_authenticated/pharmacy/master")({
  component: MasterPage,
});

function MasterPage() {
  const { activeTenantId } = useTenant();
  return <DrugMasterGrid tenantId={activeTenantId} />;
}
