import { createFileRoute } from "@tanstack/react-router";
import { useTenant } from "@/hooks/use-tenant";
import { EntityManager } from "@/components/cms/EntityManager";
import { PRODUCT_CONFIG } from "@/lib/cms/entity-configs";

export const Route = createFileRoute("/_authenticated/cms/products")({
  component: Page,
});

function Page() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  if (!tenantId) {
    return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Select a tenant to manage content.</div>;
  }
  return <EntityManager tenantId={tenantId} config={PRODUCT_CONFIG} />;
}
