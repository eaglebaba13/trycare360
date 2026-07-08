import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchGlobal, searchIndexSample, indexSearchEntity } from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/search")({
  component: SearchPage,
});

type Hit = { entity_type: string; entity_id: string; title: string; subtitle: string | null; url: string | null; rank: number };
type Sample = { entity_type: string; entity_id: string; title: string; subtitle: string | null; url: string | null; updated_at: string };

function SearchPage() {
  const { activeTenantId } = useTenant();
  const searchFn = useServerFn(searchGlobal);
  const sampleFn = useServerFn(searchIndexSample);
  const indexFn = useServerFn(indexSearchEntity);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ entityType: "", entityId: "", title: "", subtitle: "", body: "", keywords: "", url: "" });

  const { data: sample = [] } = useQuery({
    queryKey: ["data", "search", "sample", activeTenantId],
    queryFn: () => sampleFn({ data: { tenantId: activeTenantId! } }) as Promise<Sample[]>,
    enabled: !!activeTenantId,
  });

  const runSearch = useMutation({
    mutationFn: () => searchFn({ data: { tenantId: activeTenantId!, query: q } }),
    onSuccess: (rows) => setHits(rows as Hit[]),
    onError: (e: Error) => toast.error(e.message),
  });

  const addIndex = useMutation({
    mutationFn: () => indexFn({ data: {
      tenantId: activeTenantId!,
      entityType: form.entityType, entityId: form.entityId, title: form.title,
      subtitle: form.subtitle || null, body: form.body || null,
      keywords: form.keywords || null, url: form.url || null,
    } }),
    onSuccess: () => { toast.success("Indexed"); setOpen(false); setForm({ entityType: "", entityId: "", title: "", subtitle: "", body: "", keywords: "", url: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search across every module…"
            onKeyDown={(e) => { if (e.key === "Enter" && q) runSearch.mutate(); }} />
          <Button onClick={() => runSearch.mutate()} disabled={!q || runSearch.isPending}><Search className="h-4 w-4 mr-1" />Search</Button>
          <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Index entity</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Ranked full-text results from every module (lead, customer, patient, doctor, employee, invoice, product, document, franchise, task, workflow).
        </p>
      </Card>

      {hits.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Results ({hits.length})</h3>
          <div className="space-y-2">
            {hits.map((h) => (
              <div key={`${h.entity_type}:${h.entity_id}`} className="flex items-start gap-3 border rounded p-3">
                <Badge variant="secondary" className="mt-0.5">{h.entity_type}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{h.title}</div>
                  {h.subtitle && <div className="text-sm text-muted-foreground">{h.subtitle}</div>}
                  {h.url && <div className="text-xs text-primary mt-1">{h.url}</div>}
                </div>
                <div className="text-xs text-muted-foreground">rank {h.rank.toFixed(3)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-medium mb-3">Recently indexed ({sample.length})</h3>
        <div className="space-y-1 max-h-96 overflow-auto">
          {sample.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">Index is empty. Modules populate it through <code>index_search_entity</code>.</div>}
          {sample.map((s) => (
            <div key={`${s.entity_type}:${s.entity_id}`} className="flex items-center gap-3 text-sm py-1.5">
              <Badge variant="outline" className="text-xs">{s.entity_type}</Badge>
              <div className="flex-1 truncate">{s.title}</div>
              <div className="text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Index entity manually</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entity type</Label><Input value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} /></div>
              <div><Label>Entity id</Label><Input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} /></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div><Label>Body</Label><Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Keywords</Label><Input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></div>
              <div><Label>Deep-link URL</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addIndex.mutate()} disabled={!form.entityType || !form.entityId || !form.title}>Index</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
