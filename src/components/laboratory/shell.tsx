import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, Microscope, FlaskConical, Radiation, ShieldCheck, TimerReset, ClipboardCheck, Send, Building2 } from "lucide-react";

export const LABORATORY_TABS = [
  { to: "/laboratory", label: "Overview", exact: true },
  { to: "/laboratory/orders", label: "Orders" },
  { to: "/laboratory/specimens", label: "Specimens" },
  { to: "/laboratory/accessions", label: "Accessions" },
  { to: "/laboratory/results", label: "Results" },
  { to: "/laboratory/result-review", label: "Result Review" },
  { to: "/laboratory/verification", label: "Verification" },
  { to: "/laboratory/release", label: "Release" },
  { to: "/laboratory/amendments", label: "Amendments" },
  { to: "/laboratory/reporting", label: "Reporting" },
  { to: "/laboratory/qc", label: "Quality Control" },
  { to: "/laboratory/calibration", label: "Calibration" },
  { to: "/laboratory/instruments", label: "Instruments" },
  { to: "/laboratory/microbiology", label: "Microbiology" },
  { to: "/laboratory/microbiology/reporting", label: "Micro Reporting" },
  { to: "/laboratory/pathology", label: "Pathology" },
  { to: "/laboratory/pathology/reporting", label: "Path Reporting" },
  { to: "/laboratory/radiology", label: "Radiology" },
  { to: "/laboratory/radiology/reporting", label: "Rad Reporting" },
  { to: "/laboratory/distribution", label: "Distribution" },
  { to: "/laboratory/distribution-report", label: "Distribution Report" },
  { to: "/laboratory/external", label: "External Labs" },
  { to: "/laboratory/automation", label: "Automation" },
  { to: "/laboratory/analyzers", label: "Analyzers" },
  { to: "/laboratory/instrument-monitor", label: "Instrument Monitor" },
  { to: "/laboratory/integrations", label: "Integrations" },
  { to: "/laboratory/external-labs", label: "External Labs Hub" },
  { to: "/laboratory/ai", label: "AI Assistant" },
];

export function LaboratoryHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Laboratory, Diagnostics &amp; Imaging</h1>
      <p className="text-sm text-muted-foreground">
        Orders, specimens, analyzers, results, QC, microbiology, pathology, radiology and
        distribution — all backed by the Stage 2 engines. UI reads Stage 2 server functions only;
        no client-side lab logic.
      </p>
    </div>
  );
}

export function LaboratorySidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {LABORATORY_TABS.map((t) => {
        const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px",
              active
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const LaboratoryTabs = LaboratorySidebar;

export function LaboratoryFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">{children}</div>;
}

export function LaboratoryActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

export function LaboratoryStatusBar({ status, tone = "info" }: { status: string; tone?: "info" | "success" | "warning" | "danger" }) {
  const toneCls =
    tone === "danger" ? "bg-destructive/10 text-destructive border-destructive/30" :
    tone === "warning" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
    tone === "success" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" :
    "bg-muted text-muted-foreground border-border";
  return <div className={cn("rounded-md border px-3 py-1.5 text-xs font-medium", toneCls)}>{status}</div>;
}

export function LaboratoryNotesPanel({ notes }: { notes?: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Clinical notes</CardTitle></CardHeader>
      <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
        {notes && notes.trim().length > 0 ? notes : <span className="text-xs italic">No notes recorded.</span>}
      </CardContent>
    </Card>
  );
}

export function LaboratoryAuditPanel({ items }: { items: Array<{ at: string; actor?: string | null; event: string; detail?: string | null }> }) {
  return (
    <TimelinePanel
      items={items.map((i) => ({
        ts: i.at,
        event_type: i.event,
        title: i.event,
        body: i.detail ?? (i.actor ? `by ${i.actor}` : null),
      }))}
    />
  );
}

export function LaboratoryTimeline({ items }: { items: Array<{ id?: string; at: string; title: string; description?: string; actor?: string; event?: string }> }) {
  return (
    <TimelinePanel
      items={items.map((i) => ({
        ts: i.at,
        event_type: i.event ?? "event",
        title: i.title,
        body: i.description ?? (i.actor ? `by ${i.actor}` : null),
      }))}
    />
  );
}


export function LaboratoryDashboardCards({
  totalOrders,
  pendingResults,
  releasedResults,
  criticalPending,
  meanTat,
  qcRecent,
}: {
  totalOrders?: number;
  pendingResults?: number;
  releasedResults?: number;
  criticalPending?: number;
  meanTat?: number | null;
  qcRecent?: number;
}) {
  return (
    <KpiGrid>
      <KpiCard label="Orders (window)" value={totalOrders ?? "…"} icon={Beaker} tone="info" />
      <KpiCard label="Pending results" value={pendingResults ?? "…"} icon={ClipboardCheck} tone="warning" />
      <KpiCard label="Released results" value={releasedResults ?? "…"} icon={ShieldCheck} tone="success" />
      <KpiCard label="Critical (unack)" value={criticalPending ?? 0} icon={Radiation} tone="danger" />
      <KpiCard label="Mean TAT (min)" value={meanTat != null ? meanTat.toFixed(0) : "—"} icon={TimerReset} />
      <KpiCard label="QC runs (7d)" value={qcRecent ?? 0} icon={FlaskConical} />
      <KpiCard label="Microbiology open" value="—" icon={Microscope} />
      <KpiCard label="External vendors" value="—" icon={Building2} />
      <KpiCard label="Distribution sent" value="—" icon={Send} />
    </KpiGrid>
  );
}

export function LaboratoryShell({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard
      permissions={["lab:read", "lab:write", "lab:verify", "lab:release", "lab:qc_manage"]}
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You don&apos;t have permission to access the Laboratory workspace.
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <LaboratoryHeader />
        <LaboratorySidebar />
        {children}
      </div>
    </PermissionGuard>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const tone =
    status === "released" ? "default" :
    status === "cancelled" || status === "rejected" ? "destructive" :
    status === "pending" || status === "ordered" ? "secondary" :
    "outline";
  return <Badge variant={tone as never}>{status}</Badge>;
}
