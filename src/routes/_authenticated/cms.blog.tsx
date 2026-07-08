import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { EntityManager } from "@/components/cms/EntityManager";
import { POST_CONFIG } from "@/lib/cms/entity-configs";

export const Route = createFileRoute("/_authenticated/cms/blog")({
  component: Page,
});

function Page() {
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? "";
  if (!tenantId) {
    return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Select a tenant to manage content.</div>;
  }
  return <EntityManager tenantId={tenantId} config={POST_CONFIG} />;
}
