/**
 * Lead List — enterprise data grid.
 * Search, filters, bulk assign / stage change, pagination.
 */
import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, UserCog, ArrowRightCircle } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { DataGrid, FilterBar, BulkActionsBar, ActionToolbar } from "@/components/standards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { listLeads, assignLead, moveStage } from "@/lib/leads/leads.functions";
import { formatDate } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/leads/list")({
  component: LeadListPage,
});

const STAGES = ["new", "contacted", "qualified", "consultation", "proposal", "negotiation", "won", "lost"];
const SOURCES = ["meta", "google", "whatsapp", "web", "ai_consult", "referral", "walk_in", "call", "other"];

function LeadListPage() {
  const nav = useNavigate();
  const { activeTenantId } = useTenant();
  const listFn = useServerFn(listLeads);
  const assignFn = useServerFn(assignLead);
  const stageFn = useServerFn(moveStage);

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkStage, setBulkStage] = useState("");
  const [openBulk, setOpenBulk] = useState<"assign" | "stage" | null>(null);

  const q = useQuery({
    queryKey: ["leads-list", activeTenantId, search, stage, source, ownerFilter, limit, offset],
    queryFn: () =>
      listFn({
        data: {
          tenant_id: activeTenantId!,
          q: search || undefined,
          stage_code: stage || undefined,
          source: source || undefined,
          owner_id: ownerFilter || undefined,
          limit,
          offset,
        },
      }),
    enabled: !!activeTenantId,
  });

  const rows = q.data?.rows ?? [];
  const total = q.data?.count ?? null;

  const exportCsv = () => {
    const cols = ["lead_code", "stage_code", "status", "source", "campaign_id", "owner_id", "lead_score", "created_at"];
    const header = cols.join(",");
    const body = rows.map((r: Record<string, unknown>) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const runBulkAssign = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => assignFn({ data: { id, owner_id: bulkOwner || null, assignment_kind: "manual" } })));
      toast.success(`Assigned ${ids.length} leads`);
      setSelected(new Set()); setOpenBulk(null); q.refetch();
    } catch (e) { toast.error((e as Error).message); }
  };
  const runBulkStage = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => stageFn({ data: { id, stage_code: bulkStage } })));
      toast.success(`Updated ${ids.length} leads`);
      setSelected(new Set()); setOpenBulk(null); q.refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const columns = useMemo(
    () => [
      { id: "code", header: "Lead", cell: (r: typeof rows[number]) => <span className="font-medium">{r.lead_code}</span> },
      { id: "stage", header: "Stage", cell: (r: typeof rows[number]) => <Badge variant="outline">{r.stage_code}</Badge> },
      { id: "status", header: "Status", cell: (r: typeof rows[number]) => <Badge>{r.status ?? "open"}</Badge> },
      { id: "source", header: "Source", cell: (r: typeof rows[number]) => r.source ?? "—" },
      { id: "score", header: "Score", cell: (r: typeof rows[number]) => <span className="tabular-nums">{Number(r.lead_score ?? 0).toFixed(1)}</span> },
      { id: "priority", header: "Priority", cell: (r: typeof rows[number]) => r.priority ?? "normal" },
      { id: "owner", header: "Owner", cell: (r: typeof rows[number]) => r.owner_id ? <code className="text-xs">{String(r.owner_id).slice(0, 8)}</code> : <span className="text-muted-foreground">Unassigned</span> },
      { id: "created", header: "Created", cell: (r: typeof rows[number]) => formatDate(r.created_at) },
    ],
    [],
  );

  return (
    <PageContainer title="Leads" description="Search, filter, assign, and progress leads through the funnel">
      <ActionToolbar>
        <Button asChild variant="outline"><Link to="/leads">Dashboard</Link></Button>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </ActionToolbar>

      <div className="mt-3">
        <FilterBar
          search={search}
          onSearchChange={(v) => { setSearch(v); setOffset(0); }}
          placeholder="Search lead code…"
          onReset={() => { setSearch(""); setStage(""); setSource(""); setOwnerFilter(""); setOffset(0); }}
        >
          <Select value={stage || "all"} onValueChange={(v) => { setStage(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={source || "all"} onValueChange={(v) => { setSource(v === "all" ? "" : v); setOffset(0); }}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            className="h-9 w-[220px]"
            placeholder="Owner ID"
            value={ownerFilter}
            onChange={(e) => { setOwnerFilter(e.target.value); setOffset(0); }}
          />
        </FilterBar>
      </div>

      <div className="mt-3">
        <BulkActionsBar count={selected.size} onClear={() => setSelected(new Set())}>
          <Button size="sm" variant="outline" onClick={() => setOpenBulk("assign")}><UserCog className="h-4 w-4 mr-1" />Assign</Button>
          <Button size="sm" variant="outline" onClick={() => setOpenBulk("stage")}><ArrowRightCircle className="h-4 w-4 mr-1" />Change Stage</Button>
        </BulkActionsBar>
      </div>

      <div className="mt-3">
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id as string}
          isLoading={q.isLoading}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          onRowClick={(r) => nav({ to: "/leads/$leadId", params: { leadId: r.id as string } })}
          pagination={{ limit, offset, total, onOffset: setOffset }}
        />
      </div>

      <Dialog open={openBulk === "assign"} onOpenChange={(v) => !v && setOpenBulk(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Assign ({selected.size})</DialogTitle></DialogHeader>
          <Label>Owner user ID (blank to unassign)</Label>
          <Input value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} />
          <DialogFooter><Button onClick={runBulkAssign}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={openBulk === "stage"} onOpenChange={(v) => !v && setOpenBulk(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Change Stage ({selected.size})</DialogTitle></DialogHeader>
          <Select value={bulkStage} onValueChange={setBulkStage}>
            <SelectTrigger><SelectValue placeholder="Pick a stage" /></SelectTrigger>
            <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter><Button disabled={!bulkStage} onClick={runBulkStage}>Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
