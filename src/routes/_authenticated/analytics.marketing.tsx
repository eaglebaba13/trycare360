/**
 * Marketing Analytics — CPL, CAC, ROAS, ROI by campaign/source/creative/landing.
 * Ad spend fields come from lead_source_history when integrations write them;
 * absent spend → tab shows revenue-only ROI (documented in the KPI dictionary).
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads } from "@/lib/leads/leads.functions";
import { listRevenueEvents, listAttributionCredits } from "@/lib/attribution/attribution.functions";
import { AnalyticsFilterBar, useAnalyticsFilters, applyAnalyticsFilter, uniqueOptions } from "@/lib/analytics/filters";
import { Sparkles, IndianRupee, TrendingUp, Target, Layers } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics/marketing")({
  component: MarketingAnalytics,
});

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function MarketingAnalytics() {
  const { activeTenantId } = useTenant();
  const leadsFn = useServerFn(listLeads);
  const revFn = useServerFn(listRevenueEvents);
  const credFn = useServerFn(listAttributionCredits);
  const [filters, patch, reset] = useAnalyticsFilters();

  const leadsQ = useQuery({
    queryKey: ["analytics-mkt-leads", activeTenantId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const revQ = useQuery({
    queryKey: ["analytics-mkt-rev", activeTenantId],
    queryFn: () => revFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const credQ = useQuery({
    queryKey: ["analytics-mkt-cred", activeTenantId],
    queryFn: () => credFn({ data: { tenant_id: activeTenantId!, limit: 500 } }),
    enabled: !!activeTenantId,
  });

  const leads = leadsQ.data?.rows ?? [];
  const revenue = revQ.data?.rows ?? [];
  const credits = credQ.data?.rows ?? [];

  const fLeads = useMemo(() => applyAnalyticsFilter(leads, filters, {
    date: "created_at", campaign: "campaign_id", source: "source", branch: "branch_id", franchise: "franchise_id",
  }), [leads, filters]);
  const fRevenue = useMemo(() => applyAnalyticsFilter(revenue, filters, {
    date: "occurred_at", branch: "branch_id", franchise: "franchise_id",
  }), [revenue, filters]);

  const totalSpend = useMemo(() => fLeads.reduce((s, l) => s + Number((l as { ad_spend?: number }).ad_spend ?? 0), 0), [fLeads]);
  const totalRevenue = useMemo(() => fRevenue.reduce((s, r) => s + Number(r.amount ?? 0), 0), [fRevenue]);
  const converted = useMemo(() => fLeads.filter((l) => l.converted_at).length, [fLeads]);

  const kpis = {
    cpl: totalSpend && fLeads.length ? totalSpend / fLeads.length : 0,
    cac: totalSpend && converted ? totalSpend / converted : 0,
    roas: totalSpend ? totalRevenue / totalSpend : 0,
    aiConv: (() => {
      const ai = fLeads.filter((l) => l.source === "ai_consultation" || String(l.sub_source ?? "").includes("consult"));
      const won = ai.filter((l) => l.status === "won").length;
      return ai.length ? won / ai.length : 0;
    })(),
  };

  const byCampaign = useMemo(() => {
    const m = new Map<string, { spend: number; revenue: number; leads: number }>();
    for (const l of fLeads) {
      const k = String(l.campaign_id ?? l.utm_campaign ?? "direct");
      const b = m.get(k) ?? { spend: 0, revenue: 0, leads: 0 };
      b.spend += Number((l as { ad_spend?: number }).ad_spend ?? 0);
      b.leads++;
      m.set(k, b);
    }
    for (const c of credits) {
      const k = String((c as { campaign_id?: string }).campaign_id ?? "direct");
      const b = m.get(k) ?? { spend: 0, revenue: 0, leads: 0 };
      b.revenue += Number((c as { credit_amount?: number }).credit_amount ?? 0);
      m.set(k, b);
    }
    return [...m.entries()].map(([name, v]) => ({ name: name.slice(0, 20), revenue: v.revenue, spend: v.spend, roi: v.spend ? (v.revenue - v.spend) / v.spend : 0, leads: v.leads }))
      .sort((a, b) => b.revenue - a.revenue).slice(0, 12);
  }, [fLeads, credits]);

  const bySource = useMemo(() => {
    const m = new Map<string, { revenue: number; leads: number }>();
    for (const l of fLeads) {
      const k = String(l.source ?? "unknown");
      const b = m.get(k) ?? { revenue: 0, leads: 0 };
      b.leads++;
      m.set(k, b);
    }
    for (const r of fRevenue) {
      const lead = fLeads.find((l) => l.id === r.lead_id);
      if (!lead) continue;
      const k = String(lead.source ?? "unknown");
      const b = m.get(k) ?? { revenue: 0, leads: 0 };
      b.revenue += Number(r.amount ?? 0);
      m.set(k, b);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);
  }, [fLeads, fRevenue]);

  const byCreative = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of fLeads) {
      const k = String(l.creative_id ?? "—");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, leads]) => ({ name: name.slice(0, 16), leads })).sort((a, b) => b.leads - a.leads).slice(0, 10);
  }, [fLeads]);

  const byLanding = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of fLeads) {
      const k = String(l.landing_page ?? "—");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, leads]) => ({ name: name.slice(0, 24), leads })).sort((a, b) => b.leads - a.leads).slice(0, 10);
  }, [fLeads]);

  return (
    <>
      <AnalyticsFilterBar
        filters={filters} onChange={patch} onReset={reset}
        options={{
          source: uniqueOptions(leads, "source" as never),
          campaign: uniqueOptions(leads, "campaign_id" as never),
          branch: uniqueOptions(leads, "branch_id" as never),
          franchise: uniqueOptions(leads, "franchise_id" as never),
        }}
        exportRows={byCampaign as Record<string, unknown>[]}
        exportName="marketing-campaigns"
      />
      <KpiGrid>
        <KpiCard label="Total Spend" value={money(totalSpend)} icon={IndianRupee} hint={totalSpend ? undefined : "Connect ad platforms to populate"} />
        <KpiCard label="Attributed Revenue" value={money(totalRevenue)} icon={TrendingUp} tone="success" />
        <KpiCard label="CPL" value={kpis.cpl ? money(kpis.cpl) : "—"} icon={Target} />
        <KpiCard label="CAC" value={kpis.cac ? money(kpis.cac) : "—"} icon={Target} />
        <KpiCard label="ROAS" value={kpis.roas ? `${kpis.roas.toFixed(2)}x` : "—"} icon={Layers} tone="success" />
        <KpiCard label="AI Consult Conv." value={`${(kpis.aiConv * 100).toFixed(1)}%`} icon={Sparkles} tone="info" />
      </KpiGrid>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Campaign ROI (top 12)</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCampaign}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis /><Tooltip /><Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                <Bar dataKey="spend" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Source ROI</CardTitle></CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                <Bar dataKey="leads" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Creative Performance</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCreative}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} />
                <Tooltip /><Bar dataKey="leads" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Landing Page Performance</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLanding}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} />
                <Tooltip /><Bar dataKey="leads" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
