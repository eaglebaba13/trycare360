/**
 * ClinicalReportsPanel — presets + group-by + CSV export.
 * PDF / Excel / scheduled delivery are handled by the Data Foundation
 * Reports module (`/data/reports`); no duplicate reporting engine here.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/analytics/csv";

export type ClinicalReportGroupBy =
  | "day" | "week" | "month"
  | "doctor" | "branch" | "service" | "diagnosis" | "treatment" | "outcome";

export type ClinicalReportPreset = "daily" | "weekly" | "monthly" | "custom";

export interface ClinicalReportRow {
  group: string;
  encounters: number;
  completed: number;
  open: number;
  avg_minutes: number;
}

export function ClinicalReportsPanel({
  preset, onPreset,
  groupBy, onGroupBy,
  rows,
  totals,
}: {
  preset: ClinicalReportPreset;
  onPreset: (p: ClinicalReportPreset) => void;
  groupBy: ClinicalReportGroupBy;
  onGroupBy: (g: ClinicalReportGroupBy) => void;
  rows: ClinicalReportRow[];
  totals: { encounters: number; plans: number; prescriptions: number };
}) {
  const presets: ClinicalReportPreset[] = ["daily", "weekly", "monthly", "custom"];
  const groups: ClinicalReportGroupBy[] = ["day", "week", "month", "doctor", "branch", "service", "diagnosis", "treatment", "outcome"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex gap-2">
          {presets.map((p) => (
            <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => onPreset(p)} className="capitalize">
              {p}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Group by</label>
          <Select value={groupBy} onValueChange={(v) => onGroupBy(v as ClinicalReportGroupBy)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {groups.map((g) => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => downloadCsv(`clinical-report-${groupBy}`, rows as unknown as Record<string, unknown>[])}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="Encounters" value={totals.encounters} />
        <StatCard label="Treatment Plans" value={totals.plans} />
        <StatCard label="Prescriptions" value={totals.prescriptions} />
      </div>

      <Card>
        <CardHeader><CardTitle className="capitalize">By {groupBy}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="capitalize">{groupBy}</TableHead>
                <TableHead className="text-right">Encounters</TableHead>
                <TableHead className="text-right">Completed</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Avg (min)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data in the selected window.</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.group}>
                  <TableCell className="font-mono text-xs">{r.group}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.encounters}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.open}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avg_minutes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        For PDF, Excel, or scheduled delivery, use the Data Foundation Reports module —
        no duplicate reporting engine here. Formulas live in <code>src/lib/analytics/kpi-definitions.md</code>.
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
