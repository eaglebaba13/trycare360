import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  UserRound,
  Stethoscope,
  Briefcase,
  Sparkles,
  CopyCheck,
  ShieldAlert,
  FileWarning,
  UserX,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/hooks/use-tenant";
import { getDuplicateDashboard } from "@/lib/identity/dedup.functions";
import { runIdentityHealthCheck } from "@/lib/identity/services.functions";

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeopleDashboard,
});

function PeopleDashboard() {
  const { activeTenantId } = useTenant();
  const dupFn = useServerFn(getDuplicateDashboard);
  const healthFn = useServerFn(runIdentityHealthCheck);

  const dupQ = useQuery({
    queryKey: ["people", "dup-dashboard", activeTenantId],
    queryFn: () => dupFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const healthQ = useQuery({
    queryKey: ["people", "health", activeTenantId],
    queryFn: () => healthFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const h = healthQ.data as
    | {
        totals?: {
          persons?: number;
          patients?: number;
          doctors?: number;
          employees?: number;
          leads?: number;
        };
        quality?: {
          missing_dob?: number;
          missing_phone_and_email?: number;
          missing_consent?: number;
          unverified?: number;
          archived?: number;
        };
      }
    | undefined;

  const totals = h?.totals ?? {};
  const q = h?.quality ?? {};
  const dup = dupQ.data;

  return (
    <PageContainer
      title="People"
      description="Master Person Registry — enterprise identity, roles, verification and deduplication."
      actions={
        <>
          <Button variant="outline" asChild>
            <Link to="/people/import">Import</Link>
          </Button>
          <Button asChild>
            <Link to="/people/new">New person</Link>
          </Button>
        </>
      }
    >
      <KpiGrid>
        <KpiCard label="Total persons" value={totals.persons ?? "—"} icon={Users} />
        <KpiCard label="Patients" value={totals.patients ?? "—"} icon={UserRound} tone="info" />
        <KpiCard label="Doctors" value={totals.doctors ?? "—"} icon={Stethoscope} />
        <KpiCard label="Employees" value={totals.employees ?? "—"} icon={Briefcase} />
        <KpiCard label="Leads" value={totals.leads ?? "—"} icon={Sparkles} />
        <KpiCard
          label="Duplicate queue"
          value={dup?.totalOpen ?? "—"}
          hint={dup ? `${dup.highRisk} high-risk` : undefined}
          icon={CopyCheck}
          tone={dup && dup.highRisk > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Pending verification"
          value={q.unverified ?? "—"}
          icon={ShieldAlert}
          tone="warning"
        />
        <KpiCard
          label="Missing consent"
          value={q.missing_consent ?? "—"}
          icon={FileWarning}
          tone="danger"
        />
        <KpiCard label="No DOB" value={q.missing_dob ?? "—"} icon={UserX} />
        <KpiCard label="No phone/email" value={q.missing_phone_and_email ?? "—"} icon={UserX} />
        <KpiCard label="Archived" value={q.archived ?? "—"} icon={UserX} />
      </KpiGrid>

      <div className="grid gap-4 mt-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Duplicate confidence bands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dup ? (
              <>
                <ConfidenceBar label="Automatic (≥ 0.9)" value={dup.byBand.automatic} total={dup.totalOpen || 1} tone="bg-emerald-500" />
                <ConfidenceBar label="Probable (0.7–0.9)" value={dup.byBand.probable} total={dup.totalOpen || 1} tone="bg-amber-500" />
                <ConfidenceBar label="Fuzzy (0.45–0.7)" value={dup.byBand.fuzzy} total={dup.totalOpen || 1} tone="bg-sky-500" />
                <div className="text-xs text-muted-foreground pt-2">
                  Reviewed last 7 days: <strong>{dup.recentReviewed7d}</strong>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <QuickLink to="/people/list" label="Browse people" />
            <QuickLink to="/people/duplicates" label="Review duplicates" />
            <QuickLink to="/people/verification" label="Verification center" />
            <QuickLink to="/people/relationships" label="Relationship manager" />
            <QuickLink to="/people/tags" label="Manage tags" />
            <QuickLink to="/people/merges" label="Merge history" />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

function ConfidenceBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Button variant="outline" className="justify-start" asChild>
      <Link to={to}>{label}</Link>
    </Button>
  );
}
