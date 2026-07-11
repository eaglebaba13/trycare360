/**
 * Lead 360 Workspace
 * ------------------------------------------------------------------
 * Header + tab strip + reusable Context360Panel. Consumes existing
 * services only: leads, interactions, followups, attribution, sla,
 * identity timeline. Placeholders for modules that ship later
 * (appointments, tasks board, documents module).
 */
import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Star, Flag, Activity, GaugeCircle, Target, TrendingUp,
  CalendarClock, ListChecks, FileText, StickyNote, Calendar, UserCheck,
  History, ShieldCheck, Sparkles, Layers, Timer, Award, Wallet, User,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TimelinePanel, type TimelineItem } from "@/components/standards";
import { Context360Panel } from "@/components/workspace/context-360-panel";
import { LeadQuickActions } from "@/components/leads/lead-quick-actions";
import { useTenant } from "@/hooks/use-tenant";
import { getLead } from "@/lib/leads/leads.functions";
import { listInteractions } from "@/lib/interactions/interactions.functions";
import { listFollowUps } from "@/lib/leads/followup.functions";
import { listCreditsForPerson, getLtvForPerson } from "@/lib/attribution/attribution.functions";
import { listOpenSlas } from "@/lib/sla/sla.functions";
import { getPersonTimeline } from "@/lib/identity/services.functions";
import { formatDate, formatDateTime, formatDistanceToNow } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  component: LeadWorkspace,
});

function LeadWorkspace() {
  const { leadId } = Route.useParams();
  const { activeTenantId } = useTenant();

  const leadFn = useServerFn(getLead);
  const interactionsFn = useServerFn(listInteractions);
  const followUpsFn = useServerFn(listFollowUps);
  const creditsFn = useServerFn(listCreditsForPerson);
  const ltvFn = useServerFn(getLtvForPerson);
  const slaFn = useServerFn(listOpenSlas);
  const timelineFn = useServerFn(getPersonTimeline);

  const leadQ = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => leadFn({ data: { id: leadId } }),
    enabled: !!leadId,
  });
  const lead = leadQ.data?.lead as
    | (Record<string, unknown> & {
        id: string; tenant_id: string; person_id: string; lead_code: string; stage_code: string;
        status: string | null; source: string | null; campaign_id: string | null; owner_id: string | null;
        branch_id: string | null; priority: string; lead_score: number | string;
        ai_score: number | string; marketing_score: number | string; behavior_score: number | string;
        sales_score: number | string; manual_score: number | string;
        next_follow_up_at: string | null; converted_at: string | null;
        utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
        utm_term: string | null; utm_content: string | null; device: string | null;
        landing_page: string | null; expected_value: number | null; currency: string;
      })
    | undefined;

  const tenantId = activeTenantId ?? lead?.tenant_id;
  const personId = lead?.person_id;

  const interactionsQ = useQuery({
    queryKey: ["lead-interactions", leadId],
    queryFn: () => interactionsFn({ data: { tenant_id: tenantId!, lead_id: leadId, limit: 100, offset: 0 } }),
    enabled: !!tenantId && !!leadId,
  });
  const followUpsQ = useQuery({
    queryKey: ["lead-followups", leadId, tenantId],
    queryFn: () => followUpsFn({ data: { tenant_id: tenantId!, limit: 50, offset: 0 } }),
    enabled: !!tenantId,
    select: (d) => ({ rows: (d.rows as Array<{ lead_id: string }>).filter((r) => r.lead_id === leadId) }),
  });
  const creditsQ = useQuery({
    queryKey: ["lead-credits", personId, tenantId],
    queryFn: () => creditsFn({ data: { tenant_id: tenantId!, person_id: personId! } }),
    enabled: !!tenantId && !!personId,
  });
  const ltvQ = useQuery({
    queryKey: ["lead-ltv", personId],
    queryFn: () => ltvFn({ data: { person_id: personId! } }),
    enabled: !!personId,
  });
  const slaQ = useQuery({
    queryKey: ["lead-sla", tenantId, leadId],
    queryFn: () => slaFn({ data: { tenant_id: tenantId!, entity_type: "lead" } }),
    enabled: !!tenantId,
    select: (d) => ({ rows: (d.rows as Array<{ entity_id: string }>).filter((r) => r.entity_id === leadId) }),
  });
  const timelineQ = useQuery({
    queryKey: ["lead-timeline", leadId, personId, tenantId],
    queryFn: () => timelineFn({ data: { tenant_id: tenantId!, person_id: personId!, limit: 200 } }),
    enabled: !!tenantId && !!personId,
  });

  const timelineItems: TimelineItem[] = useMemo(() => {
    const raw = (timelineQ.data as Array<Record<string, unknown>> | undefined) ?? [];
    return raw.map((r) => ({
      ts: String(r.ts ?? r.created_at ?? new Date().toISOString()),
      event_type: String(r.event_type ?? r.channel ?? "event"),
      title: String(r.title ?? r.subject ?? r.event_type ?? "Event"),
      body: (r.body ?? r.description ?? null) as string | null,
      source: (r.source ?? undefined) as string | undefined,
    }));
  }, [timelineQ.data]);

  const interactionsTimeline: TimelineItem[] = useMemo(() => {
    const rows = (interactionsQ.data?.rows as Array<Record<string, unknown>> | undefined) ?? [];
    return rows.map((r) => ({
      ts: String(r.occurred_at ?? r.created_at),
      event_type: String(r.channel ?? "interaction"),
      title: String(r.subject ?? r.channel ?? "Interaction"),
      body: (r.body ?? null) as string | null,
      source: (r.direction ?? undefined) as string | undefined,
    }));
  }, [interactionsQ.data]);

  if (leadQ.isLoading || !lead) {
    return (
      <PageContainer title="Lead 360">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  const score = Number(lead.lead_score ?? 0);
  const nextFu = followUpsQ.data?.rows?.[0] as { due_at: string; kind: string } | undefined;
  const openSla = slaQ.data?.rows?.[0] as { due_at: string; kind: string; status: string } | undefined;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Button asChild variant="ghost" size="sm"><Link to="/leads/list"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
          <Badge variant="outline" className="font-mono">{lead.lead_code}</Badge>
          <Badge>{lead.stage_code}</Badge>
          {lead.status && <Badge variant="secondary">{lead.status}</Badge>}
          <Badge variant="outline"><Flag className="h-3 w-3 mr-1" />{lead.priority}</Badge>
        </div>
        <h1 className="font-display text-2xl font-semibold">
          <Link to="/patients/$personId" params={{ personId: lead.person_id }} className="hover:underline">
            Person {String(lead.person_id).slice(0, 8)}
          </Link>
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5" />Score {score.toFixed(1)}</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />AI {Number(lead.ai_score ?? 0).toFixed(1)}</span>
          <span>Source: <b>{lead.source ?? "—"}</b></span>
          <span>Campaign: <b>{lead.campaign_id ?? "—"}</b></span>
          <span>Owner: <b>{lead.owner_id ? String(lead.owner_id).slice(0, 8) : "Unassigned"}</b></span>
          <span>Branch: <b>{lead.branch_id ? String(lead.branch_id).slice(0, 8) : "—"}</b></span>
        </div>
      </div>
    </div>
  );

  const scoreRow = (label: string, val: number, icon: React.ReactNode) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">{icon}{label}</span>
        <span className="font-medium tabular-nums">{val.toFixed(1)}</span>
      </div>
      <Progress value={Math.min(100, Math.max(0, val))} />
    </div>
  );

  const contextSections = [
    {
      id: "sla",
      label: "SLA",
      icon: <Timer className="h-3.5 w-3.5" />,
      content: openSla ? (
        <div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{openSla.kind}</span>
            <Badge variant={openSla.status === "breached" ? "destructive" : "outline"}>{openSla.status}</Badge>
          </div>
          <div className="mt-1 text-xs">Due {formatDistanceToNow(openSla.due_at)} • {formatDateTime(openSla.due_at)}</div>
        </div>
      ) : <span className="text-muted-foreground text-xs">No open SLA</span>,
    },
    {
      id: "followup",
      label: "Next Follow-up",
      icon: <CalendarClock className="h-3.5 w-3.5" />,
      content: nextFu
        ? <div><div className="font-medium">{nextFu.kind}</div><div className="text-xs text-muted-foreground">{formatDateTime(nextFu.due_at)} • {formatDistanceToNow(nextFu.due_at)}</div></div>
        : <span className="text-muted-foreground text-xs">None scheduled</span>,
    },
    {
      id: "score",
      label: "Lead Score",
      icon: <GaugeCircle className="h-3.5 w-3.5" />,
      content: (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between"><span className="text-2xl font-semibold tabular-nums">{score.toFixed(1)}</span><span className="text-xs text-muted-foreground">/ 100</span></div>
          {scoreRow("AI", Number(lead.ai_score ?? 0), <Sparkles className="h-3 w-3" />)}
          {scoreRow("Marketing", Number(lead.marketing_score ?? 0), <Target className="h-3 w-3" />)}
          {scoreRow("Behaviour", Number(lead.behavior_score ?? 0), <Activity className="h-3 w-3" />)}
          {scoreRow("Sales", Number(lead.sales_score ?? 0), <Award className="h-3 w-3" />)}
          {scoreRow("Manual", Number(lead.manual_score ?? 0), <User className="h-3 w-3" />)}
        </div>
      ),
    },
    {
      id: "conv",
      label: "Conversion Probability",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      content: <div><div className="text-xl font-semibold">{Math.round(Math.min(100, score))}%</div><div className="text-xs text-muted-foreground">Derived from composite score</div></div>,
    },
    {
      id: "recent",
      label: "Recent Interactions",
      icon: <History className="h-3.5 w-3.5" />,
      content: interactionsTimeline.length ? (
        <ul className="space-y-1.5">
          {interactionsTimeline.slice(0, 4).map((it, i) => (
            <li key={i} className="flex justify-between gap-2 text-xs">
              <span className="truncate"><b className="text-foreground">{it.event_type}</b> {it.title}</span>
              <span className="shrink-0 text-muted-foreground">{formatDistanceToNow(it.ts)}</span>
            </li>
          ))}
        </ul>
      ) : <span className="text-muted-foreground text-xs">No interactions yet</span>,
    },
    {
      id: "owner",
      label: "Assigned Owner",
      icon: <UserCheck className="h-3.5 w-3.5" />,
      content: lead.owner_id ? <code className="text-xs">{String(lead.owner_id)}</code> : <span className="text-muted-foreground text-xs">Unassigned</span>,
    },
    {
      id: "revenue",
      label: "Revenue Attribution",
      icon: <Wallet className="h-3.5 w-3.5" />,
      content: (() => {
        const credits = (creditsQ.data?.rows as Array<{ amount: number | string; currency: string }> | undefined) ?? [];
        const total = credits.reduce((s, r) => s + Number(r.amount ?? 0), 0);
        const ltv = ltvQ.data?.ltv as { lifetime_value?: number } | null | undefined;
        return (
          <div>
            <div className="text-lg font-semibold">₹{total.toLocaleString("en-IN")}</div>
            <div className="text-xs text-muted-foreground">{credits.length} credit(s)</div>
            {ltv?.lifetime_value != null && <div className="text-xs mt-1">LTV: ₹{Number(ltv.lifetime_value).toLocaleString("en-IN")}</div>}
          </div>
        );
      })(),
    },
    {
      id: "ai",
      label: "Latest AI Recommendation",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      content: <span className="text-muted-foreground text-xs">AI recommendations surface here once the consultation engine writes one.</span>,
    },
    {
      id: "tasks",
      label: "Open Tasks",
      icon: <ListChecks className="h-3.5 w-3.5" />,
      content: <span className="text-muted-foreground text-xs">Task board module ships in a later stage.</span>,
    },
  ];

  const attribution = (
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-base">Source & Campaign</CardTitle></CardHeader><CardContent className="space-y-1.5 text-sm">
        <Row k="Source" v={lead.source} />
        <Row k="Campaign" v={lead.campaign_id} />
        <Row k="UTM Source" v={lead.utm_source} />
        <Row k="UTM Medium" v={lead.utm_medium} />
        <Row k="UTM Campaign" v={lead.utm_campaign} />
        <Row k="UTM Term" v={lead.utm_term} />
        <Row k="UTM Content" v={lead.utm_content} />
        <Row k="Device" v={lead.device} />
        <Row k="Landing Page" v={lead.landing_page} />
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Revenue Credits</CardTitle></CardHeader><CardContent>
        {(() => {
          const rows = (creditsQ.data?.rows as Array<Record<string, unknown>> | undefined) ?? [];
          if (rows.length === 0) return <div className="text-sm text-muted-foreground">No revenue attributed yet.</div>;
          return (
            <ul className="space-y-2 text-sm">
              {rows.map((r, i) => (
                <li key={i} className="flex justify-between border-b pb-1.5 last:border-0">
                  <div><div className="font-medium">{String(r.model ?? "attribution")}</div><div className="text-xs text-muted-foreground">{formatDate(r.created_at as string)}</div></div>
                  <div className="text-right"><div className="tabular-nums">₹{Number(r.amount ?? 0).toLocaleString("en-IN")}</div><div className="text-xs text-muted-foreground">{String(r.currency ?? "INR")}</div></div>
                </li>
              ))}
            </ul>
          );
        })()}
      </CardContent></Card>
    </div>
  );

  const followUpsList = (() => {
    const rows = (followUpsQ.data?.rows as Array<Record<string, unknown>> | undefined) ?? [];
    if (rows.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">No follow-ups scheduled.</div>;
    return (
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between rounded-md border p-3 text-sm">
            <div><div className="font-medium">{String(r.kind)}</div><div className="text-xs text-muted-foreground">{String(r.notes ?? "")}</div></div>
            <div className="text-right"><Badge variant="outline">{String(r.status)}</Badge><div className="text-xs text-muted-foreground mt-1">{formatDateTime(r.due_at as string)}</div></div>
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <PageContainer title="Lead 360">
      <div className="space-y-4">
        <Card><CardContent className="pt-6">{header}</CardContent></Card>
        <Card><CardContent className="pt-4"><LeadQuickActions lead={{
          id: lead.id, tenant_id: lead.tenant_id, person_id: lead.person_id,
          owner_id: lead.owner_id, stage_code: lead.stage_code,
        }} /></CardContent></Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            <Tabs defaultValue="overview" className="w-full">
              <div className="overflow-x-auto">
                <TabsList className="w-max">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="interactions">Unified Interactions</TabsTrigger>
                  <TabsTrigger value="ai">AI Consultation</TabsTrigger>
                  <TabsTrigger value="attribution">Attribution</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue</TabsTrigger>
                  <TabsTrigger value="followups">Follow-ups</TabsTrigger>
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="appointments">Appointments</TabsTrigger>
                  <TabsTrigger value="conversion">Conversion</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-4 grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-base">Lead Details</CardTitle></CardHeader><CardContent className="space-y-1.5 text-sm">
                  <Row k="Lead code" v={lead.lead_code} />
                  <Row k="Stage" v={lead.stage_code} />
                  <Row k="Status" v={lead.status ?? "open"} />
                  <Row k="Priority" v={lead.priority} />
                  <Row k="Expected value" v={lead.expected_value != null ? `${lead.currency} ${Number(lead.expected_value).toLocaleString()}` : null} />
                  <Row k="Converted" v={lead.converted_at ? formatDateTime(lead.converted_at) : null} />
                  <Row k="Next follow-up" v={lead.next_follow_up_at ? formatDateTime(lead.next_follow_up_at) : null} />
                </CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base flex items-center gap-2"><GaugeCircle className="h-4 w-4" />Lead Score Breakdown</CardTitle></CardHeader><CardContent className="space-y-3">
                  {scoreRow("AI", Number(lead.ai_score ?? 0), <Sparkles className="h-3 w-3" />)}
                  {scoreRow("Marketing", Number(lead.marketing_score ?? 0), <Target className="h-3 w-3" />)}
                  {scoreRow("Behaviour", Number(lead.behavior_score ?? 0), <Activity className="h-3 w-3" />)}
                  {scoreRow("Sales", Number(lead.sales_score ?? 0), <Award className="h-3 w-3" />)}
                  {scoreRow("Manual", Number(lead.manual_score ?? 0), <User className="h-3 w-3" />)}
                  <div className="border-t pt-3 flex items-center justify-between"><span className="text-sm font-medium">Composite</span><span className="text-lg font-semibold tabular-nums">{score.toFixed(1)}</span></div>
                </CardContent></Card>
              </TabsContent>

              <TabsContent value="timeline" className="mt-4">
                <TimelinePanel items={timelineItems} emptyMessage="No timeline events yet." />
              </TabsContent>
              <TabsContent value="interactions" className="mt-4">
                <TimelinePanel items={interactionsTimeline} emptyMessage="No interactions logged." />
              </TabsContent>
              <TabsContent value="ai" className="mt-4">
                <PlaceholderPanel icon={<Sparkles className="h-5 w-5" />} title="AI Consultation" text="Consultation transcripts and severity rankings surface here once linked to the lead." />
              </TabsContent>
              <TabsContent value="attribution" className="mt-4">{attribution}</TabsContent>
              <TabsContent value="revenue" className="mt-4">{attribution}</TabsContent>
              <TabsContent value="followups" className="mt-4">{followUpsList}</TabsContent>
              <TabsContent value="tasks" className="mt-4">
                <PlaceholderPanel icon={<ListChecks className="h-5 w-5" />} title="Tasks" text="Tasks board ships with the Telecaller/Sales workspace stage." />
              </TabsContent>
              <TabsContent value="documents" className="mt-4">
                <PlaceholderPanel icon={<FileText className="h-5 w-5" />} title="Documents" text="Attach documents via the Data Foundation once wired to leads." />
              </TabsContent>
              <TabsContent value="notes" className="mt-4">
                <TimelinePanel items={interactionsTimeline.filter((i) => i.event_type === "note")} emptyMessage="No notes yet." />
              </TabsContent>
              <TabsContent value="appointments" className="mt-4">
                <PlaceholderPanel icon={<Calendar className="h-5 w-5" />} title="Appointments" text="Appointment module lands in a later phase." />
              </TabsContent>
              <TabsContent value="conversion" className="mt-4">
                <Card><CardContent className="pt-6 space-y-2 text-sm">
                  <Row k="Converted to" v={(lead as Record<string, unknown>).converted_to as string | null} />
                  <Row k="Converted at" v={lead.converted_at ? formatDateTime(lead.converted_at) : null} />
                  <Row k="Converted person" v={((lead as Record<string, unknown>).converted_person_id as string | null) ?? null} />
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm"><Link to="/patients/$personId" params={{ personId: lead.person_id }}><UserCheck className="h-4 w-4 mr-1" />Open Patient 360</Link></Button>
                  </div>
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="activity" className="mt-4">
                <TimelinePanel items={timelineItems} emptyMessage="No activity yet." />
              </TabsContent>
              <TabsContent value="audit" className="mt-4">
                <PlaceholderPanel icon={<ShieldCheck className="h-5 w-5" />} title="Audit" text="Read-only audit trail is written by the platform triggers; a viewer ships with the Audit module." />
              </TabsContent>
            </Tabs>
          </div>

          <Context360Panel sections={contextSections} />
        </div>
      </div>
    </PageContainer>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v != null && v !== "" ? v : <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

function PlaceholderPanel({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card><CardContent className="pt-10 pb-10 text-center">
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="font-medium">{title}</div>
      <div className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{text}</div>
    </CardContent></Card>
  );
}
