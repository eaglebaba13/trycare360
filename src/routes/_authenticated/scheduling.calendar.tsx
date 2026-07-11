import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addDays,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  listAppointments,
  listResources,
} from "@/lib/scheduling/lists.functions";

export const Route = createFileRoute("/_authenticated/scheduling/calendar")({
  component: CalendarPage,
});

type View = "day" | "week" | "month" | "timeline" | "agenda";

function CalendarPage() {
  const { activeTenantId } = useTenant();
  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);

  const range = useMemo(() => {
    switch (view) {
      case "day":
      case "timeline":
      case "agenda":
        return { from: startOfDay(date), to: endOfDay(date) };
      case "week":
        return { from: startOfWeek(date), to: endOfWeek(date) };
      case "month":
        return { from: startOfMonth(date), to: endOfMonth(date) };
    }
  }, [view, date]);

  const listFn = useServerFn(listAppointments);
  const listQ = useQuery({
    queryKey: [
      "cal-list",
      activeTenantId,
      branchId,
      resourceId,
      range.from.toISOString(),
      range.to.toISOString(),
    ],
    queryFn: () =>
      listFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          resource_id: resourceId,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          limit: 500,
        },
      }),
    enabled: !!activeTenantId,
  });

  const resFn = useServerFn(listResources);
  const resourcesQ = useQuery({
    queryKey: ["cal-resources", activeTenantId, branchId],
    queryFn: () =>
      resFn({
        data: { tenant_id: activeTenantId!, branch_id: branchId!, include_shared: true },
      }),
    enabled: !!activeTenantId && !!branchId,
  });

  const rows = listQ.data?.rows ?? [];

  return (
    <SchedulerShell
      title="Enterprise Calendar"
      subtitle="Day · Week · Month · Timeline · Agenda"
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
      resourceId={resourceId}
      onResourceChange={setResourceId}
      resources={(resourcesQ.data?.rows ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        kind: r.resource_kind,
      }))}
      quickActions={
        <Button asChild size="sm">
          <Link to="/scheduling/new">
            <Plus className="mr-2 h-4 w-4" />
            New
          </Link>
        </Button>
      }
      filters={
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {view === "day" && <DayView date={date} rows={rows} />}
      {view === "week" && <WeekView date={date} rows={rows} />}
      {view === "month" && <MonthView date={date} rows={rows} />}
      {view === "timeline" && (
        <TimelineView
          date={date}
          rows={rows}
          resources={resourcesQ.data?.rows ?? []}
        />
      )}
      {view === "agenda" && <AgendaView rows={rows} />}
    </SchedulerShell>
  );
}

type Row = {
  id: string;
  starts_at: string;
  ends_at: string;
  status_code: string;
  duration_minutes: number;
  appointment_code: string;
  doctor_id: string | null;
  room_resource_id: string | null;
  primary_resource_id: string | null;
};

function slotColor(status: string) {
  if (status === "cancelled" || status === "no_show")
    return "bg-destructive/10 border-destructive/30 text-destructive";
  if (status === "completed")
    return "bg-emerald-500/10 border-emerald-500/30 text-emerald-700";
  if (status === "in_progress")
    return "bg-blue-500/10 border-blue-500/30 text-blue-700";
  return "bg-primary/10 border-primary/30";
}

function DayView({ date, rows }: { date: Date; rows: Row[] }) {
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: endOfDay(date),
  });
  const byHour = new Map<number, Row[]>();
  for (const r of rows) {
    const h = new Date(r.starts_at).getHours();
    if (!byHour.has(h)) byHour.set(h, []);
    byHour.get(h)!.push(r);
  }
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {hours.map((h) => (
            <li key={h.toISOString()} className="grid grid-cols-[80px_1fr] p-2">
              <div className="text-xs text-muted-foreground pt-1">
                {format(h, "h a")}
              </div>
              <div className="space-y-1">
                {(byHour.get(h.getHours()) ?? []).map((r) => (
                  <AppointmentChip key={r.id} r={r} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function WeekView({ date, rows }: { date: Date; rows: Row[] }) {
  const days = eachDayOfInterval({
    start: startOfWeek(date),
    end: endOfWeek(date),
  });
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const items = rows.filter((r) => isSameDay(new Date(r.starts_at), d));
        return (
          <Card key={d.toISOString()}>
            <CardContent className="p-2 space-y-1">
              <div className="text-xs font-medium">{format(d, "EEE d")}</div>
              {items.length === 0 && (
                <div className="text-xs text-muted-foreground">—</div>
              )}
              {items.map((r) => (
                <AppointmentChip key={r.id} r={r} compact />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MonthView({ date, rows }: { date: Date; rows: Row[] }) {
  const start = startOfWeek(startOfMonth(date));
  const end = endOfWeek(endOfMonth(date));
  const days = eachDayOfInterval({ start, end });
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const items = rows.filter((r) => isSameDay(new Date(r.starts_at), d));
        const inMonth = d.getMonth() === date.getMonth();
        return (
          <div
            key={d.toISOString()}
            className={`min-h-24 border rounded p-1 ${
              inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground"
            }`}
          >
            <div className="text-xs font-medium">{format(d, "d")}</div>
            <div className="mt-1 space-y-0.5">
              {items.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className={`truncate text-[10px] rounded px-1 border ${slotColor(r.status_code)}`}
                >
                  {format(new Date(r.starts_at), "p")}
                </div>
              ))}
              {items.length > 3 && (
                <div className="text-[10px] text-muted-foreground">
                  +{items.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineView({
  date,
  rows,
  resources,
}: {
  date: Date;
  rows: Row[];
  resources: { id: string; name: string; resource_kind: string }[];
}) {
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: endOfDay(date),
  });
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        <div
          className="grid text-xs text-muted-foreground border-b"
          style={{
            gridTemplateColumns: `180px repeat(${hours.length}, minmax(50px, 1fr))`,
          }}
        >
          <div className="p-2">Resource</div>
          {hours.map((h) => (
            <div key={h.toISOString()} className="p-2 border-l">
              {format(h, "H")}
            </div>
          ))}
        </div>
        {resources.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">
            Select a branch to load resources.
          </div>
        )}
        {resources.map((res) => {
          const items = rows.filter(
            (r) =>
              r.doctor_id === res.id ||
              r.room_resource_id === res.id ||
              r.primary_resource_id === res.id,
          );
          return (
            <div
              key={res.id}
              className="grid border-b"
              style={{
                gridTemplateColumns: `180px repeat(${hours.length}, minmax(50px, 1fr))`,
              }}
            >
              <div className="p-2 text-sm">
                <div className="font-medium truncate">{res.name}</div>
                <div className="text-xs text-muted-foreground">
                  {res.resource_kind}
                </div>
              </div>
              <div
                className="relative col-span-full h-12"
                style={{
                  gridColumn: `2 / span ${hours.length}`,
                }}
              >
                {items.map((r) => {
                  const startH =
                    new Date(r.starts_at).getHours() +
                    new Date(r.starts_at).getMinutes() / 60;
                  const dur = r.duration_minutes / 60;
                  const left = (startH / 24) * 100;
                  const width = (dur / 24) * 100;
                  return (
                    <Link
                      key={r.id}
                      to="/scheduling/appointments/$appointmentId"
                      params={{ appointmentId: r.id }}
                      className={`absolute top-1 h-10 rounded border px-1 text-[10px] overflow-hidden ${slotColor(r.status_code)}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      {r.appointment_code}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgendaView({ rows }: { rows: Row[] }) {
  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          No appointments.
        </CardContent>
      </Card>
    );
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{r.appointment_code}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(r.starts_at), "PPp")} · {r.duration_minutes}m
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.status_code}</Badge>
                <Button asChild size="sm" variant="ghost">
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
  );
}

function AppointmentChip({ r, compact }: { r: Row; compact?: boolean }) {
  return (
    <Link
      to="/scheduling/appointments/$appointmentId"
      params={{ appointmentId: r.id }}
      className={`block rounded border px-2 py-1 text-xs ${slotColor(r.status_code)} ${compact ? "truncate" : ""}`}
    >
      <div className="font-medium truncate">{r.appointment_code}</div>
      <div className="opacity-70">
        {format(new Date(r.starts_at), "p")} · {r.duration_minutes}m
      </div>
    </Link>
  );
}
// keep unused helper imports referenced
void addDays;
