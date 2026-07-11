/**
 * Revenue Events Ledger — Stage 5.
 * Immutable event log of every revenue-generating action.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { listRevenueEvents, listAttributionCredits } from "@/lib/attribution/attribution.functions";
import { KpiCard } from "@/components/standards/kpi-card";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { IndianRupee, TrendingUp, Package, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/revenue/")({
  component: RevenueEventsPage,
});

const CATEGORIES = ["all", "treatment", "product", "membership", "subscription", "consultation", "other"];

function fmt(n: number, cur = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function RevenueEventsPage() {
  const { activeTenantId } = useTenant();
  const listFn = useServerFn(listRevenueEvents);
  const creditsFn = useServerFn(listAttributionCredits);
  const [category, setCategory] = useState<string>("all");

  const eventsQ = useQuery({
    queryKey: ["revenue-events", activeTenantId, category],
    queryFn: () =>
      listFn({
        data: {
          tenant_id: activeTenantId!,
          category: category === "all" ? undefined : category,
          limit: 200,
          offset: 0,
        },
      }),
    enabled: !!activeTenantId,
  });
  const creditsQ = useQuery({
    queryKey: ["revenue-credits", activeTenantId],
    queryFn: () => creditsFn({ data: { tenant_id: activeTenantId!, limit: 500 } }),
    enabled: !!activeTenantId,
  });

  const rows = eventsQ.data?.rows ?? [];
  const credits = creditsQ.data?.rows ?? [];

  const kpis = useMemo(() => {
    const total = rows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const byCat: Record<string, number> = {};
    for (const r of rows as any[]) byCat[r.category] = (byCat[r.category] ?? 0) + Number(r.amount ?? 0);
    return {
      total,
      count: rows.length,
      treatment: byCat.treatment ?? 0,
      product: byCat.product ?? 0,
      membership: byCat.membership ?? 0,
      subscription: byCat.subscription ?? 0,
      consultation: byCat.consultation ?? 0,
    };
  }, [rows]);

  const timeline = useMemo(
    () =>
      (rows as any[]).map((r) => ({
        ts: r.occurred_at,
        event_type: r.category,
        title: `${fmt(Number(r.amount), r.currency)} · ${r.source_module}`,
        body: r.source_ref ? `Ref: ${r.source_ref}` : null,
      })),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={fmt(kpis.total)} icon={IndianRupee} tone="success" />
        <KpiCard label="Events" value={kpis.count} icon={TrendingUp} />
        <KpiCard label="Treatments" value={fmt(kpis.treatment)} icon={Sparkles} />
        <KpiCard label="Products" value={fmt(kpis.product)} icon={Package} />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">Category:</div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Revenue Timeline (Immutable Ledger)</CardTitle></CardHeader>
          <CardContent>
            <TimelinePanel items={timeline} emptyMessage="No revenue recorded yet." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Attribution Credits</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[520px] overflow-auto">
              {(credits as any[]).slice(0, 40).map((c) => (
                <div key={c.id} className="border rounded-md p-2 text-xs">
                  <div className="flex justify-between">
                    <Badge variant="outline">{c.model}</Badge>
                    <span className="font-medium">{fmt(Number(c.credit_amount), c.currency)}</span>
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {c.lead_source ?? "—"} · {c.credit_pct}%
                  </div>
                </div>
              ))}
              {credits.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">No credits yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
