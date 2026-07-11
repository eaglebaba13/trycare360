/**
 * My Queue — pre-built views over the signed-in telecaller's leads.
 */
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DataGrid } from "@/components/standards";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/hooks/use-tenant";
import { useSession } from "@/hooks/use-session";
import { listLeads } from "@/lib/leads/leads.functions";
import { formatDistanceToNow } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/telecaller/queue")({
  component: MyQueuePage,
});

type View = "new" | "assigned" | "callback" | "no_answer" | "busy" | "followup_today" | "escalated" | "converted" | "lost";

const VIEWS: { id: View; label: string }[] = [
  { id: "new", label: "New" },
  { id: "assigned", label: "Assigned" },
  { id: "callback", label: "Call Back" },
  { id: "no_answer", label: "No Answer" },
  { id: "busy", label: "Busy" },
  { id: "followup_today", label: "Follow-up Today" },
  { id: "escalated", label: "Escalated" },
  { id: "converted", label: "Converted" },
  { id: "lost", label: "Lost" },
];

function MyQueuePage() {
  const nav = useNavigate();
  const { activeTenantId } = useTenant();
  const { data: session } = useSession();
  const userId = session?.userId ?? null;
  const [view, setView] = useState<View>("assigned");

  const listFn = useServerFn(listLeads);
  const q = useQuery({
    queryKey: ["my-queue", activeTenantId, userId],
    queryFn: () => listFn({ data: { tenant_id: activeTenantId!, owner_id: userId!, limit: 200, offset: 0 } }),
    enabled: !!activeTenantId && !!userId,
  });
  const allRows = q.data?.rows ?? [];

  const rows = useMemo(() => {
    const now = Date.now();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999)).getTime();
    return allRows.filter((r: Record<string, unknown>) => {
      const stage = r.stage_code as string;
      const status = r.status as string;
      const disposition = (r.last_disposition_code ?? r.disposition_code ?? "") as string;
      const nextFu = r.next_follow_up_at ? Date.parse(r.next_follow_up_at as string) : null;
      const priority = r.priority as string | null;
      switch (view) {
        case "new": return stage === "new";
        case "assigned": return status === "open" && !!r.owner_id;
        case "callback": return disposition === "callback" || (nextFu != null && nextFu > now);
        case "no_answer": return disposition === "no_answer";
        case "busy": return disposition === "busy";
        case "followup_today": return nextFu != null && nextFu >= startOfDay && nextFu <= endOfDay;
        case "escalated": return priority === "high" || priority === "critical";
        case "converted": return status === "won" || !!r.converted_at;
        case "lost": return status === "lost";
      }
    });
  }, [allRows, view]);

  const columns = [
    { id: "code", header: "Lead", cell: (r: Record<string, unknown>) => <span className="font-medium">{String(r.lead_code)}</span> },
    { id: "stage", header: "Stage", cell: (r: Record<string, unknown>) => <Badge variant="outline">{String(r.stage_code)}</Badge> },
    { id: "priority", header: "Priority", cell: (r: Record<string, unknown>) => String(r.priority ?? "normal") },
    { id: "score", header: "Score", cell: (r: Record<string, unknown>) => <span className="tabular-nums">{Number(r.lead_score ?? 0).toFixed(0)}</span> },
    { id: "source", header: "Source", cell: (r: Record<string, unknown>) => String(r.source ?? "—") },
    { id: "next_fu", header: "Next Follow-up", cell: (r: Record<string, unknown>) => r.next_follow_up_at ? formatDistanceToNow(String(r.next_follow_up_at)) : "—" },
    { id: "created", header: "Created", cell: (r: Record<string, unknown>) => formatDistanceToNow(String(r.created_at)) },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            {VIEWS.map((v) => (
              <TabsTrigger key={v.id} value={v.id}>{v.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => String((r as Record<string, unknown>).id)}
        isLoading={q.isLoading}
        onRowClick={(r) => nav({ to: "/telecaller/workspace/$leadId", params: { leadId: String((r as Record<string, unknown>).id) } })}
      />
    </div>
  );
}
