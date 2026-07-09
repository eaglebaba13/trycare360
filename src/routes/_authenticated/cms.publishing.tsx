import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { adminList } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_authenticated/cms/publishing")({
  component: PublishingPage,
});

function PublishingPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const list = useServerFn(adminList);
  const { data: pages = [] } = useQuery({
    queryKey: ["cms-publishing-pages", tenantId],
    queryFn: () => list({ data: { table: "cms_pages", tenant_id: tenantId, limit: 500 } }),
    enabled: !!tenantId,
  });

  const groups: Record<string, Array<Record<string, unknown>>> = { in_review: [], scheduled: [], draft: [], published: [], archived: [] };
  for (const p of pages as Array<Record<string, unknown>>) {
    const s = (p.status as string) ?? "draft";
    (groups[s] ??= []).push(p);
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight">Publishing workflow</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["in_review", "scheduled", "draft", "published", "archived"] as const).map((state) => (
          <Card key={state} className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className="uppercase">{state.replace("_", " ")}</Badge>
              <span className="text-xs text-muted-foreground">{groups[state]?.length ?? 0}</span>
            </div>
            <div className="space-y-1">
              {(groups[state] ?? []).map((p) => (
                <Link key={p.id as string} to="/cms/builder/$pageId" params={{ pageId: p.id as string }}
                  className="block rounded-md border p-2 text-sm hover:bg-muted">
                  <div className="font-medium">{p.title as string}</div>
                  <div className="text-xs text-muted-foreground">{p.path as string}</div>
                </Link>
              ))}
              {(groups[state] ?? []).length === 0 && <div className="text-xs text-muted-foreground">Empty.</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
