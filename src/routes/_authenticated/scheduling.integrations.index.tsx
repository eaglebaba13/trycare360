import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay } from "date-fns";
import {
  CalendarCheck2,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  AlertTriangle,
  Video,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import { getIntegrationKpis } from "@/lib/scheduling/integrations-lists.functions";

export const Route = createFileRoute(
  "/_authenticated/scheduling/integrations/",
)({
  component: IntegrationsDashboard,
});

function IntegrationsDashboard() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const range = useMemo(
    () => ({
      from: startOfDay(subDays(date, 6)).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const fn = useServerFn(getIntegrationKpis);
  const q = useQuery({
    queryKey: ["integration-kpis", activeTenantId, range.from],
    queryFn: () =>
      fn({
        data: {
          tenant_id: activeTenantId!,
          from: range.from,
          to: range.to,
        },
      }),
    enabled: !!activeTenantId,
  });
  const k = q.data;

  const TILES = [
    {
      label: "Connected calendars",
      value: k?.connected_calendars ?? 0,
      Icon: CalendarCheck2,
      tone: "text-blue-600",
    },
    {
      label: "Successful syncs (7d)",
      value: k?.successful_syncs ?? 0,
      Icon: CheckCircle2,
      tone: "text-emerald-600",
    },
    {
      label: "Failed syncs (7d)",
      value: k?.failed_syncs ?? 0,
      Icon: XCircle,
      tone: "text-rose-600",
    },
    {
      label: "Reminders sent (7d)",
      value: k?.reminder_success ?? 0,
      Icon: Send,
      tone: "text-emerald-600",
    },
    {
      label: "Reminders failed (7d)",
      value: k?.reminder_failure ?? 0,
      Icon: AlertTriangle,
      tone: "text-rose-600",
    },
    {
      label: "Success rate",
      value: `${k?.reminder_success_rate ?? 0}%`,
      Icon: MessageSquare,
      tone: "text-violet-600",
    },
  ];

  return (
    <SchedulerShell
      title="Integrations & Reminders"
      subtitle="Calendars, reminder automation and video providers."
      date={date}
      onDateChange={setDate}
      quickActions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/integrations/calendar">
              <CalendarCheck2 className="mr-2 h-4 w-4" /> Calendars
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/integrations/reminders">
              <Bell className="mr-2 h-4 w-4" /> Reminders
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/integrations/video">
              <Video className="mr-2 h-4 w-4" /> Video
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TILES.map(({ label, value, Icon, tone }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-muted-foreground">
                  {label}
                </div>
                <Icon className={`h-4 w-4 ${tone}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {q.isLoading ? "…" : value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SchedulerShell>
  );
}
