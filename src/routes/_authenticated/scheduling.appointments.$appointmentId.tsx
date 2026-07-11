import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  ListChecks,
  Loader2,
  RefreshCw,
  Users2,
  XCircle,
  CheckCheck,
  Play,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  getAppointment,
  cancelAppointment,
  rescheduleAppointment,
  checkInAppointment,
  startAppointment,
  completeAppointment,
  markNoShow,
} from "@/lib/scheduling/appointments.functions";

export const Route = createFileRoute(
  "/_authenticated/scheduling/appointments/$appointmentId",
)({
  component: WorkspacePage,
});

function WorkspacePage() {
  const { appointmentId } = Route.useParams();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const getFn = useServerFn(getAppointment);
  const q = useQuery({
    queryKey: ["appt", appointmentId],
    queryFn: () =>
      getFn({
        data: { tenant_id: activeTenantId!, appointment_id: appointmentId },
      }),
    enabled: !!activeTenantId,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["appt", appointmentId] });

  if (q.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (!q.data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Not found.</div>
    );
  }
  const a = q.data.appointment;
  const history = q.data.history ?? [];

  return (
    <SchedulerShell
      title={`Appointment ${a.appointment_code}`}
      subtitle={`${format(new Date(a.starts_at), "PPPp")} · ${a.duration_minutes} min · ${a.delivery_mode}`}
      quickActions={
        <>
          <Button asChild size="sm" variant="ghost">
            <Link to="/scheduling/calendar">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
        </>
      }
      contextPanel={
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Status</div>
            <Badge className="mt-1" variant="outline">
              {a.status_code}
            </Badge>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Patient</div>
            <div>{a.person_id}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Branch</div>
            <div>{a.branch_id}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Doctor</div>
            <div>{a.doctor_id ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Service</div>
            <div>{a.service_id ?? "—"}</div>
          </div>
          <Actions appointment={a} onDone={invalidate} />
        </div>
      }
    >
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="recurrence">Recurrence</TabsTrigger>
          <TabsTrigger value="package">Package</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="p-4 grid gap-3 text-sm md:grid-cols-2">
              <Field k="Code" v={a.appointment_code} />
              <Field k="Status" v={a.status_code} />
              <Field k="Booking source" v={a.booking_source} />
              <Field k="Priority weight" v={String(a.priority_weight)} />
              <Field k="Franchise" v={a.franchise_id ?? "—"} />
              <Field k="Series" v={a.series_id ?? "—"} />
              <Field k="Package" v={a.package_id ?? "—"} />
              <Field k="Lead" v={a.lead_id ?? "—"} />
              <Field k="Timezone" v={a.timezone} />
              <Field k="Created" v={format(new Date(a.created_at), "PPp")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {history.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">
                    No status changes yet.
                  </li>
                )}
                {history.map((h) => (
                  <li key={h.id} className="p-3 text-sm">
                    <div className="flex justify-between">
                      <div className="font-medium">
                        {h.from_status ?? "—"} → {h.to_status}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(h.changed_at), "PPp")}
                      </div>
                    </div>
                    {h.reason && (
                      <div className="text-xs text-muted-foreground">
                        {h.reason}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <SimplePanel
            icon={<Users2 className="h-4 w-4" />}
            title="Queue token"
            body="Issue and manage queue tokens from the branch queue console (Stage 4)."
          />
        </TabsContent>
        <TabsContent value="resources" className="mt-4">
          <Card>
            <CardContent className="p-4 grid gap-3 text-sm md:grid-cols-2">
              <Field k="Doctor" v={a.doctor_id ?? "—"} />
              <Field k="Primary resource" v={a.primary_resource_id ?? "—"} />
              <Field k="Room" v={a.room_resource_id ?? "—"} />
              <Field k="Resource group" v={a.resource_group_id ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recurrence" className="mt-4">
          {a.series_id ? (
            <SimplePanel
              icon={<CalendarClock className="h-4 w-4" />}
              title="Part of a series"
              body={
                <Link
                  to="/scheduling/series/$seriesId"
                  params={{ seriesId: a.series_id! }}
                  className="text-primary underline"
                >
                  View series →
                </Link>
              }
            />
          ) : (
            <SimplePanel
              icon={<CalendarClock className="h-4 w-4" />}
              title="Standalone"
              body="This appointment is not part of a recurring series."
            />
          )}
        </TabsContent>
        <TabsContent value="package" className="mt-4">
          <SimplePanel
            icon={<ListChecks className="h-4 w-4" />}
            title={a.package_id ? "Package appointment" : "Standalone"}
            body={a.package_id ?? "Not part of a package sequence."}
          />
        </TabsContent>
        <TabsContent value="waitlist" className="mt-4">
          <SimplePanel
            icon={<ClipboardList className="h-4 w-4" />}
            title="Waitlist"
            body="If this appointment is cancelled, the engine automatically offers the slot to matching waitlist candidates."
          />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <SimplePanel
            icon={<FileText className="h-4 w-4" />}
            title="Documents"
            body="Attach and view documents from the Data Foundation service."
          />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2 text-sm">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Patient notes
                </div>
                <div>{a.notes ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Internal notes
                </div>
                <div>{a.internal_notes ?? "—"}</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="p-4 text-sm space-y-2">
              <Field k="Created by" v={a.created_by ?? "—"} />
              <Field k="Updated by" v={a.updated_by ?? "—"} />
              <Field k="Booked by" v={a.booked_by ?? "—"} />
              <Field k="Updated at" v={format(new Date(a.updated_at), "PPp")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SchedulerShell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{k}</div>
      <div className="font-medium truncate">{v}</div>
    </div>
  );
}

function SimplePanel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </CardContent>
    </Card>
  );
}

function Actions({
  appointment,
  onDone,
}: {
  appointment: {
    id: string;
    tenant_id: string;
    starts_at: string;
    status_code: string;
  };
  onDone: () => void;
}) {
  const [rescheduleAt, setRescheduleAt] = useState<string>("");
  const [reason, setReason] = useState("");
  const cancelFn = useServerFn(cancelAppointment);
  const rescheduleFn = useServerFn(rescheduleAppointment);
  const checkinFn = useServerFn(checkInAppointment);
  const startFn = useServerFn(startAppointment);
  const completeFn = useServerFn(completeAppointment);
  const noShowFn = useServerFn(markNoShow);

  const mk = <T,>(fn: (v: T) => Promise<unknown>) =>
    useMutation<unknown, Error, T>({
      mutationFn: (v) => fn(v),
      onSuccess: () => {
        toast.success("Updated");
        onDone();
      },
      onError: (e) => toast.error(e.message),
    });

  const cancel = mk((v: { reason: string }) =>
    cancelFn({
      data: {
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
        reason_code: v.reason || "user_cancel",
        cancelled_by_role: "clinic",
        release_resources: true,
        offer_waitlist: true,
      },
    }),
  );
  const reschedule = mk((v: { at: string }) =>
    rescheduleFn({
      data: {
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
        new_starts_at: v.at,
        requested_by_role: "clinic",
      },
    }),
  );
  const checkin = mk(() =>
    checkinFn({
      data: {
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
        checkin_channel: "reception",
      },
    }),
  );
  const start = mk(() =>
    startFn({
      data: {
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
      },
    }),
  );
  const complete = mk(() =>
    completeFn({
      data: {
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
      },
    }),
  );
  const noShow = mk(() =>
    noShowFn({
      data: {
        tenant_id: appointment.tenant_id,
        appointment_id: appointment.id,
      },
    }),
  );

  const isTerminal =
    appointment.status_code === "cancelled" ||
    appointment.status_code === "completed" ||
    appointment.status_code === "no_show";
  const anyPending =
    cancel.isPending ||
    reschedule.isPending ||
    checkin.isPending ||
    start.isPending ||
    complete.isPending ||
    noShow.isPending;

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="text-xs uppercase text-muted-foreground">Actions</div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isTerminal || anyPending}
          onClick={() => checkin.mutate(undefined as never)}
        >
          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Check in
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isTerminal || anyPending}
          onClick={() => start.mutate(undefined as never)}
        >
          <Play className="mr-1 h-3.5 w-3.5" /> Start
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isTerminal || anyPending}
          onClick={() => complete.mutate(undefined as never)}
        >
          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Complete
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isTerminal || anyPending}
          onClick={() => noShow.mutate(undefined as never)}
        >
          <XCircle className="mr-1 h-3.5 w-3.5" /> No-show
        </Button>
      </div>
      <div className="space-y-1">
        <input
          type="datetime-local"
          className="w-full border rounded px-2 py-1 text-sm"
          value={rescheduleAt}
          onChange={(e) => setRescheduleAt(e.target.value)}
        />
        <Button
          size="sm"
          className="w-full"
          variant="secondary"
          disabled={!rescheduleAt || isTerminal || anyPending}
          onClick={() =>
            reschedule.mutate({
              at: new Date(rescheduleAt).toISOString(),
            })
          }
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reschedule
        </Button>
      </div>
      <div className="space-y-1">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Cancel reason"
          rows={2}
        />
        <Button
          size="sm"
          className="w-full"
          variant="destructive"
          disabled={isTerminal || anyPending}
          onClick={() => cancel.mutate({ reason })}
        >
          {anyPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="mr-1 h-3.5 w-3.5" />
          )}
          Cancel appointment
        </Button>
      </div>
    </div>
  );
}
