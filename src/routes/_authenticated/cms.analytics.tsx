import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { useTenant } from "@/hooks/use-tenant";
import { adminPageAnalytics } from "@/lib/cms/marketing.functions";

export const Route = createFileRoute("/_authenticated/cms/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const fn = useServerFn(adminPageAnalytics);
  const { data } = useQuery({
    queryKey: ["cms-analytics", tenantId],
    queryFn: () => fn({ data: { tenant_id: tenantId, days: 30 } }),
    enabled: !!tenantId,
  });

  const totals = data?.totals ?? { page_view: 0, lead_submit: 0, cta_click: 0 };
  const bySource = Object.entries(data?.bySource ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number));
  const byCampaign = Object.entries(data?.byCampaign ?? {}).sort((a, b) => (b[1] as number) - (a[1] as number));

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight">Landing page analytics</h1>
      <KpiGrid>
        <KpiCard label="Page views (30d)" value={totals.page_view ?? 0} />
        <KpiCard label="Lead submissions" value={totals.lead_submit ?? 0} />
        <KpiCard label="CTA clicks" value={totals.cta_click ?? 0} />
        <KpiCard label="Conversion rate" value={totals.page_view ? `${(((totals.lead_submit ?? 0) / totals.page_view) * 100).toFixed(1)}%` : "—"} />
      </KpiGrid>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Top sources</div>
          {bySource.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
          {bySource.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b py-1.5 text-sm last:border-b-0">
              <span>{k}</span><span className="font-medium">{v as number}</span>
            </div>
          ))}
        </Card>
        <Card className="p-4">
          <div className="mb-3 text-sm font-semibold">Top campaigns</div>
          {byCampaign.length === 0 && <div className="text-sm text-muted-foreground">No data yet.</div>}
          {byCampaign.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b py-1.5 text-sm last:border-b-0">
              <span>{k}</span><span className="font-medium">{v as number}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
