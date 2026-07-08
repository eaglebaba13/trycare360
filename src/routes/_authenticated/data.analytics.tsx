import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listKpis, upsertKpi, deleteKpi, listKpiSnapshots } from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/analytics")({
  component: AnalyticsPage,
});

type Kpi = {
  id: string; code: string; name: string; category: string;
  unit: string | null; direction: string; tenant_id: string | null; is_active: boolean;
};

const CATEGORIES = ["business", "clinical", "marketing", "financial", "franchise", "operations"];

function AnalyticsPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const listFn = useServerFn(listKpis);
  const saveFn = useServerFn(upsertKpi);
  const delFn = useServerFn(deleteKpi);
  const snapFn = useServerFn(listKpiSnapshots);
  const [category, setCategory] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Kpi>>({ direction: "higher", is_active: true });

  const { data: kpis = [] } = useQuery({
    queryKey: ["data", "kpis", activeTenantId, category],
    queryFn: () => listFn({ data: { tenantId: activeTenantId, category: category === "all" ? undefined : category } }) as Promise<Kpi[]>,
  });
  const { data: snapshots = [] } = useQuery({
    queryKey: ["data", "snapshots", activeTenantId],
    queryFn: () => snapFn({ data: { tenantId: activeTenantId!, limit: 100 } }),
    enabled: !!activeTenantId,
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      tenant_id: activeTenantId, code: form.code!, name: form.name!,
      category: form.category!, unit: form.unit ?? null,
      direction: (form.direction as "higher" | "lower") ?? "higher",
      is_active: form.is_active ?? true,
    } }),
    onSuccess: () => { toast.success("KPI saved"); setOpen(false); setForm({ direction: "higher", is_active: true }); qc.invalidateQueries({ queryKey: ["data", "kpis"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["data", "kpis"] }); },
  });

  const grouped = CATEGORIES.reduce<Record<string, Kpi[]>>((acc, c) => {
    acc[c] = kpis.filter((k) => k.category === c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setOpen(true)} disabled={!activeTenantId}><Plus className="h-4 w-4 mr-1" />New KPI</Button>
          </div>
        </div>

        <div className="space-y-6">
          {CATEGORIES.filter((c) => category === "all" || category === c).map((cat) => (
            <div key={cat}>
              <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-2">{cat}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[cat].length === 0 && <div className="text-xs text-muted-foreground col-span-full py-2">No KPIs.</div>}
                {grouped[cat].map((k) => (
                  <div key={k.id} className="group border rounded-md p-3 flex items-start gap-3">
                    {k.direction === "higher"
                      ? <TrendingUp className="h-4 w-4 mt-0.5 text-emerald-600" />
                      : <TrendingDown className="h-4 w-4 mt-0.5 text-blue-600" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{k.name}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 items-center">
                        <span className="font-mono">{k.code}</span>
                        {k.unit && <Badge variant="outline" className="text-xs">{k.unit}</Badge>}
                        {!k.tenant_id && <Badge variant="secondary" className="text-xs">global</Badge>}
                      </div>
                    </div>
                    {k.tenant_id && (
                      <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(k.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-2">Recent snapshots ({snapshots.length})</h3>
        <div className="text-xs text-muted-foreground mb-3">Modules push captured KPI values here via <code>analytics_snapshots</code>.</div>
        <div className="max-h-96 overflow-auto space-y-1">
          {snapshots.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No snapshots yet.</div>}
          {snapshots.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm py-1.5">
              <Badge variant="outline" className="text-xs">{s.period}</Badge>
              <span className="font-mono text-xs">{s.kpi_code}</span>
              <span className="text-muted-foreground text-xs">{s.period_start} → {s.period_end}</span>
              <span className="ml-auto font-medium">{s.value}</span>
              {s.target != null && <span className="text-xs text-muted-foreground">/ {s.target}</span>}
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New KPI</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Unit</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="count, %, currency" /></div>
            </div>
            <div>
              <Label>Direction (better when…)</Label>
              <Select value={form.direction ?? "higher"} onValueChange={(v) => setForm({ ...form, direction: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="higher">Higher is better</SelectItem>
                  <SelectItem value="lower">Lower is better</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={!form.code || !form.name || !form.category}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
