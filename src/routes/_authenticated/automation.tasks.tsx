import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listTasks, upsertTask, deleteTask,
} from "@/lib/api/automation.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/automation/tasks")({
  component: TasksPage,
});

type Task = {
  id: string; title: string; description: string | null;
  priority: string; status: string;
  due_at: string | null; assignee_id: string | null;
};

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600",
  normal: "bg-blue-500/10 text-blue-600",
  high: "bg-amber-500/10 text-amber-600",
  urgent: "bg-destructive/10 text-destructive",
};

function TasksPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const list = useServerFn(listTasks);
  const save = useServerFn(upsertTask);
  const del = useServerFn(deleteTask);

  const [mine, setMine] = useState(false);
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["automation", "tasks", activeTenantId, mine, status],
    queryFn: () => list({ data: { tenantId: activeTenantId!, mine, status: status === "all" ? undefined : status } }) as Promise<Task[]>,
    enabled: !!activeTenantId,
  });

  const saveMut = useMutation({
    mutationFn: (t: Partial<Task>) => save({ data: {
      id: t.id, tenant_id: activeTenantId!, title: t.title!, description: t.description ?? null,
      priority: (t.priority as "low" | "normal" | "high" | "urgent") ?? "normal",
      status: (t.status as "open" | "in_progress" | "blocked" | "completed" | "cancelled") ?? "open",
      due_at: t.due_at || null, assignee_id: t.assignee_id ?? null, checklist: [],
    } }),
    onSuccess: () => { toast.success("Saved"); setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["automation", "tasks"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["automation", "tasks"] }); },
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant to view tasks.</div>;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tasks created by users, workflows or SLA breaches. Every module drops work items into this queue.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch id="mine" checked={mine} onCheckedChange={setMine} />
            <Label htmlFor="mine" className="text-sm cursor-pointer">Mine only</Label>
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => { setEditing({ priority: "normal", status: "open" }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New task
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-24">Priority</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-40">Due</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No tasks match these filters.</TableCell></TableRow>
            ) : data.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{t.title}</div>
                  {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                </TableCell>
                <TableCell><Badge variant="outline" className={PRIORITY_TONE[t.priority] ?? ""}>{t.priority}</Badge></TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{t.status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-xs">{t.due_at ? new Date(t.due_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {t.status !== "completed" && (
                      <Button variant="ghost" size="icon" title="Mark complete"
                        onClick={() => saveMut.mutate({ ...t, status: "completed" })}>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Edit"
                      onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete"
                      onClick={() => delMut.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={editing.priority ?? "normal"} onValueChange={(v) => setEditing({ ...editing, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editing.status ?? "open"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Due at</Label>
                <Input type="datetime-local" value={editing.due_at ? editing.due_at.slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={() => editing && saveMut.mutate(editing)} disabled={saveMut.isPending || !editing?.title}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
