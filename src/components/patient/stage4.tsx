/**
 * Patient Portal — Stage 4 self-service workflows & digital experience.
 * Every workspace reuses Stage 2 server functions; no business logic,
 * no direct Supabase calls, no duplicate workflow/notification/payment
 * plumbing.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  BellRing,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Crown,
  Gift,
  Headphones,
  HeartPulse,
  ListChecks,
  MessageSquare,
  Pill,
  QrCode,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Video,
  Wallet as WalletIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { DataGrid } from "@/components/standards/data-grid";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell, PatientEmpty } from "./shell";
import {
  getMyQueueStatus,
  listMyAppointments,
  selfCheckIn,
} from "@/lib/patient/appointments.functions";
import {
  getTeleconsultJoinInfo,
  listMyTeleconsultations,
} from "@/lib/patient/teleconsult.functions";
import { listMyConsents, recordDigitalConsent } from "@/lib/patient/consent.functions";
import {
  listHealthGoals,
  listHealthMetrics,
  recordHealthMetric,
  upsertHealthGoal,
} from "@/lib/patient/health.functions";
import { listMyPrescriptions } from "@/lib/patient/records.functions";
import { listMyMemberships } from "@/lib/patient/membership.functions";
import { getMyWallet, listWalletTransactions } from "@/lib/patient/wallet.functions";
import {
  getMyLoyaltyAccount,
  listAvailableRewards,
  listLoyaltyTransactions,
  redeemReward,
} from "@/lib/patient/loyalty.functions";
import {
  getNotificationPreferences,
  listNotificationHistory,
  registerPushToken,
  removePushToken,
  updateNotificationPreferences,
} from "@/lib/patient/notifications.functions";
import {
  createConversation,
  listConversations,
  markConversationRead,
  sendChatMessage,
} from "@/lib/patient/conversations.functions";
import { listPortalSessions, revokePortalSession } from "@/lib/patient/sessions.functions";
import { getPatientPortalDashboard } from "@/lib/patient/dashboard.functions";

/* ------------------------------------------------------------------ */
/*  Check-in Workspace + Digital Queue                                 */
/* ------------------------------------------------------------------ */

type Appt = {
  id: string;
  starts_at: string;
  status?: string | null;
  reason?: string | null;
};

export function CheckinWorkspace() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyAppointments);
  const checkInFn = useServerFn(selfCheckIn);
  const q = useQuery<Appt[]>({
    queryKey: ["patient-appts"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Appt[]>,
  });
  const today = (q.data ?? []).filter((a) => {
    const d = new Date(a.starts_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const checkIn = useMutation({
    mutationFn: (id: string) => checkInFn({ data: { appointmentId: id } }),
    onSuccess: () => {
      toast.success("Checked in");
      qc.invalidateQueries({ queryKey: ["patient-appts"] });
      qc.invalidateQueries({ queryKey: ["patient-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (today.length === 0)
    return <PatientEmpty title="No appointments today" hint="Digital check-in unlocks 30 minutes before your visit." />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {today.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm">{a.reason ?? "Appointment"}</CardTitle>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <CalendarClock className="h-3 w-3 inline mr-1" />
                  {formatDateTime(a.starts_at)}
                </div>
              </div>
              {a.status && <Badge variant="outline">{a.status}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <Button
              size="sm"
              onClick={() => checkIn.mutate(a.id)}
              disabled={checkIn.isPending}
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Check in now
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DigitalQueueCard() {
  const fn = useServerFn(getMyQueueStatus);
  const q = useQuery({
    queryKey: ["patient-queue"],
    queryFn: () => fn({ data: {} }),
    refetchInterval: 30_000,
  });
  const data = (q.data ?? {}) as { position?: number; waitMinutes?: number; status?: string };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Timer className="h-4 w-4" /> Digital Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-semibold tabular-nums">{data.position ?? "—"}</div>
        <div className="text-xs text-muted-foreground">Your position in the queue</div>
        <Separator />
        <div className="text-sm">
          Estimated wait:{" "}
          <span className="font-medium">{data.waitMinutes != null ? `${data.waitMinutes} min` : "—"}</span>
        </div>
        {data.status && <Badge variant="outline">{data.status}</Badge>}
      </CardContent>
    </Card>
  );
}

export function CheckinPage() {
  return (
    <PatientShell title="Check-in" description="Skip the front desk with digital check-in.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <CheckinWorkspace />
        <DigitalQueueCard />
      </div>
    </PatientShell>
  );
}

export function CheckinSuccessPage() {
  return (
    <PatientShell title="You're checked in" description="Please have a seat — we'll call you shortly.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="text-lg font-medium">Check-in successful</div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              We've notified your care team. Track your position live in the digital queue.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild variant="outline">
                <Link to="/patient">Back to home</Link>
              </Button>
              <Button asChild>
                <Link to="/patient/appointments">View appointments</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <DigitalQueueCard />
      </div>
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Self Assessment                                                    */
/* ------------------------------------------------------------------ */

const ASSESSMENT_QUESTIONS = [
  { id: "pain", label: "Rate your current pain (0-10)" },
  { id: "sleep", label: "Rate your sleep quality (0-10)" },
  { id: "energy", label: "Rate your energy level (0-10)" },
  { id: "mood", label: "Rate your mood (0-10)" },
];

export function SelfAssessmentWorkspace() {
  const qc = useQueryClient();
  const recFn = useServerFn(recordHealthMetric);
  const [values, setValues] = useState<Record<string, string>>({});
  const submit = useMutation({
    mutationFn: async () => {
      const ts = new Date().toISOString();
      for (const q of ASSESSMENT_QUESTIONS) {
        if (values[q.id]) {
          await recFn({
            data: {
              metricType: `assessment_${q.id}`,
              value: Number(values[q.id]),
              unit: "score",
              recordedAt: ts,
            },
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Assessment submitted");
      qc.invalidateQueries({ queryKey: ["patient-metrics"] });
      setValues({});
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const canSubmit = ASSESSMENT_QUESTIONS.every((q) => values[q.id]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Daily Self-Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ASSESSMENT_QUESTIONS.map((q) => (
          <div key={q.id} className="grid gap-1.5">
            <Label>{q.label}</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={values[q.id] ?? ""}
              onChange={(e) => setValues({ ...values, [q.id]: e.target.value })}
            />
          </div>
        ))}
        <Button onClick={() => submit.mutate()} disabled={!canSubmit || submit.isPending} className="w-full">
          Submit assessment
        </Button>
      </CardContent>
    </Card>
  );
}

export function SelfAssessmentPage() {
  return (
    <PatientShell title="Self Assessment" description="Log how you're feeling — helps your care team personalize care.">
      <div className="grid gap-4 lg:grid-cols-2">
        <SelfAssessmentWorkspace />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Why this matters
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Regular assessments give your doctor a longitudinal view of your wellbeing between visits.</p>
            <p>Your responses are private and stored securely with your health record.</p>
          </CardContent>
        </Card>
      </div>
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Pre-visit Forms                                                    */
/* ------------------------------------------------------------------ */

export function PreVisitWorkspace() {
  const listFn = useServerFn(listMyAppointments);
  const q = useQuery<Appt[]>({
    queryKey: ["patient-appts"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Appt[]>,
  });
  const upcoming = (q.data ?? []).filter((a) => new Date(a.starts_at).getTime() >= Date.now());
  if (upcoming.length === 0) return <PatientEmpty title="No upcoming visits" />;
  return (
    <div className="space-y-3">
      {upcoming.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm">{a.reason ?? "Appointment"}</CardTitle>
                <div className="text-xs text-muted-foreground">{formatDateTime(a.starts_at)}</div>
              </div>
              <Badge variant="outline">Pre-visit</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <PreVisitChecklistItem label="Complete intake questionnaire" href="/patient/self-assessment" />
            <PreVisitChecklistItem label="Review & sign consent forms" href="/patient/consent-review" />
            <PreVisitChecklistItem label="Upload recent reports" href="/patient/documents" />
            <PreVisitChecklistItem label="Update medication list" href="/patient/prescriptions" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PreVisitChecklistItem({ label, href }: { label: string; href: string }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
    >
      <span className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" /> {label}
      </span>
      <span className="text-xs text-primary">Open →</span>
    </Link>
  );
}

export function PreVisitPage() {
  return (
    <PatientShell title="Pre-visit Prep" description="Complete these before your visit to save time.">
      <PreVisitWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Consent Review                                                     */
/* ------------------------------------------------------------------ */

type Consent = {
  id: string;
  consent_type: string;
  version: string;
  status?: string | null;
  granted_at?: string | null;
  revoked_at?: string | null;
};

export function ConsentReviewWorkspace() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyConsents);
  const recFn = useServerFn(recordDigitalConsent);
  const q = useQuery<Consent[]>({
    queryKey: ["patient-consents"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Consent[]>,
  });
  const rows = q.data ?? [];
  const accept = useMutation({
    mutationFn: (v: { consentType: string; version: string }) =>
      recFn({ data: { consentType: v.consentType, version: v.version } }),
    onSuccess: () => {
      toast.success("Consent recorded");
      qc.invalidateQueries({ queryKey: ["patient-consents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const required = [
    { consentType: "treatment", label: "Consent to Treatment", version: "1.0" },
    { consentType: "data_sharing", label: "Data Sharing & Privacy", version: "1.0" },
    { consentType: "teleconsult", label: "Telehealth Consent", version: "1.0" },
  ];
  return (
    <div className="space-y-3">
      {required.map((r) => {
        const existing = rows.find(
          (x) => x.consent_type === r.consentType && x.status === "granted",
        );
        return (
          <Card key={r.consentType}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">{r.label}</CardTitle>
                  <div className="text-xs text-muted-foreground">Version {r.version}</div>
                </div>
                {existing ? (
                  <Badge>Signed</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Review the full document and record your digital signature.
              </p>
              {!existing && (
                <Button
                  size="sm"
                  onClick={() => accept.mutate({ consentType: r.consentType, version: r.version })}
                  disabled={accept.isPending}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5" /> I agree
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ConsentReviewPage() {
  return (
    <PatientShell title="Consent Review" description="Review and sign the consents required for your care.">
      <ConsentReviewWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Teleconsult Waiting Room                                           */
/* ------------------------------------------------------------------ */

type Tele = {
  id: string;
  scheduled_at?: string | null;
  status?: string | null;
  provider?: string | null;
};

export function TeleconsultWaitingRoom() {
  const listFn = useServerFn(listMyTeleconsultations);
  const joinFn = useServerFn(getTeleconsultJoinInfo);
  const q = useQuery<Tele[]>({
    queryKey: ["patient-tele"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Tele[]>,
  });
  const items = q.data ?? [];
  const next = items[0];
  const join = useMutation({
    mutationFn: (id: string) => joinFn({ data: { sessionId: id } }),
    onSuccess: (info) => {
      const url = (info as { joinUrl?: string })?.joinUrl;
      if (url) window.open(url, "_blank", "noopener");
      else toast.info("Join link not ready yet.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!next) return <PatientEmpty title="No teleconsults scheduled" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Video className="h-4 w-4" /> Teleconsult Waiting Room
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-sm font-medium">
            {next.scheduled_at ? formatDateTime(next.scheduled_at) : "Awaiting schedule"}
          </div>
          <div className="text-xs text-muted-foreground">{next.provider ?? "Care team"}</div>
        </div>
        <Button className="w-full" onClick={() => join.mutate(next.id)} disabled={join.isPending}>
          <Video className="h-4 w-4 mr-1.5" /> Join session
        </Button>
        <p className="text-xs text-muted-foreground">
          Please test your camera and microphone before joining. Your care team will admit you when ready.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Health Goal Tracker                                                */
/* ------------------------------------------------------------------ */

type Goal = {
  id: string;
  title?: string | null;
  goal_type: string;
  target_value?: number | null;
  current_value?: number | null;
  status?: string | null;
};

export function HealthGoalTracker() {
  const qc = useQueryClient();
  const listFn = useServerFn(listHealthGoals);
  const upsertFn = useServerFn(upsertHealthGoal);
  const q = useQuery<Goal[]>({
    queryKey: ["patient-goals"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Goal[]>,
  });
  const rows = q.data ?? [];
  const [form, setForm] = useState({ title: "", goalType: "steps", targetValue: "" });
  const create = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          title: form.title,
          goalType: form.goalType,
          targetValue: form.targetValue ? Number(form.targetValue) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Goal saved");
      qc.invalidateQueries({ queryKey: ["patient-goals"] });
      setForm({ title: "", goalType: "steps", targetValue: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" /> New health goal
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4 items-end">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={form.goalType} onChange={(e) => setForm({ ...form, goalType: e.target.value })} />
          </div>
          <div>
            <Label>Target</Label>
            <Input
              type="number"
              value={form.targetValue}
              onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
            />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !form.title}>
            Save goal
          </Button>
        </CardContent>
      </Card>
      {rows.length === 0 ? (
        <PatientEmpty title="No goals yet" hint="Create a goal to start tracking progress." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((g) => {
            const pct =
              g.target_value && g.current_value
                ? Math.min(100, Math.round((g.current_value / g.target_value) * 100))
                : 0;
            return (
              <Card key={g.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{g.title ?? g.goal_type}</CardTitle>
                    {g.status && <Badge variant="outline">{g.status}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="tabular-nums font-medium">
                      {g.current_value ?? 0} / {g.target_value ?? "—"}
                    </span>
                  </div>
                  <Progress value={pct} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function HealthGoalsPage() {
  return (
    <PatientShell title="Health Goals" description="Set and track goals with your care team.">
      <HealthGoalTracker />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Health Metric Timeline                                             */
/* ------------------------------------------------------------------ */

type Metric = {
  id: string;
  metric_type: string;
  value: number;
  unit?: string | null;
  recorded_at: string;
};

export function HealthMetricTimeline() {
  const fn = useServerFn(listHealthMetrics);
  const q = useQuery<Metric[]>({
    queryKey: ["patient-metrics"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<Metric[]>,
  });
  const items = (q.data ?? []).map((m) => ({
    ts: m.recorded_at,
    event_type: m.metric_type,
    title: `${m.metric_type}: ${m.value} ${m.unit ?? ""}`.trim(),
    body: null,
  }));
  return <TimelinePanel items={items} emptyMessage="No metrics recorded yet." />;
}

export function HealthMetricsPage() {
  return (
    <PatientShell title="Health Metrics" description="Chronological view of your recorded vitals.">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Metric timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HealthMetricTimeline />
        </CardContent>
      </Card>
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Conversation Workspace / Chat                                      */
/* ------------------------------------------------------------------ */

type Conversation = {
  id: string;
  subject?: string | null;
  last_message_at?: string | null;
  unread_count?: number | null;
  messages?: { id: string; body: string; sender: string; created_at: string }[];
};

export function ChatWorkspace() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const sendFn = useServerFn(sendChatMessage);
  const createFn = useServerFn(createConversation);
  const markFn = useServerFn(markConversationRead);
  const q = useQuery<Conversation[]>({
    queryKey: ["patient-chat"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Conversation[]>,
  });
  const items = q.data ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const active = useMemo(
    () => items.find((c) => c.id === activeId) ?? items[0] ?? null,
    [items, activeId],
  );
  const send = useMutation({
    mutationFn: () =>
      sendFn({ data: { conversationId: active?.id ?? "", body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["patient-chat"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const create = useMutation({
    mutationFn: () => createFn({ data: { subject: "New conversation" } }),
    onSuccess: () => {
      toast.success("Started");
      qc.invalidateQueries({ queryKey: ["patient-chat"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mark = useMutation({
    mutationFn: (id: string) => markFn({ data: { conversationId: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patient-chat"] }),
  });
  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr] min-h-[420px]">
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Conversations</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => create.mutate()} disabled={create.isPending}>
            + New
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            <ul className="divide-y">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(c.id);
                      if ((c.unread_count ?? 0) > 0) mark.mutate(c.id);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 ${active?.id === c.id ? "bg-muted/40" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm truncate">{c.subject ?? "Conversation"}</div>
                      {(c.unread_count ?? 0) > 0 && <Badge>{c.unread_count}</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {c.last_message_at ? formatDateTime(c.last_message_at) : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{active?.subject ?? "Select a conversation"}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {(active?.messages ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${
                m.sender === "patient" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <div>{m.body}</div>
              <div className="text-[10px] opacity-70 mt-1">{formatDateTime(m.created_at)}</div>
            </div>
          ))}
          {active && (active.messages ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">No messages yet.</div>
          )}
        </CardContent>
        {active && (
          <div className="border-t p-2 flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && body.trim()) send.mutate();
              }}
            />
            <Button onClick={() => send.mutate()} disabled={send.isPending || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export function ChatPage() {
  return (
    <PatientShell title="Messages" description="Chat with your care team.">
      <ChatWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Health Education Library                                           */
/* ------------------------------------------------------------------ */

const EDUCATION_ARTICLES = [
  {
    id: "diabetes-101",
    title: "Understanding Diabetes",
    summary: "The basics of type 1 and type 2 diabetes and how to manage them.",
    category: "Endocrinology",
  },
  {
    id: "heart-health",
    title: "Heart-healthy habits",
    summary: "Simple daily practices to keep your cardiovascular system strong.",
    category: "Cardiology",
  },
  {
    id: "mental-wellbeing",
    title: "Mental wellbeing basics",
    summary: "Recognizing early signs of stress, anxiety, and when to seek help.",
    category: "Mental Health",
  },
  {
    id: "medication-safety",
    title: "Medication safety at home",
    summary: "Storage, adherence, and how to talk to your pharmacist.",
    category: "Pharmacy",
  },
  {
    id: "nutrition",
    title: "Nutrition fundamentals",
    summary: "A balanced approach to macros, hydration, and portion sizes.",
    category: "Nutrition",
  },
  {
    id: "sleep",
    title: "Better sleep tonight",
    summary: "Evidence-based sleep hygiene tips.",
    category: "Wellness",
  },
];

export function HealthEducationLibrary() {
  const [q, setQ] = useState("");
  const filtered = EDUCATION_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q.toLowerCase()) ||
      a.category.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <Input placeholder="Search articles…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">{a.title}</CardTitle>
              </div>
              <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                {a.category}
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{a.summary}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function EducationPage() {
  return (
    <PatientShell title="Health Education" description="Reliable articles curated by your care team.">
      <HealthEducationLibrary />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Medication Reminder View                                           */
/* ------------------------------------------------------------------ */

type Rx = {
  id: string;
  medication_name?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  status?: string | null;
};

export function MedicationReminderView() {
  const fn = useServerFn(listMyPrescriptions);
  const q = useQuery<Rx[]>({
    queryKey: ["patient-rx"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<Rx[]>,
  });
  const rows = (q.data ?? []).filter((r) => (r.status ?? "active") === "active");
  if (rows.length === 0) return <PatientEmpty title="No active medications" />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">{r.medication_name ?? "Medication"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {r.dosage && (
              <div>
                Dose: <span className="font-medium">{r.dosage}</span>
              </div>
            )}
            {r.frequency && (
              <div className="text-muted-foreground">Frequency: {r.frequency}</div>
            )}
            <Badge variant="outline" className="mt-2">
              <BellRing className="h-3 w-3 mr-1" /> Reminder enabled
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Membership Benefits                                                */
/* ------------------------------------------------------------------ */

type Membership = {
  id: string;
  plan_name?: string | null;
  status?: string | null;
  benefits?: string[] | null;
  renews_at?: string | null;
};

export function MembershipBenefitsWorkspace() {
  const fn = useServerFn(listMyMemberships);
  const q = useQuery<Membership[]>({
    queryKey: ["patient-memberships"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<Membership[]>,
  });
  const items = q.data ?? [];
  if (items.length === 0) return <PatientEmpty title="No active membership" hint="Explore membership plans." />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((m) => (
        <Card key={m.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" /> {m.plan_name ?? "Membership"}
              </CardTitle>
              {m.status && <Badge>{m.status}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {m.renews_at && (
              <div className="text-muted-foreground text-xs">Renews {formatDateTime(m.renews_at)}</div>
            )}
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {(m.benefits ?? [
                "Priority appointments",
                "Free teleconsults",
                "Discounts on lab & pharmacy",
              ]).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MembershipBenefitsPage() {
  return (
    <PatientShell title="Membership Benefits" description="Perks included with your plan.">
      <MembershipBenefitsWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallet Timeline / History                                          */
/* ------------------------------------------------------------------ */

type WalletTx = {
  id: string;
  amount: number;
  direction?: string | null;
  reason?: string | null;
  created_at: string;
};

export function WalletTimeline() {
  const walletFn = useServerFn(getMyWallet);
  const txFn = useServerFn(listWalletTransactions);
  const w = useQuery({ queryKey: ["patient-wallet"], queryFn: () => walletFn({ data: {} }) });
  const t = useQuery<WalletTx[]>({
    queryKey: ["patient-wallet-tx"],
    queryFn: () => txFn({ data: {} }) as unknown as Promise<WalletTx[]>,
  });
  const balance = (w.data as { balance?: number } | undefined)?.balance ?? 0;
  const items = (t.data ?? []).map((tx) => ({
    ts: tx.created_at,
    event_type: tx.direction ?? "tx",
    title: `${tx.direction === "credit" ? "+" : "-"}${tx.amount} — ${tx.reason ?? "Transaction"}`,
    body: null,
  }));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <WalletIcon className="h-4 w-4" /> Wallet balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">₹{balance}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelinePanel items={items} emptyMessage="No transactions yet." />
        </CardContent>
      </Card>
    </div>
  );
}

export function WalletHistoryPage() {
  return (
    <PatientShell title="Wallet History" description="All wallet credits and debits.">
      <WalletTimeline />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Reward Redemption                                                  */
/* ------------------------------------------------------------------ */

type Reward = { id: string; name: string; points_cost: number; description?: string | null };

export function RewardRedemptionWorkspace() {
  const qc = useQueryClient();
  const acctFn = useServerFn(getMyLoyaltyAccount);
  const listFn = useServerFn(listAvailableRewards);
  const txFn = useServerFn(listLoyaltyTransactions);
  const redeemFn = useServerFn(redeemReward);
  const acct = useQuery({ queryKey: ["loyalty-acct"], queryFn: () => acctFn({ data: {} }) });
  const rewards = useQuery<Reward[]>({
    queryKey: ["loyalty-rewards"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Reward[]>,
  });
  const tx = useQuery<{ id: string; points: number; reason?: string | null; created_at: string }[]>({
    queryKey: ["loyalty-tx"],
    queryFn: () => txFn({ data: {} }) as unknown as Promise<{ id: string; points: number; reason?: string | null; created_at: string }[]>,
  });
  const redeem = useMutation({
    mutationFn: (id: string) => redeemFn({ data: { rewardId: id } }),
    onSuccess: () => {
      toast.success("Reward redeemed");
      qc.invalidateQueries({ queryKey: ["loyalty-acct"] });
      qc.invalidateQueries({ queryKey: ["loyalty-tx"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const balance = (acct.data as { balance?: number } | undefined)?.balance ?? 0;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gift className="h-4 w-4" /> Loyalty points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">{balance}</div>
          <div className="text-xs text-muted-foreground">Available to redeem</div>
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(rewards.data ?? []).map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{r.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {r.description && (
                <div className="text-xs text-muted-foreground">{r.description}</div>
              )}
              <div className="flex items-center justify-between">
                <Badge variant="outline">{r.points_cost} pts</Badge>
                <Button
                  size="sm"
                  disabled={balance < r.points_cost || redeem.isPending}
                  onClick={() => redeem.mutate(r.id)}
                >
                  Redeem
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Redemption history</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelinePanel
            items={(tx.data ?? []).map((t) => ({
              ts: t.created_at,
              event_type: t.points > 0 ? "earn" : "redeem",
              title: `${t.points > 0 ? "+" : ""}${t.points} pts — ${t.reason ?? "Activity"}`,
            }))}
            emptyMessage="No redemptions yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function RewardRedemptionPage() {
  return (
    <PatientShell title="Reward Redemption" description="Redeem your loyalty points for rewards.">
      <RewardRedemptionWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Notification Center                                                */
/* ------------------------------------------------------------------ */

type NotifRow = {
  id: string;
  title?: string | null;
  body?: string | null;
  channel?: string | null;
  created_at: string;
  read_at?: string | null;
};
type NotifPrefs = {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  whatsapp?: boolean;
};

export function NotificationCenterWorkspace() {
  const qc = useQueryClient();
  const histFn = useServerFn(listNotificationHistory);
  const prefFn = useServerFn(getNotificationPreferences);
  const updFn = useServerFn(updateNotificationPreferences);
  const hist = useQuery<NotifRow[]>({
    queryKey: ["notif-hist"],
    queryFn: () => histFn({ data: {} }) as unknown as Promise<NotifRow[]>,
  });
  const prefs = useQuery<NotifPrefs>({
    queryKey: ["notif-prefs"],
    queryFn: () => prefFn({ data: {} }) as unknown as Promise<NotifPrefs>,
  });
  const upd = useMutation({
    mutationFn: (next: NotifPrefs) => updFn({ data: next }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["notif-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const p = prefs.data ?? {};
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BellRing className="h-4 w-4" /> Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataGrid
            rows={hist.data ?? []}
            getRowId={(r) => r.id}
            isLoading={hist.isLoading}
            emptyMessage="No notifications yet."
            columns={[
              { id: "when", header: "When", cell: (r) => formatDateTime(r.created_at) },
              { id: "title", header: "Title", cell: (r) => r.title ?? "—" },
              { id: "body", header: "Message", cell: (r) => r.body ?? "" },
              {
                id: "channel",
                header: "Channel",
                cell: (r) => <Badge variant="outline">{r.channel ?? "in-app"}</Badge>,
              },
              {
                id: "status",
                header: "Status",
                cell: (r) => (r.read_at ? <Badge variant="outline">Read</Badge> : <Badge>New</Badge>),
              },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(["email", "sms", "push", "whatsapp"] as const).map((ch) => (
            <label key={ch} className="flex items-center justify-between border rounded-md px-3 py-2">
              <span className="capitalize">{ch}</span>
              <input
                type="checkbox"
                checked={!!p[ch]}
                onChange={(e) => upd.mutate({ ...p, [ch]: e.target.checked })}
              />
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function NotificationsCenterPage() {
  return (
    <PatientShell title="Notification Center" description="Your alerts and delivery preferences.">
      <NotificationCenterWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Device Manager                                                     */
/* ------------------------------------------------------------------ */

type Device = {
  id: string;
  device_name?: string | null;
  platform?: string | null;
  last_seen_at?: string | null;
  push_token?: string | null;
};

export function DeviceManagerWorkspace() {
  const qc = useQueryClient();
  // Devices live inside notification prefs / sessions per Stage 2 API; use sessions as trusted device roster.
  const listFn = useServerFn(listPortalSessions);
  const removeFn = useServerFn(removePushToken);
  const registerFn = useServerFn(registerPushToken);
  const q = useQuery<Device[]>({
    queryKey: ["patient-devices"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Device[]>,
  });
  const remove = useMutation({
    mutationFn: (token: string) => removeFn({ data: { token } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["patient-devices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const register = useMutation({
    mutationFn: (token: string) =>
      registerFn({ data: { token, platform: "web" } }),
    onSuccess: () => {
      toast.success("Registered this device");
      qc.invalidateQueries({ queryKey: ["patient-devices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Smartphone className="h-4 w-4" /> Trusted devices
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => register.mutate(`web-${Date.now()}`)}
          disabled={register.isPending}
        >
          Register this device
        </Button>
      </CardHeader>
      <CardContent>
        <DataGrid
          rows={q.data ?? []}
          getRowId={(r) => r.id}
          isLoading={q.isLoading}
          emptyMessage="No devices registered."
          columns={[
            { id: "name", header: "Device", cell: (r) => r.device_name ?? "Unknown" },
            { id: "platform", header: "Platform", cell: (r) => r.platform ?? "—" },
            {
              id: "last",
              header: "Last seen",
              cell: (r) => (r.last_seen_at ? formatDateTime(r.last_seen_at) : "—"),
            },
            {
              id: "actions",
              header: "",
              cell: (r) => (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => r.push_token && remove.mutate(r.push_token)}
                  disabled={remove.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function DeviceManagementPage() {
  return (
    <PatientShell title="Device Management" description="Manage the devices that can receive push alerts.">
      <DeviceManagerWorkspace />
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Security Center                                                    */
/* ------------------------------------------------------------------ */

type Session = {
  id: string;
  device?: string | null;
  ip?: string | null;
  last_active_at?: string | null;
  current?: boolean | null;
};

export function SecurityCenterWorkspace() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPortalSessions);
  const revokeFn = useServerFn(revokePortalSession);
  const q = useQuery<Session[]>({
    queryKey: ["patient-sessions"],
    queryFn: () => listFn({ data: {} }) as unknown as Promise<Session[]>,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { sessionId: id } }),
    onSuccess: () => {
      toast.success("Session revoked");
      qc.invalidateQueries({ queryKey: ["patient-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Active sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGrid
          rows={q.data ?? []}
          getRowId={(r) => r.id}
          isLoading={q.isLoading}
          emptyMessage="No active sessions."
          columns={[
            { id: "device", header: "Device", cell: (r) => r.device ?? "Unknown" },
            { id: "ip", header: "IP", cell: (r) => r.ip ?? "—" },
            {
              id: "last",
              header: "Last active",
              cell: (r) => (r.last_active_at ? formatDateTime(r.last_active_at) : "—"),
            },
            {
              id: "actions",
              header: "",
              cell: (r) =>
                r.current ? (
                  <Badge>Current</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => revoke.mutate(r.id)}
                    disabled={revoke.isPending}
                  >
                    Revoke
                  </Button>
                ),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Emergency Contact                                                  */
/* ------------------------------------------------------------------ */

export function EmergencyContactCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-destructive" /> Emergency contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Add emergency contacts under your profile. In an emergency, our care team can reach them directly.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/patient/profile">Manage contacts</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function SecurityPage() {
  return (
    <PatientShell title="Security Center" description="Sessions, sign-in activity, and emergency contacts.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SecurityCenterWorkspace />
        <div className="space-y-4">
          <EmergencyContactCard />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <QrCode className="h-4 w-4" /> Health passport
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Share your health passport securely with providers via a QR code.
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/patient/passport">Open passport</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PatientShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity Timeline + Patient Journey Timeline                       */
/* ------------------------------------------------------------------ */

type DashData = {
  upcomingAppointments?: { id: string; starts_at: string; reason?: string | null }[];
  recentReports?: { id: string; title?: string | null; created_at: string }[];
  notifications?: { id: string; title?: string | null; created_at: string }[];
  timeline?: {
    ts: string;
    event_type: string;
    title: string;
    body?: string | null;
  }[];
};

export function ActivityTimeline() {
  const fn = useServerFn(getPatientPortalDashboard);
  const q = useQuery<DashData>({
    queryKey: ["patient-dash"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<DashData>,
  });
  const items = q.data?.timeline ?? [];
  return <TimelinePanel items={items} emptyMessage="No recent activity." />;
}

export function PatientJourneyTimeline() {
  const fn = useServerFn(getPatientPortalDashboard);
  const q = useQuery<DashData>({
    queryKey: ["patient-dash"],
    queryFn: () => fn({ data: {} }) as unknown as Promise<DashData>,
  });
  const appts = (q.data?.upcomingAppointments ?? []).map((a) => ({
    ts: a.starts_at,
    event_type: "appointment",
    title: a.reason ?? "Appointment",
  }));
  const reports = (q.data?.recentReports ?? []).map((r) => ({
    ts: r.created_at,
    event_type: "report",
    title: r.title ?? "Report",
  }));
  const items = [...appts, ...reports].sort((a, b) =>
    new Date(b.ts).getTime() - new Date(a.ts).getTime(),
  );
  return <TimelinePanel items={items} emptyMessage="No journey events yet." />;
}
