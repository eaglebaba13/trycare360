import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Phone, Mail, Cake, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { DetailShell, TimelinePanel } from "@/components/standards";
import type { TimelineItem } from "@/components/standards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/hooks/use-tenant";
import { getPerson } from "@/lib/identity/persons.functions";
import { getPersonTimeline } from "@/lib/identity/services.functions";
import { initials, formatDate } from "@/lib/standards-format";

export const Route = createFileRoute("/_authenticated/people/$personId")({
  component: PersonProfile,
});

function PersonProfile() {
  const { personId } = Route.useParams();
  const { activeTenantId } = useTenant();
  const getPersonFn = useServerFn(getPerson);
  const timelineFn = useServerFn(getPersonTimeline);

  const personQ = useQuery({
    queryKey: ["person", activeTenantId, personId],
    queryFn: () => getPersonFn({ data: { tenant_id: activeTenantId!, id: personId } }),
    enabled: !!activeTenantId,
  });
  const timelineQ = useQuery({
    queryKey: ["person", "timeline", activeTenantId, personId],
    queryFn: () => timelineFn({ data: { tenant_id: activeTenantId!, person_id: personId, limit: 100 } }),
    enabled: !!activeTenantId,
  });

  const p = personQ.data?.person;
  const timeline = (timelineQ.data ?? []) as TimelineItem[];

  if (personQ.isLoading) {
    return (
      <PageContainer title="Loading…">
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    );
  }

  if (!p) {
    return (
      <PageContainer title="Not found">
        <p className="text-sm text-muted-foreground">This person does not exist or has been archived.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link to="/people/list"><ArrowLeft className="h-4 w-4 mr-1" /> Back to list</Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/people/list"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          <Button variant="outline">Edit</Button>
        </>
      }
    >
      <DetailShell
        header={
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              {p.photo_url && <AvatarImage src={p.photo_url} alt={p.full_name} />}
              <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-semibold truncate">{p.full_name}</h1>
                <Badge variant={p.identity_status === "active" ? "default" : "secondary"} className="capitalize">
                  {p.identity_status}
                </Badge>
                {p.vip_flag && <Badge className="bg-amber-500 hover:bg-amber-500">VIP</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {p.phone_e164 ?? "—"}</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {p.email_normalized ?? "—"}</span>
                <span className="flex items-center gap-1"><Cake className="h-3.5 w-3.5" /> {formatDate(p.dob)}</span>
                <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {p.verification_status ?? "unverified"}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">ID: {p.id}</div>
            </div>
          </div>
        }
        sidebar={
          <Card>
            <CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Kv k="Language" v={p.preferred_language ?? "—"} />
              <Kv k="Channel" v={p.preferred_channel_code ?? "—"} />
              <Kv k="Timezone" v={p.timezone ?? "—"} />
              <Kv k="Marketing" v={p.marketing_opt_in ? "Opted in" : "No"} />
              <Kv k="Service" v={p.service_opt_in ? "Opted in" : "No"} />
              <Kv k="Transactional" v={p.transactional_opt_in ? "Opted in" : "No"} />
            </CardContent>
          </Card>
        }
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <Card>
                <CardContent className="pt-6 grid gap-3 md:grid-cols-2">
                  <Kv k="First name" v={p.first_name ?? "—"} />
                  <Kv k="Middle name" v={p.middle_name ?? "—"} />
                  <Kv k="Last name" v={p.last_name ?? "—"} />
                  <Kv k="Display name" v={p.display_name ?? "—"} />
                  <Kv k="Gender" v={p.gender ?? "—"} />
                  <Kv k="Salutation" v={p.salutation ?? "—"} />
                  <Kv k="Created" v={formatDate(p.created_at)} />
                  <Kv k="Updated" v={formatDate(p.updated_at)} />
                </CardContent>
              </Card>
            ),
          },
          { id: "contacts", label: "Contacts", content: <Empty msg="Contact channels appear here." /> },
          { id: "addresses", label: "Addresses", content: <Empty msg="Addresses appear here." /> },
          { id: "relationships", label: "Relationships", content: <Empty msg="Family & guardian links." /> },
          { id: "consents", label: "Consents", content: <Empty msg="Consent history." /> },
          { id: "alerts", label: "Medical Alerts", content: <Empty msg="Allergies, chronic conditions, alerts." /> },
          {
            id: "timeline",
            label: "Timeline",
            count: timeline.length,
            content: <TimelinePanel items={timeline} />,
          },
          { id: "documents", label: "Documents", content: <Empty msg="Attached documents." /> },
          { id: "notes", label: "Notes", content: <Empty msg="Internal notes." /> },
          { id: "roles", label: "Roles", content: <Empty msg="Attached roles: patient, doctor, employee, etc." /> },
          { id: "audit", label: "Audit", content: <Empty msg="Audit trail from audit_logs." /> },
        ]}
      />
    </PageContainer>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right truncate">{v}</span>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center text-sm text-muted-foreground py-12">{msg}</CardContent>
    </Card>
  );
}
