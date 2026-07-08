import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConnections, listProviders } from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/integrations/catalog")({
  component: Catalog,
});

function Catalog() {
  const { activeTenantId } = useTenant();
  const provFn = useServerFn(listProviders);
  const connFn = useServerFn(listConnections);
  const { data: providers = [] } = useQuery({
    queryKey: ["integrations", "providers"],
    queryFn: () => provFn(),
  });
  const { data: connections = [] } = useQuery({
    queryKey: ["integrations", "connections", activeTenantId],
    queryFn: () => connFn({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const byProvider = new Map<string, unknown[]>();
  for (const c of connections as { provider_code: string }[]) {
    const arr = byProvider.get(c.provider_code) ?? [];
    arr.push(c);
    byProvider.set(c.provider_code, arr);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(providers as {
        id: string;
        code: string;
        name: string;
        category: string;
        description: string | null;
        docs_url: string | null;
        auth_type: string;
      }[]).map((p) => {
        const conns = byProvider.get(p.code) ?? [];
        return (
          <Card key={p.id} className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display font-semibold text-base">{p.name}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">
                  {p.category} · {p.auth_type}
                </div>
              </div>
              <Badge variant={conns.length ? "default" : "outline"}>
                {conns.length ? `${conns.length} linked` : "Not connected"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex-1">{p.description}</p>
            <div className="flex items-center gap-2">
              <Button asChild size="sm">
                <Link to="/settings/integrations/connections/$providerCode" params={{ providerCode: p.code }}>
                  {conns.length ? "Manage" : "Connect"}
                </Link>
              </Button>
              {p.docs_url && (
                <Button asChild size="sm" variant="ghost">
                  <a href={p.docs_url} target="_blank" rel="noreferrer">
                    Docs <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
