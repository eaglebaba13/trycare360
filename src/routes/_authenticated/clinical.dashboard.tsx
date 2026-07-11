/**
 * Clinical Dashboard — role-adaptive (Doctor vs Therapist).
 *
 * All widgets are read-only summaries backed by placeholder
 * counts until upstream aggregators are wired. Follows the
 * "no independent data loading" rule for clinical data — real
 * patient reads happen once the user opens a patient workspace
 * via ClinicalContextLoader.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Users,
  Activity,
  AlertTriangle,
  Send,
  Stethoscope,
  ClipboardList,
  ListChecks,
} from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid } from "@/components/standards";
import { ClinicalHeader } from "@/components/clinical/workspace-shell";
import { usePermissions } from "@/hooks/use-permissions";
import { ROLES } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/clinical/dashboard")({
  component: ClinicalDashboard,
});

function ClinicalDashboard() {
  const { hasAnyRole } = usePermissions();
  const isTherapistOnly =
    hasAnyRole([ROLES.THERAPIST]) &&
    !hasAnyRole([
      ROLES.DOCTOR,
      ROLES.SUPER_ADMIN,
      ROLES.PLATFORM_ADMIN,
      ROLES.ADMIN,
      ROLES.CORPORATE_ADMIN,
      ROLES.CENTER_MANAGER,
    ]);
  return (
    <PageContainer>
      <ClinicalHeader
        title="Clinical Workspace"
        subtitle={isTherapistOnly ? "Therapist dashboard" : "Doctor dashboard"}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/clinical/patients">
                <Users className="h-4 w-4 mr-1" /> Patients
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/clinical/my-day">
                <CalendarCheck className="h-4 w-4 mr-1" /> My Day
              </Link>
            </Button>
          </>
        }
      />
      {isTherapistOnly ? <TherapistView /> : <DoctorView />}
    </PageContainer>
  );
}

function DoctorView() {
  return (
    <>
      <KpiGrid>
        <KpiCard label="Today's Appointments" value="—" icon={CalendarCheck} hint="Wires to Scheduling" />
        <KpiCard label="Waiting Patients" value="—" icon={Users} hint="Wires to Queue" />
        <KpiCard label="Active Consultations" value="—" icon={Stethoscope} hint="Live encounters" />
        <KpiCard label="Critical Alerts" value="—" icon={AlertTriangle} tone="danger" />
        <KpiCard label="Pending Referrals" value="—" icon={Send} hint="Wires to Referrals" />
        <KpiCard label="Second Opinions" value="—" icon={Activity} hint="Awaiting response" />
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <DashboardSection title="Today's Appointments" note="Reads from the Scheduling engine (no duplicate fetch here)." />
        <DashboardSection title="Active Consultations" note="Encounters with status = active are shown here." />
        <DashboardSection title="Waiting Patients" note="Reads from the Scheduling queue engine." />
        <DashboardSection title="Critical Alerts" note="Aggregated across active patients from ClinicalContext." />
      </div>
    </>
  );
}

function TherapistView() {
  return (
    <>
      <KpiGrid>
        <KpiCard label="Today's Sessions" value="—" icon={CalendarCheck} hint="Wires to Scheduling" />
        <KpiCard label="Treatment Queue" value="—" icon={ListChecks} hint="Assigned to me" />
        <KpiCard label="Assigned Patients" value="—" icon={Users} hint="Active caseload" />
        <KpiCard label="Completed Sessions" value="—" icon={Activity} hint="This week" />
        <KpiCard label="Follow-up Queue" value="—" icon={ClipboardList} hint="Due soon" />
      </KpiGrid>
      <div className="grid gap-4 lg:grid-cols-2 mt-6">
        <DashboardSection title="Today's Sessions" note="Reads from the Scheduling engine." />
        <DashboardSection title="Treatment Queue" note="Reads therapist-assigned encounters." />
        <DashboardSection title="Assigned Patients" note="Persons with an active therapy plan." />
        <DashboardSection title="Follow-up Queue" note="Reads from the Follow-up engine." />
      </div>
    </>
  );
}

function DashboardSection({ title, note }: { title: string; note: string }) {
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
