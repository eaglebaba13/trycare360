/** Patient Portal — Clinical records. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import {
  getMyClinicalSummary,
  listMyPrescriptions,
  listMyTreatmentPlans,
} from "@/lib/patient/records.functions";
import { formatDate, formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Encounter = { id: string; started_at?: string | null; visit_type?: string | null; chief_complaint?: string | null };
type Rx = { id: string; created_at: string; medication_name?: string | null; strength?: string | null; status?: string | null };
type Plan = { id: string; title?: string | null; created_at: string; status?: string | null };
type Summary = { encounters: Encounter[]; prescriptions: Rx[]; treatmentPlans: Plan[] } | undefined;

function useSummary() {
  const fn = useServerFn(getMyClinicalSummary);
  return useQuery({ queryKey: ["patient-clinical-summary"], queryFn: () => fn({ data: {} }) as unknown as Promise<Summary> });
}

export function ClinicalSummary() {
  const q = useSummary();
  const s = q.data;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Encounters</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{s?.encounters.length ?? 0}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Prescriptions</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{s?.prescriptions.length ?? 0}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Plans</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{s?.treatmentPlans.length ?? 0}</CardContent></Card>
    </div>
  );
}

export function EncounterHistory() {
  const q = useSummary();
  return (
    <DataGrid rows={q.data?.encounters ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No encounters."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.started_at ?? "") },
        { id: "type", header: "Type", cell: (r) => r.visit_type ?? "—" },
        { id: "cc", header: "Chief Complaint", cell: (r) => r.chief_complaint ?? "—" },
      ]} />
  );
}

export function PrescriptionHistory() {
  const fn = useServerFn(listMyPrescriptions);
  const q = useQuery<Rx[]>({ queryKey: ["patient-rx"], queryFn: () => fn({ data: {} }) as unknown as Promise<Rx[]> });
  return (
    <DataGrid rows={q.data ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No prescriptions."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDate(r.created_at) },
        { id: "med", header: "Medication", cell: (r) => r.medication_name ?? "—" },
        { id: "st", header: "Strength", cell: (r) => r.strength ?? "—" },
        { id: "status", header: "Status", cell: (r) => r.status ? <Badge variant="outline">{r.status}</Badge> : "—" },
      ]} />
  );
}

export function TreatmentPlanHistory() {
  const fn = useServerFn(listMyTreatmentPlans);
  const q = useQuery<Plan[]>({ queryKey: ["patient-plans"], queryFn: () => fn({ data: {} }) as unknown as Promise<Plan[]> });
  return (
    <DataGrid rows={q.data ?? []} getRowId={(r) => r.id} isLoading={q.isLoading} emptyMessage="No treatment plans."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDate(r.created_at) },
        { id: "title", header: "Plan", cell: (r) => r.title ?? "—" },
        { id: "status", header: "Status", cell: (r) => r.status ? <Badge variant="outline">{r.status}</Badge> : "—" },
      ]} />
  );
}

export function PatientRecordsPage() {
  return (
    <PatientShell title="Clinical Records" description="Encounters, prescriptions and treatment plans.">
      <div className="space-y-4">
        <ClinicalSummary />
        <Card><CardHeader><CardTitle className="text-sm">Encounters</CardTitle></CardHeader><CardContent><EncounterHistory /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Prescriptions</CardTitle></CardHeader><CardContent><PrescriptionHistory /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Treatment Plans</CardTitle></CardHeader><CardContent><TreatmentPlanHistory /></CardContent></Card>
      </div>
    </PatientShell>
  );
}

export function PatientPrescriptionsPage() {
  return (
    <PatientShell title="Prescriptions" description="Your active and past prescriptions.">
      <Card><CardContent className="pt-4"><PrescriptionHistory /></CardContent></Card>
    </PatientShell>
  );
}
