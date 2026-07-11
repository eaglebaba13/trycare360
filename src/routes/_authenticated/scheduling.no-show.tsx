import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { UserX, CalendarClock, ListPlus, PhoneCall } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import { listRecentNoShows } from "@/lib/scheduling/queue-lists.functions";
import { markNoShow } from "@/lib/scheduling/appointments.functions";

export const Route = createFileRoute("/_authenticated/scheduling/no-show")({
  component: NoShowPage,
});

function NoShowPage() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const qc = useQueryClient();

  const range = useMemo(
    () => ({
      from: startOfDay(subDays(date, 7)).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const listFn = useServerFn(listRecentNoShows);
  const noShowFn = useServerFn(markNoShow);

  const q = useQuery({
    queryKey: ["no-shows", activeTenantId, branchId, range.from, range.to],
    queryFn: () =>
      listFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          from: range.from,
          to: range.to,
        },
      }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];

  const markM = useMutation({
    mutationFn: (id: string) =>
      noShowFn({
        data: {
          tenant_id: activeTenantId!,
          appointment_id: id,
          charge_no_show_fee: false,
        },
      }),
    onSuccess: () => {
      toast.success("Marked as no-show");
      qc.invalidateQueries({ queryKey: ["no-shows"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SchedulerShell
      title="No-show Management"
      subtitle="Follow up, rebook or move to waitlist."
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
      quickActions={
        <Button asChild size="sm" variant="outline">
          <Link to="/scheduling/queue">Live queue</Link>
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-medium">
              No-shows in the last 7 days ({rows.length})
            </div>
          </div>
          {q.isLoading && (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
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
                    <Badge variant="destructive" className="ml-2">
                      <UserX className="mr-1 h-3 w-3" /> No-show
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Scheduled {format(new Date(r.starts_at), "PPp")}
                    {r.no_show_at &&
                      ` · marked ${format(new Date(r.no_show_at), "PPp")}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/scheduling/appointments/$appointmentId"
                      params={{ appointmentId: r.id }}
                    >
                      <CalendarClock className="mr-1 h-4 w-4" /> Rebook
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" disabled title="Auto follow-up runs via Automation Engine">
                    <PhoneCall className="mr-1 h-4 w-4" /> Follow-up
                  </Button>
                  <Button size="sm" variant="ghost" disabled title="Waitlist conversion runs via Booking Coordinator">
                    <ListPlus className="mr-1 h-4 w-4" /> Waitlist
                  </Button>
                </div>
              </li>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground text-center">
                No no-shows in this window — great work!
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
      <div className="mt-3 text-xs text-muted-foreground">
        Tip: mark a no-show from an appointment workspace to trigger
        automation-driven follow-up.
        <span className="ml-1 opacity-50">
          {markM.isPending && "Working…"}
        </span>
      </div>
    </SchedulerShell>
  );
}
