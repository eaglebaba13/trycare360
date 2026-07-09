import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAssessmentSessions } from "@/lib/assessment/assessment.functions";
import { DataGrid } from "@/components/standards/data-grid";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/consultations/")({
  component: Queue,
});

const SEV_TONE: Record<string, string> = {
  in_progress: "secondary", submitted: "outline", analyzing: "outline",
  completed: "default", failed: "destructive", abandoned: "secondary",
};

function Queue() {
  const navigate = useNavigate();
  const fn = useServerFn(listAssessmentSessions);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const { data, isLoading } = useQuery({
    queryKey: ["assessment-sessions", q, status, category],
    queryFn: () => fn({ data: { q, status: status || undefined, category: category || undefined, limit: 100 } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search name, phone, email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="in_progress">In progress</option>
          <option value="submitted">Submitted</option>
          <option value="analyzing">Analyzing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="abandoned">Abandoned</option>
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">All categories</option>
          <option value="hair">Hair</option>
          <option value="skin">Skin</option>
          <option value="nail">Nail</option>
          <option value="nutrition">Nutrition</option>
        </select>
      </div>
      <DataGrid
        rows={data?.sessions ?? []}
        isLoading={isLoading}
        getRowId={(r) => r.id as string}
        emptyMessage="No consultations yet."
        onRowClick={(r) => navigate({ to: "/consultations/$sessionId", params: { sessionId: r.id as string } })}
        columns={[
          { id: "when", header: "Started", cell: (r) => <span className="text-sm text-muted-foreground">{formatDate(r.created_at)}</span> },
          { id: "cat", header: "Category", cell: (r) => <Badge variant="outline" className="capitalize">{r.category}</Badge> },
          { id: "who", header: "Contact", cell: (r) => (
            <div>
              <div className="font-medium">{r.contact_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{r.contact_phone ?? r.contact_email ?? ""}</div>
            </div>
          )},
          { id: "src", header: "Source", cell: (r) => <span className="text-xs text-muted-foreground">{r.source ?? "direct"}</span> },
          { id: "prog", header: "Progress", cell: (r) => <span className="text-xs">{r.progress_pct ?? 0}%</span> },
          { id: "status", header: "Status", cell: (r) => (
            <Badge variant={(SEV_TONE[r.status] ?? "outline") as never} className="capitalize">{r.status.replace(/_/g, " ")}</Badge>
          )},
          { id: "lead", header: "Lead", cell: (r) => r.person_id ? <Badge className="text-xs">Linked</Badge> : <span className="text-xs text-muted-foreground">—</span> },
        ]}
      />
    </div>
  );
}
