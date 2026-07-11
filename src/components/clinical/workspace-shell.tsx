/**
 * ClinicalWorkspaceShell — the shared three-column shell every
 * Clinical / EMR surface (Doctor, Therapist, encounter view) uses.
 *
 *   Left  — patient identity, alerts, allergies, vitals, problems, history
 *   Center — encounter body (SOAP, diagnosis, treatment, prescription…)
 *   Right — timeline, scheduling, billing, tasks, workflow, AI (placeholder)
 *
 * Data flows exclusively from `useClinicalContext` (Stage 2 loader).
 * Consumers pass the loaded context in and choose which center slot to
 * render — this component owns layout, header, and status bar only.
 */
import { type ReactNode } from "react";
import {
  Loader2,
  Stethoscope,
  Sparkles,
  ListChecks,
  Workflow,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClinicalContextData } from "./use-clinical-context";
import {
  BillingSummaryPanel,
  ClinicalAlertPanel,
  ClinicalTimelinePanel,
  HistoryPanel,
  PanelCard,
  PatientSummaryCard,
  ProblemList,
  SchedulingPanel,
  VitalsPanel,
} from "./panels";

// ---------- ClinicalHeader ------------------------------------------------
export function ClinicalHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-xl lg:text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---------- EncounterStatusBar --------------------------------------------
export function EncounterStatusBar({ ctx }: { ctx: ClinicalContextData }) {
  const enc = ctx.encounter;
  if (!enc) return null;
  return (
    <div className="rounded-md border bg-card/60 px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
      <Badge variant="outline" className="uppercase text-[10px]">
        {enc.status}
      </Badge>
      <span className="text-muted-foreground">
        {enc.encounter_type ?? "encounter"} · started {enc.started_at ?? enc.created_at}
      </span>
      {enc.room && <span className="text-muted-foreground">Room {enc.room}</span>}
      <span className="ml-auto font-mono text-muted-foreground">#{enc.id.slice(0, 8)}</span>
    </div>
  );
}

// ---------- ClinicalActionBar ---------------------------------------------
export function ClinicalActionBar({ children }: { children?: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

// ---------- ClinicalWorkspaceShell ----------------------------------------
export interface ClinicalWorkspaceShellProps {
  ctx: ClinicalContextData | undefined;
  isLoading?: boolean;
  header: ReactNode;
  statusBar?: ReactNode;
  center: ReactNode;
  leftExtras?: ReactNode;
  rightExtras?: ReactNode;
}

export function ClinicalWorkspaceShell({
  ctx,
  isLoading,
  header,
  statusBar,
  center,
  leftExtras,
  rightExtras,
}: ClinicalWorkspaceShellProps) {
  if (isLoading || !ctx) {
    return (
      <PageContainer>
        {header}
        <div className="grid gap-4 lg:grid-cols-[300px_1fr_320px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }
  return (
    <PageContainer>
      {header}
      {statusBar && <div className="mb-3">{statusBar}</div>}
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="space-y-3 min-w-0">
          <PatientSummaryCard ctx={ctx} />
          <ClinicalAlertPanel ctx={ctx} />
          <VitalsPanel ctx={ctx} />
          <ProblemList ctx={ctx} />
          <HistoryPanel ctx={ctx} />
          {leftExtras}
        </aside>
        <section className="space-y-4 min-w-0">{center}</section>
        <aside className="space-y-3 min-w-0">
          <ClinicalTimelinePanel ctx={ctx} />
          <SchedulingPanel ctx={ctx} />
          <BillingSummaryPanel ctx={ctx} />
          <PanelCard icon={<ListChecks className="h-3.5 w-3.5" />} title="Tasks">
            <p className="text-xs text-muted-foreground">
              Wires to Workflow Engine tasks.
            </p>
          </PanelCard>
          <PanelCard icon={<Workflow className="h-3.5 w-3.5" />} title="Workflow">
            <p className="text-xs text-muted-foreground">
              Automation runs are tracked in the Workflow module.
            </p>
          </PanelCard>
          <PanelCard icon={<Sparkles className="h-3.5 w-3.5" />} title="AI Recommendations">
            <p className="text-xs text-muted-foreground">
              AI Clinical Assistant lands in Stage 5 (advisory only).
            </p>
          </PanelCard>
          {rightExtras}
        </aside>
      </div>
    </PageContainer>
  );
}

// ---------- Simple loader spinner ----------------------------------------
export function InlineLoader({ label }: { label?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{label ?? "Loading"}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Working…
      </CardContent>
    </Card>
  );
}

export function ClinicalPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

export function NoPatientSelected({ actions }: { actions?: ReactNode }) {
  return (
    <PageContainer title="Clinical Workspace" description="Select a patient to open the encounter workspace.">
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <div className="text-sm text-muted-foreground">
            Search or pick a patient to load the 360° clinical context.
          </div>
          {actions ?? (
            <Button asChild variant="outline">
              <a href="/clinical/patients">Browse patients</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
