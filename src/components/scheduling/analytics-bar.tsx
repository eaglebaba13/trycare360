/**
 * Reusable filter bar for scheduling analytics tabs.
 * From/To date range + branch selector + CSV export.
 */
import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/hooks/use-tenant";
import { listBranches } from "@/lib/scheduling/lists.functions";
import { downloadCsv } from "@/lib/analytics/csv";

export type AnalyticsWindowProps = {
  fromDate: Date;
  toDate: Date;
  branchId: string | null;
  onFromChange: (d: Date) => void;
  onToChange: (d: Date) => void;
  onBranchChange: (id: string | null) => void;
  exportRows?: Record<string, unknown>[];
  exportName?: string;
};

export function SchedulingAnalyticsBar(props: AnalyticsWindowProps) {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(listBranches);
  const branchesQ = useQuery({
    queryKey: ["scheduling-branches", activeTenantId],
    queryFn: () => fn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
    staleTime: 60_000,
  });
  const branches = branchesQ.data?.rows ?? [];

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3">
      <DatePicker label="From" value={props.fromDate} onChange={props.onFromChange} />
      <DatePicker label="To" value={props.toDate} onChange={props.onToChange} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Branch</label>
        <Select value={props.branchId ?? "__all"} onValueChange={(v) => props.onBranchChange(v === "__all" ? null : v)}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue placeholder="All branches" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All branches</SelectItem>
            {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1" />
      {props.exportRows && props.exportRows.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => downloadCsv(props.exportName ?? "scheduling-analytics", props.exportRows!)}>
          <Download className="h-4 w-4 mr-1" /> CSV
        </Button>
      )}
    </div>
  );
}

function DatePicker({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-[160px] justify-start font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(value, "PP")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(d) => d && onChange(d)} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );
}
