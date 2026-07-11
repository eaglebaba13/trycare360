/**
 * Scheduling Reports — Daily / Weekly / Monthly / Branch / Franchise /
 * Doctor / Service grouping. CSV export in-page; PDF / Excel / Scheduled
 * delivery are handled by the Data Foundation Reports module (see
 * `src/lib/api/data.functions.ts` — `upsertReport`, `queueReportRun`,
 * `upsertReportSchedule`). No duplicate reporting engine here.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subDays, startOfWeek, startOfMonth } from "date-fns";
import { useTenant } from "@/hooks/use-tenant";
import { getSchedulingReport } from "@/lib/scheduling/analytics.functions";
import { SchedulingAnalyticsBar } from "@/components/scheduling/analytics-bar";
import { useSchedulingWindow } from "@/components/scheduling/analytics-window";

export const Route = createFileRoute("/_authenticated/scheduling/analytics/reports")({
  component: ReportsTab,
});

type GroupBy = "day" | "branch" | "doctor" | "service" | "franchise";
type Preset = "daily" | "weekly" | "monthly" | "custom";

function ReportsTab() {
  const { activeTenantId } = useTenant();
  const [win, patch, fromDate, setFrom, toDate, setTo] = useSchedulingWindow();
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [preset, setPreset] = useState<Preset>("custom");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const now = new Date();
    if (p === "daily") { setFrom(now); setTo(now); }
    else if (p === "weekly") { setFrom(startOfWeek(now)); setTo(now); }
    else if (p === "monthly") { setFrom(startOfMonth(now)); setTo(now); }
    else { setFrom(subDays(now, 30)); setTo(now); }
  };

  const fn = useServerFn(getSchedulingReport);
  const q = useQuery({
    queryKey: ["sched-report", activeTenantId, win.from, win.to, win.branch_id, groupBy],
    queryFn: () => fn({ data: { tenant_id: activeTenantId!, branch_id: win.branch_id ?? undefined, from: win.from, to: win.to, group_by: groupBy } }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["daily", "weekly", "monthly", "custom"] as Preset[]).map((p) => (
          <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} onClick={() => applyPreset(p)} className="capitalize">
            {p}
          </Button>
        ))}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-muted-foreground">Group by</span>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="branch">Branch</SelectItem>
              <SelectItem value="franchise">Franchise</SelectItem>
              <SelectItem value="doctor">Doctor</SelectItem>
              <SelectItem value="service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <SchedulingAnalyticsBar fromDate={fromDate} toDate={toDate} branchId={win.branch_id} onFromChange={setFrom} onToChange={setTo} onBranchChange={(id) => patch({ branch_id: id })} exportRows={rows as unknown as Record<string, unknown>[]} exportName={`scheduling-report-${groupBy}`} />

      <Card>
        <CardHeader><CardTitle className="capitalize">Scheduling Report — by {groupBy}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="capitalize">{groupBy}</TableHead>
              <TableHead>Total</TableHead><TableHead>Completed</TableHead>
              <TableHead>Cancelled</TableHead><TableHead>No-show</TableHead><TableHead>Minutes</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-mono text-xs">{r.key}</TableCell>
                  <TableCell>{r.total}</TableCell>
                  <TableCell>{r.completed}</TableCell>
                  <TableCell>{r.cancelled}</TableCell>
                  <TableCell>{r.no_show}</TableCell>
                  <TableCell>{r.minutes}</TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No data for the selected window.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>PDF / Excel exports & scheduled delivery</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Rendered PDF / Excel exports and scheduled email delivery are handled by the shared Reports module in Data Foundation.
            Register a scheduling report definition once, then schedule any format from there — no duplicate engine.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/data">Open Data Foundation</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
