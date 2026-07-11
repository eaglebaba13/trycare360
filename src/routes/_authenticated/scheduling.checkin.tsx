import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay, endOfDay, format } from "date-fns";
import { UserCheck, Ticket, Printer, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  listQueues,
  listExpectedArrivals,
} from "@/lib/scheduling/queue-lists.functions";
import { issueQueueToken } from "@/lib/scheduling/queue.functions";
import { checkInAppointment } from "@/lib/scheduling/appointments.functions";

export const Route = createFileRoute("/_authenticated/scheduling/checkin")({
  component: CheckInPage,
});

function CheckInPage() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const qc = useQueryClient();

  const range = useMemo(
    () => ({
      from: startOfDay(date).toISOString(),
      to: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const arrivalsFn = useServerFn(listExpectedArrivals);
  const queuesFn = useServerFn(listQueues);
  const checkinFn = useServerFn(checkInAppointment);
  const issueFn = useServerFn(issueQueueToken);

  const arrivalsQ = useQuery({
    queryKey: ["checkin-arrivals", activeTenantId, branchId, range.from],
    queryFn: () =>
      arrivalsFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          window_start: range.from,
          window_end: range.to,
        },
      }),
    enabled: !!activeTenantId,
    refetchInterval: 20_000,
  });
  const arrivals = arrivalsQ.data?.rows ?? [];
  const selected = arrivals.find((a) => a.id === selectedId) ?? null;

  const queuesQ = useQuery({
    queryKey: ["queues", activeTenantId, branchId, format(date, "yyyy-MM-dd")],
    queryFn: () =>
      queuesFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId,
          queue_date: format(date, "yyyy-MM-dd"),
        },
      }),
    enabled: !!activeTenantId,
  });
  const queues = queuesQ.data?.rows ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["checkin-arrivals"] });
    qc.invalidateQueries({ queryKey: ["queue-tokens"] });
  };

  const checkInM = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select an appointment");
      const res = await checkinFn({
        data: {
          tenant_id: activeTenantId!,
          appointment_id: selected.id,
          checkin_channel: "reception",
          notes: notes || undefined,
        },
      });
      if (queueId) {
        await issueFn({
          data: {
            tenant_id: activeTenantId!,
            branch_id: selected.branch_id,
            queue_id: queueId,
            appointment_id: selected.id,
            person_id: selected.person_id,
          },
        });
      }
      return res;
    },
    onSuccess: () => {
      toast.success("Patient checked in");
      setNotes("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SchedulerShell
      title="Check-in Workspace"
      subtitle="Verify identity, confirm the appointment, assign a queue."
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
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-4 py-3 text-sm font-medium">
              Expected today
            </div>
            <ul className="divide-y max-h-[70vh] overflow-auto">
              {arrivals.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 ${
                      selectedId === a.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {a.appointment_code}
                      </div>
                      <Badge variant="outline">{a.status_code}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.starts_at), "p")} · {a.duration_minutes}m
                    </div>
                  </button>
                </li>
              ))}
              {arrivals.length === 0 && !arrivalsQ.isLoading && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No expected patients.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            {!selected && (
              <div className="text-sm text-muted-foreground">
                Select an appointment to begin check-in.
              </div>
            )}
            {selected && (
              <>
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    Appointment
                  </div>
                  <div className="text-lg font-semibold">
                    {selected.appointment_code}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selected.starts_at), "PPp")} ·{" "}
                    {selected.duration_minutes}m
                  </div>
                </div>

                <div className="rounded-md border p-3 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Verification checklist
                  </div>
                  <ul className="ml-6 list-disc text-xs text-muted-foreground space-y-1">
                    <li>Confirm patient identity (ID / phone OTP)</li>
                    <li>Confirm appointment details with patient</li>
                    <li>Collect co-pay / consent forms if required</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Assign to queue (optional)
                  </div>
                  <Select
                    value={queueId ?? "__none"}
                    onValueChange={(v) =>
                      setQueueId(v === "__none" ? null : v)
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="No queue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No queue</SelectItem>
                      {queues.map((q) => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.name} · {q.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase text-muted-foreground">
                    Notes
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything the doctor should know…"
                    rows={3}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    onClick={() => checkInM.mutate()}
                    disabled={checkInM.isPending}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {queueId ? "Check-in & issue token" : "Mark arrived / check-in"}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" /> Print slip
                  </Button>
                  <Button asChild variant="ghost">
                    <Link
                      to="/scheduling/appointments/$appointmentId"
                      params={{ appointmentId: selected.id }}
                    >
                      Open appointment
                    </Link>
                  </Button>
                </div>
              </>
            )}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              <Ticket className="inline h-3 w-3 mr-1" />
              Walk-ins:{" "}
              <Link to="/scheduling/new" className="underline">
                start walk-in booking
              </Link>
              .
            </div>
          </CardContent>
        </Card>
      </div>
    </SchedulerShell>
  );
}
