/**
 * SchedulerShell — reusable layout for every scheduling screen.
 *
 * Provides a consistent structure: title, global date selector, branch
 * selector, resource filter, search, quick actions and a right-side
 * context panel. All future scheduling modules (doctor calendar, room
 * calendar, OT scheduling, diagnostics scheduling, corporate camps) mount
 * inside this shell to keep UX consistent across the domain.
 *
 * NOTE: this component performs NO scheduling logic. It only surfaces
 * controls; child screens call server functions from `@/lib/scheduling/*`.
 */
import { type ReactNode, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTenant } from "@/hooks/use-tenant";
import { listBranches } from "@/lib/scheduling/lists.functions";

export type SchedulerShellProps = {
  title: string;
  subtitle?: string;
  date?: Date;
  onDateChange?: (d: Date) => void;
  branchId?: string | null;
  onBranchChange?: (id: string | null) => void;
  resourceId?: string | null;
  onResourceChange?: (id: string | null) => void;
  resources?: { id: string; name: string; kind?: string }[];
  search?: string;
  onSearchChange?: (v: string) => void;
  quickActions?: ReactNode;
  filters?: ReactNode;
  contextPanel?: ReactNode;
  children: ReactNode;
};

export function useBranches() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(listBranches);
  return useQuery({
    queryKey: ["scheduling-branches", activeTenantId],
    queryFn: () => fn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
    staleTime: 60_000,
  });
}

export function SchedulerShell(props: SchedulerShellProps) {
  const {
    title,
    subtitle,
    date,
    onDateChange,
    branchId,
    onBranchChange,
    resourceId,
    onResourceChange,
    resources = [],
    search,
    onSearchChange,
    quickActions,
    filters,
    contextPanel,
    children,
  } = props;

  const branchesQ = useBranches();
  const branches = branchesQ.data?.rows ?? [];

  const hasContext = !!contextPanel;
  const gridCols = useMemo(
    () => (hasContext ? "lg:grid-cols-[1fr_320px]" : ""),
    [hasContext],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDateChange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && onDateChange(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}
          {onBranchChange && (
            <Select
              value={branchId ?? "__all"}
              onValueChange={(v) => onBranchChange(v === "__all" ? null : v)}
            >
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {onResourceChange && (
            <Select
              value={resourceId ?? "__all"}
              onValueChange={(v) => onResourceChange(v === "__all" ? null : v)}
            >
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="All resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All resources</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                    {r.kind ? ` · ${r.kind}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 w-[220px] pl-8"
              />
            </div>
          )}
          {quickActions}
        </div>
      </div>

      {filters && <div className="flex flex-wrap gap-2">{filters}</div>}

      <div className={cn("grid gap-4", gridCols)}>
        <div className="min-w-0">{children}</div>
        {hasContext && (
          <aside className="rounded-lg border bg-card p-4 h-fit">
            {contextPanel}
          </aside>
        )}
      </div>
    </div>
  );
}
