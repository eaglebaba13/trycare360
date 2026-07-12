import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface DoctorPerformanceRow {
  doctor_id: string;
  consultations: number;
  avg_consultation_minutes: number;
  treatment_plans: number;
  followup_compliance: number;
  referral_rate: number;
  soap_completion_rate: number;
  documentation_quality: number;
  patient_satisfaction: number;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function DoctorPerformanceTable({ rows }: { rows: DoctorPerformanceRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Doctor Performance</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doctor</TableHead>
              <TableHead className="text-right">Consultations</TableHead>
              <TableHead className="text-right">Avg (min)</TableHead>
              <TableHead className="text-right">Plans</TableHead>
              <TableHead className="text-right">SOAP %</TableHead>
              <TableHead className="text-right">Doc Quality</TableHead>
              <TableHead className="text-right">Follow-up %</TableHead>
              <TableHead className="text-right">Referral %</TableHead>
              <TableHead className="text-right">Satisfaction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No data in the selected window.</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.doctor_id}>
                <TableCell className="font-mono text-xs">{r.doctor_id.slice(0, 8)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.consultations}</TableCell>
                <TableCell className="text-right tabular-nums">{r.avg_consultation_minutes}</TableCell>
                <TableCell className="text-right tabular-nums">{r.treatment_plans}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(r.soap_completion_rate)}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(r.documentation_quality)}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(r.followup_compliance)}</TableCell>
                <TableCell className="text-right tabular-nums">{pct(r.referral_rate)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.patient_satisfaction ? r.patient_satisfaction.toFixed(2) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
