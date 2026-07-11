/**
 * Smart Calling Workspace — Lead summary + script + history + actions.
 * Composes existing server functions and the Lead 360 quick actions.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { Context360Panel } from "@/components/workspace/context-360-panel";
import { TimelinePanel } from "@/components/standards";
import { getLead } from "@/lib/leads/leads.functions";
import { listInteractions } from "@/lib/interactions/interactions.functions";
import { listFollowUps } from "@/lib/leads/followup.functions";
import { formatDistanceToNow } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/telecaller/workspace/$leadId")({
  component: SmartCallingWorkspace,
});

function SmartCallingWorkspace() {
  const { leadId } = Route.useParams();
  const getLeadFn = useServerFn(getLead);
  const intFn = useServerFn(listInteractions);
  const fuFn = useServerFn(listFollowUps);

  const leadQ = useQuery({ queryKey: ["lead", leadId], queryFn: () => getLeadFn({ data: { id: leadId } }) });
  const lead = leadQ.data?.lead;

  const intsQ = useQuery({
    queryKey: ["lead-ints", leadId],
    queryFn: () => intFn({ data: { tenant_id: lead!.tenant_id, lead_id: leadId, limit: 50, offset: 0 } }),
    enabled: !!lead,
  });
  const fuQ = useQuery({
    queryKey: ["lead-fu", leadId],
    queryFn: () => fuFn({ data: { tenant_id: lead!.tenant_id, limit: 50, offset: 0 } }),
    enabled: !!lead,
  });

  if (leadQ.isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!lead) return <div className="text-sm text-muted-foreground">Lead not found.</div>;

  const ints = intsQ.data?.rows ?? [];
  const byChannel = (ch: string) => ints.filter((i: { channel: string }) => i.channel === ch);
  const timelineItems = ints.slice(0, 30).map((i: Record<string, unknown>) => ({
    ts: String(i.occurred_at ?? i.created_at ?? new Date().toISOString()),
    event_type: String(i.channel),
    title: String(i.subject ?? i.outcome ?? i.channel),
    body: (i.body as string | null) ?? null,
    source: (i.source as string | null) ?? undefined,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-semibold">{lead.lead_code}</h2>
                <Badge variant="outline">{lead.stage_code}</Badge>
                <Badge>{lead.status ?? "open"}</Badge>
                <Badge variant="outline">Score {Number(lead.lead_score ?? 0).toFixed(0)}</Badge>
                {lead.priority && <Badge variant="outline">Priority: {lead.priority}</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Source {lead.source ?? "—"} · Person {String(lead.person_id).slice(0, 8)} · Created {formatDistanceToNow(lead.created_at)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/leads/$leadId" params={{ leadId: lead.id }}>Open Lead 360 <ExternalLink className="h-3 w-3 ml-1" /></Link>
              </Button>
              <LeadQuickActions lead={lead} onChanged={() => { leadQ.refetch(); intsQ.refetch(); fuQ.refetch(); }} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="script">
          <TabsList>
            <TabsTrigger value="script">Script</TabsTrigger>
            <TabsTrigger value="calls">Previous Calls ({byChannel("call").length})</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp ({byChannel("whatsapp").length})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({byChannel("note").length})</TabsTrigger>
            <TabsTrigger value="followups">Follow-ups</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="script">
            <Card>
              <CardHeader><CardTitle className="text-base">Call script</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-3">
                <p className="text-muted-foreground">Default opening — swap for tenant script when configured.</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Confirm identity and consent to speak.</li>
                  <li>Reference the source: <b>{lead.source ?? "web"}</b>.</li>
                  <li>Understand the primary concern; log outcome under Actions.</li>
                  <li>Offer next step: booking, WhatsApp brochure, or follow-up.</li>
                  <li>Set a follow-up before you end the call.</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calls"><HistoryList rows={byChannel("call")} /></TabsContent>
          <TabsContent value="whatsapp"><HistoryList rows={byChannel("whatsapp")} /></TabsContent>
          <TabsContent value="notes"><HistoryList rows={byChannel("note")} /></TabsContent>

          <TabsContent value="followups">
            <Card>
              <CardContent className="pt-4">
                {(fuQ.data?.rows ?? []).filter((f: { lead_id: string }) => f.lead_id === leadId).length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">No follow-ups scheduled.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {(fuQ.data?.rows ?? []).filter((f: { lead_id: string }) => f.lead_id === leadId).map((f: Record<string, unknown>) => (
                      <li key={String(f.id)} className="flex items-center justify-between">
                        <span><Badge variant="outline" className="mr-2">{String(f.kind)}</Badge>{String(f.notes ?? "")}</span>
                        <span className="text-xs text-muted-foreground">{new Date(String(f.due_at)).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <TimelinePanel items={timelineItems} emptyMessage="No interactions yet." />
          </TabsContent>
        </Tabs>
      </div>
      <aside className="min-w-0">
        <Context360Panel leadId={lead.id} tenantId={lead.tenant_id} />
      </aside>
    </div>
  );
}

function HistoryList({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) {
    return <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No entries yet.</CardContent></Card>;
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={String(r.id)}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">{String(r.subject ?? r.outcome ?? r.channel)}</div>
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(String(r.occurred_at ?? r.created_at))}</div>
            </div>
            {r.body ? <div className="text-xs text-muted-foreground mt-1">{String(r.body)}</div> : null}
            {r.disposition_code ? <Badge variant="outline" className="mt-2">{String(r.disposition_code)}</Badge> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
