import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { integrationDashboard } from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, Clock, Send, Webhook } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/integrations/")({
  component: IntegrationsDashboard,
});

function IntegrationsDashboard() {
  const { activeTenantId } = useTenant();
  const call = useServerFn(integrationDashboard);
  const { data } = useQuery({
    queryKey: ["integrations", "dashboard", activeTenantId],
    queryFn: () => call({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  if (!activeTenantId) {
    return <div className="text-sm text-muted-foreground">Select a tenant to view integrations.</div>;
  }

  const tiles = [
    { label: "Connected", value: data?.connections.connected ?? 0, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "In error", value: data?.connections.error ?? 0, icon: AlertCircle, tone: "text-destructive" },
    { label: "Pending setup", value: data?.connections.pending ?? 0, icon: Clock, tone: "text-amber-600" },
    { label: "Jobs pending", value: data?.jobs.pending ?? 0, icon: Send, tone: "text-blue-600" },
    { label: "Jobs failed", value: data?.jobs.failed ?? 0, icon: AlertCircle, tone: "text-orange-600" },
    { label: "Jobs dead", value: data?.jobs.dead ?? 0, icon: AlertCircle, tone: "text-destructive" },
    { label: "Webhook events (24h)", value: data?.webhookEvents24h ?? 0, icon: Webhook, tone: "text-purple-600" },
    { label: "API calls (24h)", value: data?.apiCalls24h ?? 0, icon: Activity, tone: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
                <Icon className={`h-4 w-4 ${t.tone}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-display">{t.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{data?.connections.total ?? 0}</Badge>
            total connections configured for this tenant.
          </div>
          <p>
            All third-party traffic flows through the dispatcher, which retries on
            <code className="mx-1 rounded bg-muted px-1">429</code> and
            <code className="mx-1 rounded bg-muted px-1">5xx</code>, then dead-letters after
            5 attempts. Failed jobs stay visible in the Logs tab until retried or cleared.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
