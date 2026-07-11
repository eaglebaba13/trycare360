/**
 * Clinical Workspace — shared read-only panels.
 * Every panel is a pure presentational component that renders a slice
 * of the ClinicalContext returned by `useClinicalContext`. No panel
 * fetches data on its own.
 */
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Activity,
  Heart,
  ClipboardList,
  Users,
  Cigarette,
  Stethoscope,
  Send,
  Wallet,
  CalendarClock,
  History,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, initials } from "@/lib/standards-format";
import type { ClinicalContextData } from "./use-clinical-context";

type Ctx = ClinicalContextData;

// ---------- PatientSummaryCard --------------------------------------------
export function PatientSummaryCard({ ctx }: { ctx: Ctx }) {
  const p = ctx.person;
  const pt = ctx.patient;
  if (!p) return <EmptyCard title="Patient" note="No patient record." />;
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex items-start gap-3">
        <Avatar className="h-12 w-12">
          {p.photo_url && <AvatarImage src={p.photo_url} alt={p.full_name} />}
          <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/patients/$personId"
              params={{ personId: p.id }}
              className="font-display font-semibold truncate hover:underline"
            >
              {p.full_name}
            </Link>
            {p.vip_flag && <Badge className="bg-amber-500 hover:bg-amber-500">VIP</Badge>}
            {p.verification_status === "verified" && (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {pt?.mrn && <span className="font-mono">MRN {pt.mrn}</span>}
            <span className="font-mono opacity-70">#{p.id.slice(0, 8)}</span>
            <span>{p.gender ?? "—"}</span>
            {pt?.blood_group && <span>Blood {pt.blood_group}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- ClinicalAlertPanel --------------------------------------------
export function ClinicalAlertPanel({ ctx }: { ctx: Ctx }) {
  const alerts = ctx.allergies.filter((a) => a.status === "active");
  const critical = alerts.filter((a) =>
    ["severe", "life-threatening", "high"].includes((a.severity ?? "").toLowerCase()),
  );
  return (
    <PanelCard icon={<AlertTriangle className="h-3.5 w-3.5" />} title={`Alerts (${alerts.length})`}>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active clinical alerts.</p>
      ) : (
        <ul className="space-y-1.5">
          {alerts.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-start gap-2">
              <AlertTriangle
                className={
                  critical.includes(a) ? "h-3.5 w-3.5 text-rose-500 mt-0.5" : "h-3.5 w-3.5 text-amber-500 mt-0.5"
                }
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{a.substance}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.severity ?? "unknown"} · {a.reaction ?? "—"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

// ---------- ProblemList ---------------------------------------------------
export function ProblemList({ ctx }: { ctx: Ctx }) {
  return (
    <PanelCard icon={<ClipboardList className="h-3.5 w-3.5" />} title={`Problems (${ctx.problems.length})`}>
      {ctx.problems.length === 0 ? (
        <p className="text-xs text-muted-foreground">No active problems.</p>
      ) : (
        <ul className="space-y-1.5">
          {ctx.problems.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm truncate">{p.display}</div>
                <div className="text-[11px] text-muted-foreground">
                  {p.severity ?? "—"} · onset {p.onset_date ? formatDate(p.onset_date) : "unknown"}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                {p.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

// ---------- VitalsPanel ---------------------------------------------------
export function VitalsPanel({ ctx }: { ctx: Ctx }) {
  const latest = ctx.vitals[0] ?? null;
  return (
    <PanelCard icon={<Heart className="h-3.5 w-3.5" />} title="Vitals">
      {!latest ? (
        <p className="text-xs text-muted-foreground">No vitals recorded.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <Kv k="BP" v={latest.bp_systolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : "—"} />
          <Kv k="Pulse" v={latest.heart_rate ?? "—"} />
          <Kv k="Temp" v={latest.temperature_c ? `${latest.temperature_c}°C` : "—"} />
          <Kv k="SpO₂" v={latest.spo2 ? `${latest.spo2}%` : "—"} />
          <Kv k="Weight" v={latest.weight_kg ? `${latest.weight_kg} kg` : "—"} />
          <Kv k="BMI" v={latest.bmi ?? "—"} />
          <div className="col-span-2 text-[10px] text-muted-foreground pt-1 border-t">
            {latest.measured_at ? formatDate(latest.measured_at) : "—"}
          </div>
        </div>
      )}
    </PanelCard>
  );
}

// ---------- HistoryPanel --------------------------------------------------
export function HistoryPanel({ ctx }: { ctx: Ctx }) {
  return (
    <PanelCard icon={<History className="h-3.5 w-3.5" />} title="History">
      <div className="space-y-3">
        <MiniList
          label="Medical"
          items={ctx.medicalHistory.slice(0, 3).map((m) => ({ id: m.id, text: m.summary }))}
          icon={<Activity className="h-3 w-3" />}
        />
        <MiniList
          label="Family"
          items={ctx.familyHistory.slice(0, 3).map((f) => ({
            id: f.id,
            text: `${f.condition_display} (${f.relation})`,
          }))}
          icon={<Users className="h-3 w-3" />}
        />
        {ctx.lifestyleHistory && (
          <div className="text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider mb-1">
              <Cigarette className="h-3 w-3" /> Lifestyle
            </div>
            <div className="text-xs">{ctx.lifestyleHistory.occupation ?? "—"}</div>
          </div>
        )}
      </div>
    </PanelCard>
  );
}

// ---------- ReferralPanel -------------------------------------------------
export function ReferralPanel({ ctx, referrals }: { ctx: Ctx; referrals?: number }) {
  const n = referrals ?? 0;
  void ctx;
  return (
    <PanelCard icon={<Send className="h-3.5 w-3.5" />} title={`Referrals (${n})`}>
      <p className="text-xs text-muted-foreground">
        Referral history is managed via the Clinical action bar and the Referrals workspace.
      </p>
    </PanelCard>
  );
}

// ---------- SecondOpinionPanel --------------------------------------------
export function SecondOpinionPanel({ ctx }: { ctx: Ctx }) {
  void ctx;
  return (
    <PanelCard icon={<Stethoscope className="h-3.5 w-3.5" />} title="Second Opinions">
      <p className="text-xs text-muted-foreground">
        Request and review second opinions from the Second Opinions workspace.
      </p>
    </PanelCard>
  );
}

// ---------- BillingSummaryPanel -------------------------------------------
export function BillingSummaryPanel({ ctx }: { ctx: Ctx }) {
  return (
    <PanelCard icon={<Wallet className="h-3.5 w-3.5" />} title="Billing">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Kv k="Total" v={`₹${(ctx.billingSummary.total ?? 0).toLocaleString()}`} />
        <Kv k="Recent" v={ctx.billingSummary.recent.length} />
      </div>
    </PanelCard>
  );
}

// ---------- SchedulingPanel -----------------------------------------------
export function SchedulingPanel({ ctx }: { ctx: Ctx }) {
  const items = ctx.scheduling.upcoming;
  return (
    <PanelCard icon={<CalendarClock className="h-3.5 w-3.5" />} title={`Upcoming (${items.length})`}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upcoming appointments.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 4).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{formatDate(a.starts_at)}</span>
              <Badge variant="outline" className="text-[10px]">
                {a.status_code}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}

// ---------- ClinicalTimelinePanel (previous consultations) ----------------
export function ClinicalTimelinePanel({ ctx }: { ctx: Ctx }) {
  const items = ctx.previousConsultations;
  return (
    <PanelCard icon={<History className="h-3.5 w-3.5" />} title={`Timeline (${items.length})`}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No prior encounters.</p>
      ) : (
        <ol className="space-y-2 border-l border-border pl-3">
          {items.slice(0, 6).map((e) => (
            <li key={e.id} className="relative">
              <div className="absolute -left-[15px] top-1 h-2 w-2 rounded-full bg-primary" />
              <div className="text-xs font-medium">{e.encounter_type ?? "Encounter"}</div>
              <div className="text-[11px] text-muted-foreground">
                {formatDate(e.started_at ?? e.created_at)} · {e.status}
              </div>
            </li>
          ))}
        </ol>
      )}
    </PanelCard>
  );
}

// ---------- Building blocks ------------------------------------------------

export function PanelCard({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">{children}</CardContent>
    </Card>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium truncate">{v}</span>
    </div>
  );
}

function MiniList({
  label,
  items,
  icon,
}: {
  label: string;
  items: { id: string; text: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((i) => (
            <li key={i.id} className="text-xs truncate">
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyCard({ title, note }: { title: string; note: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
