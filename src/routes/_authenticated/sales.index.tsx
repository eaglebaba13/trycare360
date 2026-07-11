/**
 * Sales Pipeline — Kanban with drag & drop stage change.
 * Uses moveStage server function. Bulk stage change via selection.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads, moveStage } from "@/lib/leads/leads.functions";

export const Route = createFileRoute("/_authenticated/sales/")({
  component: SalesPipeline,
});

const STAGES = ["new", "contacted", "qualified", "consultation", "proposal", "negotiation", "won", "lost"];

function SalesPipeline() {
  const { activeTenantId } = useTenant();
  const listFn = useServerFn(listLeads);
  const stageFn = useServerFn(moveStage);
  const q = useQuery({
    queryKey: ["pipeline", activeTenantId],
    queryFn: () => listFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openBulk, setOpenBulk] = useState(false);
  const [bulkStage, setBulkStage] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const m: Record<string, Record<string, unknown>[]> = {};
    for (const s of STAGES) m[s] = [];
    for (const r of rows) {
      const s = String(r.stage_code);
      if (m[s]) m[s].push(r);
    }
    return m;
  }, [rows]);

  const runMove = async (leadId: string, newStage: string) => {
    try {
      await stageFn({ data: { id: leadId, stage_code: newStage } });
      toast.success(`Moved to ${newStage}`);
      q.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const runBulk = async () => {
    if (!bulkStage) return;
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => stageFn({ data: { id, stage_code: bulkStage } })));
      toast.success(`Updated ${ids.length} leads`);
      setSelected(new Set()); setOpenBulk(false); q.refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Drag cards between columns or select and bulk update.</div>
        {selected.size > 0 && (
          <Button size="sm" onClick={() => setOpenBulk(true)}>
            Bulk change stage ({selected.size})
          </Button>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid grid-flow-col auto-cols-[280px] gap-3">
          {STAGES.map((s) => (
            <div
              key={s}
              className="rounded-md border bg-muted/30 flex flex-col min-h-[400px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragging) { runMove(dragging, s); setDragging(null); } }}
            >
              <div className="p-2 flex items-center justify-between border-b bg-background rounded-t-md">
                <span className="text-sm font-medium capitalize">{s}</span>
                <Badge variant="outline" className="text-xs">{byStage[s].length}</Badge>
              </div>
              <div className="p-2 space-y-2 flex-1">
                {byStage[s].map((r) => {
                  const id = String(r.id);
                  return (
                    <Card
                      key={id}
                      draggable
                      onDragStart={() => setDragging(id)}
                      onDragEnd={() => setDragging(null)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link to="/leads/$leadId" params={{ leadId: id }} className="text-sm font-medium hover:underline block truncate">
                              {String(r.lead_code)}
                            </Link>
                            <div className="text-xs text-muted-foreground truncate">Source: {String(r.source ?? "—")}</div>
                          </div>
                          <Checkbox
                            checked={selected.has(id)}
                            onCheckedChange={() => toggle(id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="outline" className="text-[10px]">Score {Number(r.lead_score ?? 0).toFixed(0)}</Badge>
                          {r.priority && <Badge variant="outline" className="text-[10px]">{String(r.priority)}</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={openBulk} onOpenChange={setOpenBulk}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk change stage ({selected.size})</DialogTitle></DialogHeader>
          <Select value={bulkStage} onValueChange={setBulkStage}>
            <SelectTrigger><SelectValue placeholder="Pick a stage" /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button disabled={!bulkStage} onClick={runBulk}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
