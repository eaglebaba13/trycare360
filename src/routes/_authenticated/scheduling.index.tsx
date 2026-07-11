import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Calendar as CalIcon,
  Clock,
  UserCheck,
  Stethoscope,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  UserX,
  Plus,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  getAppointmentKpis,
  listAppointments,
} from "@/lib/scheduling/lists.functions";

export const Route = createFileRoute("/_authenticated/scheduling/")({
  component: SchedulingDashboard,
});

const KPI_TILES = [
  { key: "today", label: "Today", icon: CalIcon, tone: "" },
  { key: "upcoming", label: "Upcoming", icon: Clock, tone: "text-blue-600" },
  { key: "waiting", label: "Waiting", icon: UserCheck, tone: "text-amber-600" },
  {
    key: "in_consultation",
    label: "In Consultation",
    icon: Stethoscope,
    tone: "text-emerald-600",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    tone: "text-emerald-700",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    icon: XCircle,
    tone: "text-destructive",
  },
  {
    key: "rescheduled",
    label: "Rescheduled",
    icon: RefreshCcw,
    tone: "text-violet-600",
  },
  { key: "no_show", label: "No-show", icon: UserX, tone: "text-rose-600" },
] as const;

function SchedulingDashboard() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);

  const range = useMemo(
    () => ({
      from: startOfDay(date).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const kpiFn = useServerFn(getAppointmentKpis);
  const kpiQ = useQuery({
    queryKey: ["scheduling-kpis", activeTenantId, branchId, range.from],
    queryFn: () =>
      kpiFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          day_start: range.from,
          day_end: range.to,
        },
      }),
    enabled: !!activeTenantId,
  });

  const listFn = useServerFn(listAppointments);
  const listQ = useQuery({
    queryKey: ["scheduling-today", activeTenantId, branchId, range.from],
    queryFn: () =>
      listFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          from: range.from,
          to: range.to,
          limit: 100,
        },
      }),
    enabled: !!activeTenantId,
  });
  const rows = listQ.data?.rows ?? [];
  const counts = kpiQ.data;

  return (
    <SchedulerShell
      title="Appointment Dashboard"
      subtitle="Today's operational view across your scheduling network."
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
      quickActions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/calendar">
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendar
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/scheduling/new">
              <Plus className="mr-2 h-4 w-4" />
              New appointment
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {KPI_TILES.map(({ key, label, icon: Icon, tone }) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-muted-foreground">
                  {label}
                </div>
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {kpiQ.isLoading
                  ? "…"
                  : counts
                    ? (counts as Record<string, number>)[key] ?? 0
                    : 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 text-sm font-medium">
              Appointments on {format(date, "PPP")}
            </div>
            {listQ.isLoading && (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            )}
            {!listQ.isLoading && rows.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No appointments in this window.
              </div>
            )}
            <ul className="divide-y">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.appointment_code}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.starts_at), "p")} ·{" "}
                      {r.duration_minutes}m · {r.delivery_mode}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.status_code}</Badge>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                    >
                      <Link
                        to="/scheduling/appointments/$appointmentId"
                        params={{ appointmentId: r.id }}
                      >
                        Open
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </SchedulerShell>
  );
}
