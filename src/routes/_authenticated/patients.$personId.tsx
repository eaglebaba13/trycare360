/**
 * Patient 360 Workspace
 * ------------------------------------------------------------------
 * The central operating workspace for every patient interaction.
 * Consumes only existing backend services (getPatientSummaryFull,
 * getPersonTimeline). Downstream tabs (EMR, Prescriptions, Orders,
 * Invoices, etc.) render placeholder panels until their owning
 * modules ship — no clinical/CRM/billing business logic here.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Star,
  Activity,
  Calendar,
  Wallet,
  ClipboardList,
  AlertTriangle,
  Pill,
  FileText,
  Image as ImageIcon,
  Bell,
  ShieldCheck,
  Users,
  Sparkles,
  History,
  StickyNote,
  Package,
  Receipt,
  TrendingUp,
  Camera,
  ScrollText,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { PatientContextBar } from "@/components/patient/context-bar";
import { QuickActions } from "@/components/patient/quick-actions";
import { KpiCard, KpiGrid, TimelinePanel, type TimelineItem } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/hooks/use-tenant";
import { getPatientSummaryFull, getPersonTimeline } from "@/lib/identity/services.functions";
import { formatDate } from "@/lib/standards-format";
import { toast } from "sonner";

const FAV_KEY = "patient360.favorites";
const RECENT_KEY = "patient360.recent";

export const Route = createFileRoute("/_authenticated/patients/$personId")({
  component: Patient360,
});

function Patient360() {
  const { personId } = Route.useParams();
  const { activeTenantId } = useTenant();
  const summaryFn = useServerFn(getPatientSummaryFull);
  const timelineFn = useServerFn(getPersonTimeline);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!personId) return;
    try {
      const recent: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      const next = [personId, ...recent.filter((r) => r !== personId)].slice(0, 10);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      const favs: string[] = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
      setIsFav(favs.includes(personId));
    } catch { /* ignore */ }
  }, [personId]);

  const summaryQ = useQuery({
    queryKey: ["patient360", "summary", activeTenantId, personId],
    queryFn: () => summaryFn({ data: { tenant_id: activeTenantId!, person_id: personId } }),
    enabled: !!activeTenantId,
  });
  const timelineQ = useQuery({
    queryKey: ["patient360", "timeline", activeTenantId, personId],
    queryFn: () => timelineFn({ data: { tenant_id: activeTenantId!, person_id: personId, limit: 200 } }),
    enabled: !!activeTenantId,
  });

  const toggleFav = () => {
    try {
      const favs: string[] = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
      const next = favs.includes(personId) ? favs.filter((f) => f !== personId) : [personId, ...favs].slice(0, 20);
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      setIsFav(next.includes(personId));
      toast.success(next.includes(personId) ? "Added to favorites" : "Removed from favorites");
    } catch { /* ignore */ }
  };

  if (summaryQ.isLoading) {
    return (
      <PageContainer title="Loading patient…">
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  const summary = summaryQ.data;
  if (!summary) {
    return (
      <PageContainer title="No patient record">
        <p className="text-sm text-muted-foreground">
          This person does not have a patient role attached. Attach the <code>patient</code> role from the person profile to open Patient 360.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/patients"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Patients</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/people/$personId" params={{ personId }}>Open person profile</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const { overview, latest_assessment, outstanding_payments, membership, subscription, clinical_alerts } = summary;
  const timeline = (timelineQ.data ?? []) as TimelineItem[];
  const outstandingTotal = outstanding_payments.reduce((s, p) => s + (p.amount ?? 0), 0);

  return (
    <PageContainer>
      <PatientContextBar
        person={overview.person}
        patient={overview.patient}
        alertCount={clinical_alerts.length}
        outstanding={outstandingTotal}
        membershipTier={membership?.tier ?? null}
        subscriptionPlan={subscription?.plan ?? null}
        riskLevel={clinical_alerts.length > 2 ? "high" : clinical_alerts.length > 0 ? "medium" : "low"}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={toggleFav} aria-label="Favorite">
              <Star className={isFav ? "h-4 w-4 fill-amber-500 text-amber-500" : "h-4 w-4"} />
            </Button>
            <QuickActions />
          </>
        }
      />

      <div className="mt-4">
        <KpiGrid>
          <KpiCard label="Outstanding" value={outstandingTotal > 0 ? `₹${outstandingTotal.toLocaleString()}` : "—"} icon={Wallet} tone={outstandingTotal > 0 ? "danger" : "default"} hint={`${outstanding_payments.length} open`} />
          <KpiCard label="Upcoming Appt" value="—" icon={Calendar} hint="Wires to Appointments" />
          <KpiCard label="Last Visit" value="—" icon={Activity} hint="Wires to Clinical" />
          <KpiCard label="Open Tasks" value="—" icon={ClipboardList} hint="Wires to Tasks" />
          <KpiCard label="Pending Reports" value="—" icon={FileText} hint="Wires to Documents" />
          <KpiCard label="Active Treatment" value="—" icon={Pill} hint="Wires to Treatments" />
          <KpiCard label="Alerts" value={clinical_alerts.length} icon={AlertTriangle} tone={clinical_alerts.length ? "warning" : "default"} />
          <KpiCard label="Last Assessment" value={latest_assessment ? formatDate(latest_assessment.initiated_at ?? latest_assessment.created_at) : "—"} icon={Sparkles} />
        </KpiGrid>
      </div>

      <div className="mt-6">
        <Tabs defaultValue="overview">
          <div className="overflow-x-auto">
            <TabsList className="w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline" className="gap-1.5">
                Timeline
                <Badge variant="outline" className="text-[10px]">{timeline.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="consultations">Consultations</TabsTrigger>
              <TabsTrigger value="emr">EMR</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="treatments">Treatments</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="membership">Membership</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="progress">Progress Photos</TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1.5">
                Medical Alerts
                {clinical_alerts.length > 0 && <Badge variant="destructive" className="text-[10px]">{clinical_alerts.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="allergies">Allergies</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="consents">Consents</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
              <TabsTrigger value="ai">AI Recommendations</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-4">
            <OverviewTab
              summary={summary}
              outstandingTotal={outstandingTotal}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Chronological activity</CardTitle></CardHeader>
              <CardContent>
                <TimelinePanel items={timeline} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Active Medical Alerts</CardTitle></CardHeader>
              <CardContent>
                {clinical_alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No active medical alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {clinical_alerts.map((a) => (
                      <li key={a.id} className="flex items-start gap-2 rounded-md border p-3">
                        <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{a.alert_code}</div>
                          {a.details && <div className="text-xs text-muted-foreground">{a.details}</div>}
                          <div className="text-[11px] text-muted-foreground mt-1">Severity: {a.severity ?? "—"}</div>
                        </div>
                      </li>
                    ))}
                  </ul>

                )}
              </CardContent>
            </Card>
          </TabsContent>

          <PlaceholderTab value="assessments" title="Assessments" icon={Sparkles} note="Wires to the AI Assessment Platform (Phase 2.2)." />
          <PlaceholderTab value="appointments" title="Appointments" icon={Calendar} note="Wires to the Appointment module (Phase 2.4)." />
          <PlaceholderTab value="consultations" title="Consultations" icon={Stethoscope} note="Wires to the Clinical module (Phase 2.4)." />
          <PlaceholderTab value="emr" title="Electronic Medical Record" icon={ScrollText} note="Wires to Clinical EMR." />
          <PlaceholderTab value="prescriptions" title="Prescriptions" icon={Pill} note="Wires to Clinical prescribing." />
          <PlaceholderTab value="treatments" title="Treatments" icon={Activity} note="Wires to Treatment plans." />
          <PlaceholderTab value="products" title="Products" icon={Package} note="Wires to Inventory / Pharmacy." />
          <PlaceholderTab value="orders" title="Orders" icon={Package} note="Wires to Order fulfilment." />
          <PlaceholderTab value="invoices" title="Invoices" icon={Receipt} note="Wires to Finance & Billing." />
          <PlaceholderTab value="payments" title="Payments" icon={Wallet} note="Wires to Finance." />
          <PlaceholderTab value="membership" title="Membership" icon={Star} note="Wires to Membership plans." />
          <PlaceholderTab value="subscription" title="Subscription" icon={TrendingUp} note="Wires to Subscription billing." />
          <PlaceholderTab value="documents" title="Documents" icon={FileText} note="Consumes existing documents module — viewer coming." />
          <PlaceholderTab value="media" title="Media" icon={ImageIcon} note="Image / video viewer." />
          <PlaceholderTab value="progress" title="Progress Photos" icon={Camera} note="Before/after comparison viewer." />
          <PlaceholderTab value="allergies" title="Allergies" icon={AlertTriangle} note="Derived from medical alerts (allergy type)." />
          <PlaceholderTab value="notes" title="Notes" icon={StickyNote} note="Internal notes on patient record." />
          <PlaceholderTab value="tasks" title="Tasks" icon={ClipboardList} note="Wires to Tasks module." />
          <PlaceholderTab value="notifications" title="Notifications" icon={Bell} note="Wires to Notification module." />
          <PlaceholderTab value="consents" title="Consents" icon={ShieldCheck} note="Consent history + revocation." />
          <PlaceholderTab value="relationships" title="Relationships" icon={Users} note="Family, guardians, corporate links." />
          <PlaceholderTab value="ai" title="AI Recommendations" icon={Sparkles} note="Wires to AI Assessment Platform." />
          <PlaceholderTab value="audit" title="Audit Trail" icon={History} note="From audit_logs — read-only." />
        </Tabs>
      </div>
    </PageContainer>
  );
}

function Stethoscope(props: React.SVGProps<SVGSVGElement>) {
  // small local re-export to avoid an extra import
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 2v2" /><path d="M5 2v2" /><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
      <path d="M8 15a6 6 0 0 0 12 0v-3" /><circle cx="20" cy="10" r="2" />
    </svg>
  );
}

function OverviewTab({
  summary,
  outstandingTotal,
}: {
  summary: NonNullable<Awaited<ReturnType<typeof getPatientSummaryFull>>>;
  outstandingTotal: number;
}) {
  const { overview, latest_assessment, membership, subscription, contacts, addresses, tags } = summary;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-sm">Clinical Summary</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
          <Kv k="Latest diagnosis" v="—" />
          <Kv k="Latest prescription" v="—" />
          <Kv k="Latest progress" v={latest_assessment ? formatDate(latest_assessment.initiated_at ?? latest_assessment.created_at) : "—"} />
          <Kv k="Vitals" v="—" />
          <Kv k="Clinical flags" v={summary.clinical_alerts.length ? `${summary.clinical_alerts.length} active` : "None"} />
          <Kv k="Verified" v={overview.verified ? "Yes" : "No"} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Financial Summary</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Kv k="Revenue (LTV)" v="—" />
          <Kv k="Outstanding" v={outstandingTotal ? `₹${outstandingTotal.toLocaleString()}` : "—"} />
          <Kv k="Refunds" v="—" />
          <Kv k="Wallet" v="—" />
          <Kv k="Membership" v={membership?.tier ?? "—"} />
          <Kv k="Subscription" v={subscription?.plan ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Contacts</CardTitle></CardHeader>
        <CardContent>
          {contacts.length === 0 ? <p className="text-xs text-muted-foreground">No contact channels.</p> : (
            <ul className="space-y-1.5 text-sm">
              {contacts.slice(0, 5).map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground capitalize">{c.channel}</span>
                  <span className="font-medium truncate">{c.value_normalized ?? c.value_raw}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Addresses</CardTitle></CardHeader>
        <CardContent>
          {addresses.length === 0 ? <p className="text-xs text-muted-foreground">No addresses on file.</p> : (
            <ul className="space-y-1.5 text-sm">
              {addresses.slice(0, 3).map((a) => (
                <li key={a.id} className="truncate">
                  <span className="text-muted-foreground capitalize mr-1">{a.address_type}:</span>
                  {[a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {tags.length === 0 ? <p className="text-xs text-muted-foreground">No tags.</p> :
            tags.map((t) => <Badge key={`${t.person_id}-${t.tag_def_id}`} variant="outline">{t.tag_def_id.slice(0, 6)}</Badge>)}
        </CardContent>
      </Card>
    </div>
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

function PlaceholderTab({
  value,
  title,
  icon: Icon,
  note,
}: {
  value: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  note: string;
}) {
  return (
    <TabsContent value={value} className="mt-4">
      <Card>
        <CardContent className="py-16 text-center">
          <Icon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div className="text-sm font-medium">{title}</div>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{note}</p>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
