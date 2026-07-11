/**
 * Assignment Manager — manual, bulk, and auto-assignment preview.
 * Uses existing listLeads, assignLead, previewAssignment, autoAssignLead.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserCog, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads, assignLead } from "@/lib/leads/leads.functions";
import { previewAssignment, autoAssignLead } from "@/lib/leads/assignment.functions";

export const Route = createFileRoute("/_authenticated/sales/assignment")({
  component: AssignmentManagerPage,
});

function AssignmentManagerPage() {
  const { activeTenantId } = useTenant();
  const listFn = useServerFn(listLeads);
  const assignFn = useServerFn(assignLead);
  const previewFn = useServerFn(previewAssignment);
  const autoFn = useServerFn(autoAssignLead);

  const q = useQuery({
    queryKey: ["assign-mgr", activeTenantId],
    queryFn: () => listFn({ data: { tenant_id: activeTenantId!, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];
  const unassigned = rows.filter((r: { owner_id: string | null }) => !r.owner_id);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ownerId, setOwnerId] = useState("");
  const [openBulk, setOpenBulk] = useState(false);
  const [preview, setPreview] = useState<{ leadId: string; owner: string | null; reason?: string } | null>(null);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const runBulk = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => assignFn({ data: { id, owner_id: ownerId || null, assignment_kind: "manual" } })));
      toast.success(`Assigned ${ids.length}`);
      setSelected(new Set()); setOpenBulk(false); q.refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const runPreview = async (lead: Record<string, unknown>) => {
    try {
      const res = await previewFn({ data: { tenant_id: activeTenantId!, lead } });
      setPreview({ leadId: String(lead.id), owner: (res.owner_id as string | null) ?? null, reason: res.reason as string | undefined });
    } catch (e) { toast.error((e as Error).message); }
  };

  const runAuto = async (leadId: string) => {
    try {
      await autoFn({ data: { lead_id: leadId, reason: "manual_trigger" } });
      toast.success("Auto-assigned");
      q.refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Unassigned leads ({unassigned.length})</CardTitle>
          {selected.size > 0 && (
            <Button size="sm" onClick={() => setOpenBulk(true)}><UserCog className="h-4 w-4 mr-1" />Bulk assign ({selected.size})</Button>
          )}
        </CardHeader>
        <CardContent>
          {unassigned.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">All leads are assigned.</div>
          ) : (
            <div className="space-y-2">
              {unassigned.map((r: Record<string, unknown>) => {
                const id = String(r.id);
                return (
                  <div key={id} className="flex items-center gap-3 p-2 border rounded-md">
                    <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{String(r.lead_code)}</div>
                      <div className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="mr-1">{String(r.stage_code)}</Badge>
                        Source: {String(r.source ?? "—")} · Score {Number(r.lead_score ?? 0).toFixed(0)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => runPreview(r)}>
                      <Sparkles className="h-4 w-4 mr-1" />Preview
                    </Button>
                    <Button size="sm" onClick={() => runAuto(id)}>Auto-assign</Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openBulk} onOpenChange={setOpenBulk}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk assign ({selected.size})</DialogTitle></DialogHeader>
          <Label>Owner user ID (blank to unassign)</Label>
          <Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
          <DialogFooter><Button onClick={runBulk}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Auto-assignment preview</DialogTitle></DialogHeader>
          {preview && (
            <div className="text-sm space-y-2">
              <div>Lead: <code className="text-xs">{preview.leadId.slice(0, 8)}</code></div>
              <div>Proposed owner: {preview.owner ? <code className="text-xs">{preview.owner.slice(0, 8)}</code> : <span className="text-muted-foreground">none</span>}</div>
              {preview.reason && <div className="text-xs text-muted-foreground">Reason: {preview.reason}</div>}
            </div>
          )}
          <DialogFooter>
            {preview?.owner && (
              <Button onClick={async () => {
                await assignFn({ data: { id: preview.leadId, owner_id: preview.owner, assignment_kind: "auto" } });
                toast.success("Assigned");
                setPreview(null); q.refetch();
              }}>Apply</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
