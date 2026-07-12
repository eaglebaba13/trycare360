/**
 * Phase 2.6 Stage 5 — Drug Recall UI (display + initiate).
 * All batch impact / patient impact calculations are done by the Stage 2
 * RecallEngine.initiate — this UI only renders the server response.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listRecalls,
  initiateRecall,
  completeRecall,
} from "@/lib/pharmacy/recall.functions";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid } from "@/components/standards/data-grid";
import { TimelinePanel, type TimelineItem } from "@/components/standards/timeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertOctagon, Ban, PackageX, Users, CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";

type RecallRow = {
  id: string;
  recall_number?: string | null;
  status: string;
  reason: string;
  recall_class: string | null;
  manufacturer: string | null;
  drug_id: string | null;
  regulator_reference: string | null;
  batch_nos?: string[] | null;
  scope?: { affected_branches?: string[]; affected_patients?: string[] } | null;
  initiated_at: string;
  completed_at: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// DrugRecallDashboard
// ---------------------------------------------------------------------------
export function DrugRecallDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listRecalls);
  const q = useQuery({
    queryKey: ["pharmacy-recalls", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 100 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: RecallRow[] } | undefined)?.rows ?? []) as RecallRow[];
  const open = rows.filter((r) => r.status !== "completed").length;
  const critical = rows.filter((r) => r.recall_class === "class_i").length;
  const patientsImpacted = rows.reduce((s, r) => s + (r.scope?.affected_patients?.length ?? 0), 0);
  const branchesImpacted = rows.reduce((s, r) => s + (r.scope?.affected_branches?.length ?? 0), 0);
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total recalls" value={rows.length} icon={AlertOctagon} />
        <KpiCard label="Open" value={open} tone="warning" icon={Ban} />
        <KpiCard label="Class I (critical)" value={critical} tone="danger" />
        <KpiCard label="Branches impacted" value={branchesImpacted} tone="info" />
        <KpiCard label="Patients impacted" value={patientsImpacted} tone="info" icon={Users} />
      </KpiGrid>
      <div className="flex justify-end">
        <NewRecallDialog tenantId={tenantId} />
      </div>
      <RecallBatchGrid rows={rows} tenantId={tenantId} onChange={() => q.refetch()} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecallBatchGrid
// ---------------------------------------------------------------------------
export function RecallBatchGrid({
  rows,
  tenantId,
  onChange,
}: {
  rows: RecallRow[];
  tenantId: string;
  onChange: () => void;
}) {
  const complete = useServerFn(completeRecall);
  const doComplete = useMutation({
    mutationFn: (recallId: string) => complete({ data: { tenantId, recallId } as never }),
    onSuccess: () => { toast.success("Recall marked complete"); onChange(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recall register</CardTitle></CardHeader>
      <CardContent>
        <DataGrid<RecallRow>
          rows={rows}
          getRowId={(r) => r.id}
          emptyMessage="No recalls on file."
          columns={[
            { id: "no", header: "Recall #", cell: (r) => <span className="font-mono text-xs">{r.recall_number ?? r.id.slice(0, 8)}</span> },
            { id: "class", header: "Class", cell: (r) => r.recall_class ? <Badge variant="destructive">{r.recall_class}</Badge> : "—" },
            { id: "reason", header: "Reason", cell: (r) => <span className="text-xs">{r.reason}</span> },
            { id: "batches", header: "Batches", cell: (r) => r.batch_nos?.length ?? 0 },
            { id: "branches", header: "Branches", cell: (r) => r.scope?.affected_branches?.length ?? 0 },
            { id: "patients", header: "Patients", cell: (r) => r.scope?.affected_patients?.length ?? 0 },
            { id: "status", header: "Status", cell: (r) => <RecallStatusBadge status={r.status} /> },
            {
              id: "action",
              header: "",
              cell: (r) =>
                r.status !== "completed" ? (
                  <Button size="sm" variant="outline" disabled={doComplete.isPending} onClick={() => doComplete.mutate(r.id)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                  </Button>
                ) : null,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function RecallStatusCard({ recall }: { recall: RecallRow }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span>{recall.recall_class ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Regulator ref</span><span className="font-mono">{recall.regulator_reference ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Manufacturer</span><span>{recall.manufacturer ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Status</span><RecallStatusBadge status={recall.status} /></div>
      </CardContent>
    </Card>
  );
}

export function RecallImpactPanel({ recall }: { recall: RecallRow }) {
  const branches = recall.scope?.affected_branches ?? [];
  const patients = recall.scope?.affected_patients ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><PackageX className="h-4 w-4" /> Impact</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Batches</div>
          <div className="font-mono">{(recall.batch_nos ?? []).join(", ") || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Branches</div>
          <div className="font-mono text-xs break-all">{branches.slice(0, 5).map((b) => b.slice(0, 8)).join(", ") || "—"}{branches.length > 5 ? ` +${branches.length - 5} more` : ""}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Patients</div>
          <div className="font-mono text-xs break-all">{patients.slice(0, 5).map((p) => p.slice(0, 8)).join(", ") || "—"}{patients.length > 5 ? ` +${patients.length - 5} more` : ""}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecallTimeline({ recall }: { recall: RecallRow }) {
  const items: TimelineItem[] = [
    { ts: recall.created_at, event_type: "created", title: "Recall record created" },
    { ts: recall.initiated_at, event_type: "initiated", title: "Recall initiated" },
    recall.completed_at
      ? { ts: recall.completed_at, event_type: "completed", title: "Recall completed" }
      : null,
  ].filter(Boolean) as TimelineItem[];
  return <TimelinePanel items={items} />;
}

function RecallStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "completed" ? "default" : status === "initiated" ? "secondary" : "outline"}>
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// NewRecallDialog — collects payload; server does the impact math.
// ---------------------------------------------------------------------------
export function NewRecallDialog({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [recallClass, setRecallClass] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [regRef, setRegRef] = useState("");
  const [batchNos, setBatchNos] = useState("");
  const initiate = useServerFn(initiateRecall);
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: () =>
      initiate({
        data: {
          tenantId,
          reason,
          recallClass: recallClass || null,
          manufacturer: manufacturer || null,
          regulatorReference: regRef || null,
          batchNos: batchNos.split(",").map((b) => b.trim()).filter(Boolean),
        } as never,
      }),
    onSuccess: () => {
      toast.success("Recall initiated — impact analysis complete");
      qc.invalidateQueries({ queryKey: ["pharmacy-recalls"] });
      setOpen(false);
      setReason(""); setRecallClass(""); setManufacturer(""); setRegRef(""); setBatchNos("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Initiate recall</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Initiate drug recall</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Class</Label>
              <Input value={recallClass} onChange={(e) => setRecallClass(e.target.value)} placeholder="class_i / class_ii / class_iii" />
            </div>
            <div>
              <Label>Regulator ref</Label>
              <Input value={regRef} onChange={(e) => setRegRef(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Manufacturer</Label>
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} />
          </div>
          <div>
            <Label>Batch numbers (comma-separated)</Label>
            <Input value={batchNos} onChange={(e) => setBatchNos(e.target.value)} placeholder="B123, B124" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!reason || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Initiating…" : "Initiate recall"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
