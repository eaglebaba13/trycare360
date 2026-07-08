import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listDashboardLayouts, upsertDashboardLayout, deleteDashboardLayout,
  listWidgets, upsertWidget, deleteWidget,
} from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, LayoutGrid } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/widgets")({
  component: WidgetsPage,
});

type Layout = { id: string; code: string; name: string; scope: string; role_code: string | null; tenant_id: string | null; is_default: boolean };
type Widget = { id: string; widget_type: string; title: string; config: Record<string, unknown>; display_order: number; is_active: boolean };

const WIDGET_TYPES = ["kpi", "chart", "table", "calendar", "tasks", "timeline", "notification", "leaderboard", "heatmap"];

function WidgetsPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const layoutsFn = useServerFn(listDashboardLayouts);
  const saveLayout = useServerFn(upsertDashboardLayout);
  const delLayout = useServerFn(deleteDashboardLayout);
  const widgetsFn = useServerFn(listWidgets);
  const saveWidget = useServerFn(upsertWidget);
  const delWidget = useServerFn(deleteWidget);

  const [selected, setSelected] = useState<string | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [lf, setLf] = useState({ code: "", name: "", scope: "role", role_code: "" });
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [wf, setWf] = useState({ widget_type: "kpi", title: "", config: "{}", display_order: 0 });

  const { data: layouts = [] } = useQuery({
    queryKey: ["data", "layouts", activeTenantId],
    queryFn: () => layoutsFn({ data: { tenantId: activeTenantId } }) as Promise<Layout[]>,
  });
  const { data: widgets = [] } = useQuery({
    queryKey: ["data", "widgets", selected],
    queryFn: () => widgetsFn({ data: { layoutId: selected! } }) as Promise<Widget[]>,
    enabled: !!selected,
  });

  const createLayout = useMutation({
    mutationFn: () => saveLayout({ data: {
      tenant_id: activeTenantId, code: lf.code, name: lf.name,
      scope: lf.scope as "role" | "user" | "tenant",
      role_code: lf.role_code || null, is_default: false, is_active: true,
    } }),
    onSuccess: () => { toast.success("Layout created"); setLayoutOpen(false); setLf({ code: "", name: "", scope: "role", role_code: "" }); qc.invalidateQueries({ queryKey: ["data", "layouts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeLayout = useMutation({
    mutationFn: (id: string) => delLayout({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); if (selected) setSelected(null); qc.invalidateQueries({ queryKey: ["data", "layouts"] }); },
  });
  const createWidget = useMutation({
    mutationFn: () => {
      let cfg: Record<string, unknown> = {};
      try { cfg = JSON.parse(wf.config); } catch { throw new Error("Invalid JSON in config"); }
      return saveWidget({ data: {
        layout_id: selected!, widget_type: wf.widget_type, title: wf.title,
        config: cfg, position: { x: 0, y: 0, w: 4, h: 3 },
        display_order: wf.display_order, is_active: true,
      } });
    },
    onSuccess: () => { toast.success("Widget added"); setWidgetOpen(false); setWf({ widget_type: "kpi", title: "", config: "{}", display_order: 0 }); qc.invalidateQueries({ queryKey: ["data", "widgets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeWidget = useMutation({
    mutationFn: (id: string) => delWidget({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["data", "widgets"] }); },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Dashboard layouts</h3>
          <Button size="sm" variant="outline" onClick={() => setLayoutOpen(true)} disabled={!activeTenantId}><Plus className="h-3 w-3" /></Button>
        </div>
        <div className="space-y-1">
          {layouts.length === 0 && <div className="text-xs text-muted-foreground py-4">No layouts yet.</div>}
          {layouts.map((l) => (
            <div key={l.id} className={`group flex items-center gap-2 rounded ${selected === l.id ? "bg-muted" : "hover:bg-muted/50"}`}>
              <button type="button" onClick={() => setSelected(l.id)} className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <LayoutGrid className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.scope}{l.role_code ? ` · ${l.role_code}` : ""}{l.tenant_id ? "" : " · global"}</div>
                </div>
              </button>
              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => removeLayout.mutate(l.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Widgets {selected && `(${widgets.length})`}</h3>
          <Button size="sm" onClick={() => setWidgetOpen(true)} disabled={!selected}><Plus className="h-4 w-4 mr-1" />Add widget</Button>
        </div>
        {!selected && <div className="text-sm text-muted-foreground py-8 text-center">Select a layout to configure its widgets.</div>}
        {selected && (
          <div className="grid gap-3 sm:grid-cols-2">
            {widgets.length === 0 && <div className="col-span-2 text-sm text-muted-foreground py-6 text-center">No widgets in this layout.</div>}
            {widgets.map((w) => (
              <div key={w.id} className="border rounded-md p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{w.title}</div>
                    <Badge variant="secondary" className="text-xs mt-1">{w.widget_type}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeWidget.mutate(w.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <pre className="mt-2 text-xs bg-muted rounded p-2 overflow-x-auto max-h-24">{JSON.stringify(w.config, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New dashboard layout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code</Label><Input value={lf.code} onChange={(e) => setLf({ ...lf, code: e.target.value })} /></div>
              <div><Label>Name</Label><Input value={lf.name} onChange={(e) => setLf({ ...lf, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Scope</Label>
                <Select value={lf.scope} onValueChange={(v) => setLf({ ...lf, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">Role</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Role code</Label><Input value={lf.role_code} onChange={(e) => setLf({ ...lf, role_code: e.target.value })} placeholder="e.g. doctor" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLayoutOpen(false)}>Cancel</Button>
            <Button onClick={() => createLayout.mutate()} disabled={!lf.code || !lf.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={widgetOpen} onOpenChange={setWidgetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add widget</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={wf.widget_type} onValueChange={(v) => setWf({ ...wf, widget_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{WIDGET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Title</Label><Input value={wf.title} onChange={(e) => setWf({ ...wf, title: e.target.value })} /></div>
            </div>
            <div><Label>Config (JSON)</Label><Textarea rows={5} className="font-mono text-xs" value={wf.config} onChange={(e) => setWf({ ...wf, config: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWidgetOpen(false)}>Cancel</Button>
            <Button onClick={() => createWidget.mutate()} disabled={!wf.title}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
