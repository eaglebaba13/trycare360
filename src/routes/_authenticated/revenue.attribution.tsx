/**
 * Revenue Attribution Workspace — Stage 5.
 * View first / last / linear / position attribution + full path.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import {
  listRevenueEvents,
  listAttributionCredits,
  listAttributionTouches,
  getActiveAttributionModel,
  setAttributionModel,
  applyAttribution,
} from "@/lib/attribution/attribution.functions";

export const Route = createFileRoute("/_authenticated/revenue/attribution")({
  component: AttributionWorkspace,
});

const MODELS = ["first", "last", "linear", "position"] as const;

function fmt(n: number, cur = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function AttributionWorkspace() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const eventsFn = useServerFn(listRevenueEvents);
  const creditsFn = useServerFn(listAttributionCredits);
  const touchesFn = useServerFn(listAttributionTouches);
  const modelFn = useServerFn(getActiveAttributionModel);
  const setModelFn = useServerFn(setAttributionModel);
  const applyFn = useServerFn(applyAttribution);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const eventsQ = useQuery({
    queryKey: ["attr-events", activeTenantId],
    queryFn: () => eventsFn({ data: { tenant_id: activeTenantId!, limit: 100, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const modelQ = useQuery({
    queryKey: ["attr-model", activeTenantId],
    queryFn: () => modelFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const events = eventsQ.data?.rows ?? [];
  const selected = useMemo(() => (events as any[]).find((e) => e.id === selectedEventId) ?? null, [events, selectedEventId]);

  const creditsQ = useQuery({
    queryKey: ["attr-credits", selectedEventId],
    queryFn: () =>
      creditsFn({ data: { tenant_id: activeTenantId!, revenue_event_id: selectedEventId! } }),
    enabled: !!activeTenantId && !!selectedEventId,
  });
  const touchesQ = useQuery({
    queryKey: ["attr-touches", selected?.person_id],
    queryFn: () => touchesFn({ data: { person_id: selected!.person_id } }),
    enabled: !!selected?.person_id,
  });

  const setModelM = useMutation({
    mutationFn: (m: string) => setModelFn({ data: { tenant_id: activeTenantId!, model: m as any } }),
    onSuccess: () => {
      toast.success("Attribution model updated");
      qc.invalidateQueries({ queryKey: ["attr-model"] });
    },
  });
  const reapplyM = useMutation({
    mutationFn: (payload: { id: string; model?: string }) =>
      applyFn({ data: { revenue_event_id: payload.id, ...(payload.model ? { model: payload.model as any } : {}) } }),
    onSuccess: () => {
      toast.success("Re-attributed");
      qc.invalidateQueries({ queryKey: ["attr-credits"] });
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tenant Attribution Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            Active: <Badge variant="secondary">{modelQ.data?.model ?? "…"}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            {MODELS.map((m) => (
              <Button key={m} size="sm" variant={modelQ.data?.model === m ? "default" : "outline"}
                onClick={() => setModelM.mutate(m)} disabled={setModelM.isPending}>
                {m}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Choose how credit is distributed across a person's touches when a revenue event lands.
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><b>First</b> — 100% to earliest touch</li>
              <li><b>Last</b> — 100% to latest touch</li>
              <li><b>Linear</b> — equal split across all touches</li>
              <li><b>Position</b> — 40% first, 40% last, 20% middle</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue Events</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[560px] overflow-auto">
            {(events as any[]).map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEventId(e.id)}
                className={`w-full text-left border rounded-md p-2 text-xs hover:bg-muted/40 ${selectedEventId === e.id ? "border-primary bg-muted/40" : ""}`}
              >
                <div className="flex justify-between">
                  <Badge variant="outline">{e.category}</Badge>
                  <span className="font-medium">{fmt(Number(e.amount), e.currency)}</span>
                </div>
                <div className="text-muted-foreground mt-1 truncate">
                  {new Date(e.occurred_at).toLocaleString()} · {e.source_module}
                </div>
              </button>
            ))}
            {events.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No revenue events.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Attribution Path</span>
            {selected && (
              <div className="flex gap-1">
                {MODELS.map((m) => (
                  <Button key={m} size="sm" variant="ghost" className="h-7 px-2 text-xs"
                    onClick={() => reapplyM.mutate({ id: selected.id, model: m })} disabled={reapplyM.isPending}>
                    {m}
                  </Button>
                ))}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selected && <div className="text-sm text-muted-foreground text-center py-6">Select a revenue event.</div>}
          {selected && (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="font-medium">{fmt(Number(selected.amount), selected.currency)}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.category} · {new Date(selected.occurred_at).toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Touches (chronological)</div>
                <ol className="space-y-2">
                  {(touchesQ.data?.rows ?? []).map((t: any, i: number) => (
                    <li key={t.id} className="border rounded-md p-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">#{i + 1} {t.source ?? "—"}</span>
                        <span className="text-muted-foreground">{new Date(t.occurred_at).toLocaleDateString()}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {t.utm_campaign ?? t.campaign_id ?? "—"} · {t.utm_medium ?? "—"}
                      </div>
                    </li>
                  ))}
                  {(touchesQ.data?.rows ?? []).length === 0 && (
                    <div className="text-xs text-muted-foreground">No touches recorded for this person.</div>
                  )}
                </ol>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Credits Applied</div>
                <div className="space-y-2">
                  {(creditsQ.data?.rows ?? []).map((c: any) => (
                    <div key={c.id} className="border rounded-md p-2 text-xs">
                      <div className="flex justify-between">
                        <Badge variant="outline">{c.model}</Badge>
                        <span className="font-medium">{fmt(Number(c.credit_amount), c.currency)} ({c.credit_pct}%)</span>
                      </div>
                      <div className="text-muted-foreground mt-1">{c.lead_source ?? "—"}</div>
                    </div>
                  ))}
                  {(creditsQ.data?.rows ?? []).length === 0 && (
                    <div className="text-xs text-muted-foreground">No credits.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
