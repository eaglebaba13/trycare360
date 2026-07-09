import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { adminList } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_authenticated/cms/campaigns")({
  component: CampaignsPage,
});

function CampaignsPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const list = useServerFn(adminList);
  const { data: pages = [] } = useQuery({
    queryKey: ["cms-campaign-pages", tenantId],
    queryFn: () => list({ data: { table: "cms_pages", tenant_id: tenantId, limit: 500 } }),
    enabled: !!tenantId,
  });
  const campaigns = (pages as Array<Record<string, unknown>>).filter((p) => p.campaign_id);

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight">Campaign pages</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pages with a campaign ID and UTM defaults. Create from a template on the Templates page.
      </p>
      <div className="grid gap-3">
        {campaigns.map((p) => (
          <Card key={p.id as string} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{p.title as string}</div>
              <div className="text-xs text-muted-foreground">
                <Badge variant="outline" className="mr-2">{p.status as string}</Badge>
                {p.path as string} · campaign: {p.campaign_id as string}
              </div>
            </div>
            <Link
              to="/cms/builder/$pageId"
              params={{ pageId: p.id as string }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open builder →
            </Link>
          </Card>
        ))}
        {campaigns.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No campaign pages yet. Create one from a template.
          </div>
        )}
      </div>
    </div>
  );
}
