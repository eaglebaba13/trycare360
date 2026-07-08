import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listTimeline, logTimelineEvent } from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Activity } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/timeline")({
  component: TimelinePage,
});

type Ev = {
  id: number; entity_type: string; entity_id: string; event_type: string;
  title: string; body: string | null; actor_label: string | null; ts: string;
};

function TimelinePage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const list = useServerFn(listTimeline);
  const log = useServerFn(logTimelineEvent);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ entityType: "", entityId: "", eventType: "comment", title: "", body: "" });

  const { data = [] } = useQuery({
    queryKey: ["data", "timeline", activeTenantId, entityType, entityId],
    queryFn: () => list({ data: { tenantId: activeTenantId!, entityType: entityType || undefined, entityId: entityId || undefined } }) as Promise<Ev[]>,
    enabled: !!activeTenantId,
  });

  const create = useMutation({
    mutationFn: () => log({ data: {
      tenantId: activeTenantId!, entityType: form.entityType, entityId: form.entityId,
      eventType: form.eventType, title: form.title, body: form.body || null,
    } }),
    onSuccess: () => {
      toast.success("Event logged");
      setOpen(false);
      setForm({ entityType: "", entityId: "", eventType: "comment", title: "", body: "" });
      qc.invalidateQueries({ queryKey: ["data", "timeline"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <Label className="text-xs">Entity type</Label>
          <Input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="e.g. lead" className="w-40" />
        </div>
        <div>
          <Label className="text-xs">Entity id</Label>
          <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} placeholder="uuid or code" className="w-64" />
        </div>
        <div className="ml-auto">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Log event</Button>
        </div>
      </div>

      <div className="space-y-2">
        {data.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No events.</div>}
        {data.map((e) => (
          <div key={e.id} className="flex items-start gap-3 border rounded-md p-3">
            <Activity className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{e.title}</span>
                <Badge variant="outline" className="text-xs">{e.event_type}</Badge>
                <Badge variant="secondary" className="text-xs">{e.entity_type}:{e.entity_id.slice(0, 8)}</Badge>
              </div>
              {e.body && <p className="text-sm text-muted-foreground mt-1">{e.body}</p>}
              <div className="text-xs text-muted-foreground mt-1">{new Date(e.ts).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log timeline event</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entity type</Label><Input value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })} /></div>
              <div><Label>Entity id</Label><Input value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })} /></div>
            </div>
            <div><Label>Event type</Label><Input value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Body</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!form.entityType || !form.entityId || !form.title}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
