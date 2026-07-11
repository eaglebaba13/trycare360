/**
 * Supervisor Console — real-time team monitor, queue distribution,
 * reassignment, SLA priority override, productivity, breach alerts.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, AlertTriangle, PhoneCall, Target } from "lucide-react";
import { KpiCard, KpiGrid, DataGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { listTeamStats, listQueueDistribution } from "@/lib/leads/supervisor.functions";
import { listLeads, assignLead } from "@/lib/leads/leads.functions";

export const Route = createFileRoute("/_authenticated/sales/supervisor")({
  component: SupervisorConsole,
});

function SupervisorConsole() {
  const { activeTenantId } = useTenant();
  const teamFn = useServerFn(listTeamStats);
  const distFn = useServerFn(listQueueDistribution);
  const leadsFn = useServerFn(listLeads);
  const assignFn = useServerFn(assignLead);

  // 30s polling gives near-real-time without Realtime plumbing.
  const teamQ = useQuery({
    queryKey: ["sup-team", activeTenantId],
    queryFn: () => teamFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
    refetchInterval: 30_000,
  });
  const distQ = useQuery({
    queryKey: ["sup-dist", activeTenantId],
    queryFn: () => distFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
    refetchInterval: 30_000,
  });
  const leadsQ = useQuery({
    queryKey: ["sup-leads", activeTenantId],
    queryFn: () => leadsFn({ data: { tenant_id: activeTenantId!, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });

  const team = teamQ.data?.rows ?? [];
  const dist = distQ.data?.distribution ?? [];
  const leads = leadsQ.data?.rows ?? [];

  const totalCalls = team.reduce((a, r) => a + r.calls_today, 0);
  const totalBreached = team.reduce((a, r) => a + r.sla_breached, 0);
  const totalConverted = team.reduce((a, r) => a + r.converted_today, 0);

  const [reassignFor, setReassignFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newOwner, setNewOwner] = useState("");

  const memberLeads = reassignFor ? leads.filter((l: { owner_id: string | null }) => l.owner_id === reassignFor) : [];
  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const runReassign = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => assignFn({ data: { id, owner_id: newOwner || null, assignment_kind: "manual", reason: "supervisor_reassign" } })));
      toast.success(`Reassigned ${ids.length}`);
      setReassignFor(null); setSelected(new Set()); setNewOwner("");
      teamQ.refetch(); distQ.refetch(); leadsQ.refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const columns = [
    { id: "owner", header: "Telecaller", cell: (r: typeof team[number]) => <code className="text-xs">{r.owner_id.slice(0, 8)}</code> },
    { id: "total", header: "Leads", cell: (r: typeof team[number]) => <span className="tabular-nums">{r.total}</span> },
    { id: "open", header: "Open", cell: (r: typeof team[number]) => r.open },
    { id: "hot", header: "Hot", cell: (r: typeof team[number]) => r.hot },
    { id: "calls", header: "Calls Today", cell: (r: typeof team[number]) => r.calls_today },
    { id: "talk", header: "Talk (min)", cell: (r: typeof team[number]) => Math.round(r.talk_time / 60) },
    { id: "pending", header: "Pending FU", cell: (r: typeof team[number]) => r.pending_followups },
    { id: "missed", header: "Missed FU", cell: (r: typeof team[number]) => r.missed_followups },
    { id: "sla", header: "SLA Breaches", cell: (r: typeof team[number]) => r.sla_breached },
    { id: "conv", header: "Converted", cell: (r: typeof team[number]) => r.converted_today },
    { id: "actions", header: "", cell: (r: typeof team[number]) => (
      <Button size="sm" variant="outline" onClick={() => setReassignFor(r.owner_id)}>Reassign</Button>
    ) },
  ];

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Team size" value={team.length} icon={Users} />
        <KpiCard label="Calls today" value={totalCalls} icon={PhoneCall} tone="info" />
        <KpiCard label="SLA breaches" value={totalBreached} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Converted today" value={totalConverted} icon={Target} tone="success" />
      </KpiGrid>

      <Card>
        <CardHeader><CardTitle className="text-base">Telecaller performance (live · 30s refresh)</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={team}
            columns={columns}
            getRowId={(r) => r.owner_id}
            isLoading={teamQ.isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Queue distribution</CardTitle></CardHeader>
        <CardContent>
          {dist.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No open leads.</div>
          ) : (
            <div className="overflow-x-auto text-sm">
              <table className="w-full">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="p-1">Owner</th><th className="p-1">Total</th><th className="p-1">New</th><th className="p-1">Contacted</th><th className="p-1">Qualified</th><th className="p-1">Proposal</th><th className="p-1">Negotiation</th></tr>
                </thead>
                <tbody>
                  {(dist as Array<Record<string, number | string>>).map((d) => (
                    <tr key={String(d.owner_id)} className="border-t">
                      <td className="p-1"><code className="text-xs">{d.owner_id === "unassigned" ? "unassigned" : String(d.owner_id).slice(0, 8)}</code></td>
                      <td className="p-1 tabular-nums">{Number(d.total ?? 0)}</td>
                      <td className="p-1 tabular-nums">{Number(d.new ?? 0)}</td>
                      <td className="p-1 tabular-nums">{Number(d.contacted ?? 0)}</td>
                      <td className="p-1 tabular-nums">{Number(d.qualified ?? 0)}</td>
                      <td className="p-1 tabular-nums">{Number(d.proposal ?? 0)}</td>
                      <td className="p-1 tabular-nums">{Number(d.negotiation ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reassignFor} onOpenChange={(v) => { if (!v) { setReassignFor(null); setSelected(new Set()); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reassign leads from {reassignFor?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-72 overflow-auto space-y-1">
              {memberLeads.map((l: Record<string, unknown>) => {
                const id = String(l.id);
                return (
                  <label key={id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-muted/50">
                    <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} />
                    <span className="font-medium">{String(l.lead_code)}</span>
                    <span className="text-xs text-muted-foreground">· {String(l.stage_code)} · score {Number(l.lead_score ?? 0).toFixed(0)}</span>
                  </label>
                );
              })}
              {memberLeads.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No leads for this telecaller.</div>}
            </div>
            <div>
              <Label>New owner user ID (blank to unassign)</Label>
              <Input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={selected.size === 0} onClick={runReassign}>Reassign {selected.size}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
