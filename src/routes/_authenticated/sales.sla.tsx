/**
 * SLA Monitor — countdowns, breaches, escalations, supervisor overrides.
 */
import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Timer, TrendingUp, ShieldAlert } from "lucide-react";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { listOpenSlas, runSlaEscalations, sweepSlaBreaches } from "@/lib/sla/sla.functions";
import { overrideSlaPriority } from "@/lib/leads/supervisor.functions";

export const Route = createFileRoute("/_authenticated/sales/sla")({
  component: SlaMonitorPage,
});

function SlaMonitorPage() {
  const { activeTenantId } = useTenant();
  const slaFn = useServerFn(listOpenSlas);
  const escFn = useServerFn(runSlaEscalations);
  const sweepFn = useServerFn(sweepSlaBreaches);
  const overrideFn = useServerFn(overrideSlaPriority);

  const q = useQuery({
    queryKey: ["sla-monitor", activeTenantId],
    queryFn: () => slaFn({ data: { tenant_id: activeTenantId!, entity_type: "lead" } }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];

  const stats = useMemo(() => {
    const now = Date.now();
    let breached = 0, imminent = 0, healthy = 0;
    for (const s of rows) {
      if (s.breached_at) breached++;
      else if (s.due_at && Date.parse(s.due_at) - now < 15 * 60_000) imminent++;
      else healthy++;
    }
    return { breached, imminent, healthy };
  }, [rows]);

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Open SLAs" value={rows.length} icon={Timer} />
        <KpiCard label="Breached" value={stats.breached} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Imminent (<15m)" value={stats.imminent} icon={ShieldAlert} tone="warning" />
        <KpiCard label="Healthy" value={stats.healthy} icon={TrendingUp} tone="success" />
      </KpiGrid>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={async () => { const r = await sweepFn({}); toast.success(`Swept ${r.breached} breaches`); q.refetch(); }}>Sweep breaches</Button>
        <Button variant="outline" size="sm" onClick={async () => { await escFn({ data: { tenant_id: activeTenantId! } }); toast.success("Escalations dispatched"); q.refetch(); }}>Run escalations</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Live SLAs</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No open SLAs.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((s: Record<string, unknown>) => {
                const due = String(s.due_at);
                const remaining = Date.parse(due) - Date.now();
                const breached = !!s.breached_at;
                const pri = (s.meta as { priority?: string })?.priority ?? "normal";
                return (
                  <div key={String(s.id)} className="flex items-center gap-3 p-2 border rounded-md">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{String(s.kind)}</Badge>
                        <Badge variant={breached ? "destructive" : "outline"}>{breached ? "Breached" : "Open"}</Badge>
                        <Badge variant="outline">Priority: {pri}</Badge>
                        <Link to="/leads/$leadId" params={{ leadId: String(s.entity_id) }} className="text-sm font-medium underline">
                          Lead {String(s.entity_id).slice(0, 8)}
                        </Link>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Due {new Date(due).toLocaleString()} · {breached ? "already breached" : remaining < 0 ? "overdue" : `${Math.round(remaining / 60000)}m remaining`}
                      </div>
                    </div>
                    <Select onValueChange={async (v) => {
                      await overrideFn({ data: { id: String(s.id), priority: v as "low" | "normal" | "high" | "critical" } });
                      toast.success(`Priority → ${v}`); q.refetch();
                    }}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Override priority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
