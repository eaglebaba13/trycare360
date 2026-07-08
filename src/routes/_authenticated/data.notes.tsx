import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listNotes, upsertNote, deleteNote } from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pin, Trash2, StickyNote } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/notes")({
  component: NotesPage,
});

type Note = {
  id: string; entity_type: string; entity_id: string;
  body: string; visibility: string; pinned: boolean;
  created_at: string;
};

function NotesPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const list = useServerFn(listNotes);
  const save = useServerFn(upsertNote);
  const del = useServerFn(deleteNote);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Note>>({ visibility: "public", pinned: false });

  const { data = [] } = useQuery({
    queryKey: ["data", "notes", activeTenantId, pinnedOnly],
    queryFn: () => list({ data: { tenantId: activeTenantId!, pinnedOnly } }) as Promise<Note[]>,
    enabled: !!activeTenantId,
  });

  const create = useMutation({
    mutationFn: () => save({ data: {
      tenant_id: activeTenantId!,
      entity_type: form.entity_type!, entity_id: form.entity_id!,
      body: form.body!, visibility: (form.visibility as "public" | "private") ?? "public",
      pinned: !!form.pinned, mentions: [], attachments: [],
    } }),
    onSuccess: () => { toast.success("Note saved"); setOpen(false); setForm({ visibility: "public", pinned: false }); qc.invalidateQueries({ queryKey: ["data", "notes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["data", "notes"] }); },
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Switch checked={pinnedOnly} onCheckedChange={setPinnedOnly} />
          <Label>Pinned only</Label>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New note</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.length === 0 && <div className="col-span-2 text-sm text-muted-foreground text-center py-8">No notes.</div>}
        {data.map((n) => (
          <div key={n.id} className="border rounded-md p-3">
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{n.entity_type}:{n.entity_id.slice(0, 8)}</Badge>
                  <Badge variant="outline" className="text-xs">{n.visibility}</Badge>
                  {n.pinned && <Pin className="h-3 w-3 text-amber-600" />}
                </div>
                <div className="mt-2 text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(n.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entity type</Label><Input value={form.entity_type ?? ""} onChange={(e) => setForm({ ...form, entity_type: e.target.value })} /></div>
              <div><Label>Entity id</Label><Input value={form.entity_id ?? ""} onChange={(e) => setForm({ ...form, entity_id: e.target.value })} /></div>
            </div>
            <div><Label>Body</Label><Textarea value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} /></div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Visibility</Label>
                <Select value={form.visibility ?? "public"} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={!!form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
                <Label>Pin</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!form.entity_type || !form.entity_id || !form.body}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
