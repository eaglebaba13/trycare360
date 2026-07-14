/** Patient Portal — Appointments workspace. */
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  cancelMyAppointment,
  getMyQueueStatus,
  listMyAppointments,
  selfCheckIn,
} from "@/lib/patient/appointments.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Appt = { id: string; starts_at: string; ends_at?: string | null; status?: string | null; reason?: string | null };

export function AppointmentCard({ appt }: { appt: Appt }) {
  const qc = useQueryClient();
  const cancelFn = useServerFn(cancelMyAppointment);
  const checkInFn = useServerFn(selfCheckIn);
  const cancel = useMutation({
    mutationFn: () => cancelFn({ data: { appointmentId: appt.id } }),
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["patient-appts"] }); },
  });
  const checkIn = useMutation({
    mutationFn: () => checkInFn({ data: { appointmentId: appt.id } }),
    onSuccess: () => { toast.success("Checked in"); qc.invalidateQueries({ queryKey: ["patient-appts"] }); },
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{appt.reason ?? "Appointment"}</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5"><CalendarClock className="h-3 w-3 inline mr-1" />{formatDateTime(appt.starts_at)}</div>
          </div>
          {appt.status && <Badge variant="outline">{appt.status}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Check in</Button>
        <Button size="sm" variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}><XCircle className="h-3.5 w-3.5 mr-1.5" />Cancel</Button>
      </CardContent>
    </Card>
  );
}

export function AppointmentDashboard() {
  const fn = useServerFn(listMyAppointments);
  const q = useQuery<Appt[]>({ queryKey: ["patient-appts"], queryFn: () => fn({ data: {} }) as unknown as Promise<Appt[]> });
  const rows = q.data ?? [];
  const upcoming = rows.filter((r) => new Date(r.starts_at).getTime() >= Date.now());
  if (upcoming.length === 0) return <div className="text-sm text-muted-foreground py-6 text-center">No upcoming appointments.</div>;
  return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((a) => <AppointmentCard key={a.id} appt={a} />)}</div>;
}

export function AppointmentHistory() {
  const fn = useServerFn(listMyAppointments);
  const q = useQuery<Appt[]>({ queryKey: ["patient-appts"], queryFn: () => fn({ data: {} }) as unknown as Promise<Appt[]> });
  const rows = q.data ?? [];
  const past = rows.filter((r) => new Date(r.starts_at).getTime() < Date.now());
  if (past.length === 0) return <div className="text-sm text-muted-foreground py-6 text-center">No past appointments.</div>;
  return (
    <ul className="divide-y">
      {past.map((a) => (
        <li key={a.id} className="py-2 flex items-center justify-between">
          <div>
            <div className="text-sm">{a.reason ?? "Appointment"}</div>
            <div className="text-xs text-muted-foreground">{formatDateTime(a.starts_at)}</div>
          </div>
          {a.status && <Badge variant="outline">{a.status}</Badge>}
        </li>
      ))}
    </ul>
  );
}

export function AppointmentBooking() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Book a new appointment</CardTitle></CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Booking flow uses the Scheduling module. Contact your clinic or open the Scheduling workspace.
      </CardContent>
    </Card>
  );
}

export function QueueStatusCard() {
  const fn = useServerFn(getMyQueueStatus);
  const q = useQuery({ queryKey: ["patient-queue"], queryFn: () => fn({ data: {} }) });
  const data = (q.data ?? {}) as { position?: number; waitMinutes?: number };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Queue Status</CardTitle></CardHeader>
      <CardContent>
        <div className="text-sm">Position: <span className="font-medium">{data.position ?? "—"}</span></div>
        <div className="text-sm">Est. wait: <span className="font-medium">{data.waitMinutes != null ? `${data.waitMinutes} min` : "—"}</span></div>
      </CardContent>
    </Card>
  );
}

export function PatientAppointmentsPage() {
  return (
    <PatientShell title="Appointments" description="Upcoming and past appointments.">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div><AppointmentDashboard /></div>
          <QueueStatusCard />
        </div>
        <AppointmentBooking />
        <Card><CardHeader><CardTitle className="text-sm">History</CardTitle></CardHeader><CardContent><AppointmentHistory /></CardContent></Card>
      </div>
    </PatientShell>
  );
}
