/** Patient Portal — Lab / Radiology / Pathology reports. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import {
  listMyLabReports,
  listMyPathologyReports,
  listMyRadiologyReports,
} from "@/lib/patient/records.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Report = { id: string; title?: string | null; test_name?: string | null; reported_at?: string | null; status?: string | null; created_at?: string };

function ReportsGrid({ items, isLoading }: { items: Report[]; isLoading: boolean }) {
  return (
    <DataGrid rows={items} getRowId={(r) => r.id} isLoading={isLoading} emptyMessage="No reports."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.reported_at ?? r.created_at ?? "") },
        { id: "name", header: "Report", cell: (r) => r.title ?? r.test_name ?? "—" },
        { id: "status", header: "Status", cell: (r) => r.status ? <Badge variant="outline">{r.status}</Badge> : "—" },
      ]} />
  );
}

export function LabReportsGrid() {
  const fn = useServerFn(listMyLabReports);
  const q = useQuery<Report[]>({ queryKey: ["patient-lab"], queryFn: () => fn({ data: {} }) as unknown as Promise<Report[]> });
  return <ReportsGrid items={q.data ?? []} isLoading={q.isLoading} />;
}
export function RadiologyReportsGrid() {
  const fn = useServerFn(listMyRadiologyReports);
  const q = useQuery<Report[]>({ queryKey: ["patient-radiology"], queryFn: () => fn({ data: {} }) as unknown as Promise<Report[]> });
  return <ReportsGrid items={q.data ?? []} isLoading={q.isLoading} />;
}
export function PathologyReportsGrid() {
  const fn = useServerFn(listMyPathologyReports);
  const q = useQuery<Report[]>({ queryKey: ["patient-pathology"], queryFn: () => fn({ data: {} }) as unknown as Promise<Report[]> });
  return <ReportsGrid items={q.data ?? []} isLoading={q.isLoading} />;
}

export function PatientLabPage() {
  return <PatientShell title="Lab Reports" description="Laboratory results and history.">
    <Card><CardContent className="pt-4"><LabReportsGrid /></CardContent></Card>
  </PatientShell>;
}
export function PatientRadiologyPage() {
  return <PatientShell title="Radiology" description="Imaging reports.">
    <Card><CardContent className="pt-4"><RadiologyReportsGrid /></CardContent></Card>
  </PatientShell>;
}
export function PatientPathologyPage() {
  return <PatientShell title="Pathology" description="Pathology reports.">
    <Card><CardContent className="pt-4"><PathologyReportsGrid /></CardContent></Card>
  </PatientShell>;
}
