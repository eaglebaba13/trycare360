import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startOfDay, endOfDay, format } from "date-fns";
import {
  Search as SearchIcon,
  UserPlus,
  Ticket,
  Printer,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { searchPersons } from "@/lib/scheduling/lists.functions";
import {
  listQueues,
  listExpectedArrivals,
} from "@/lib/scheduling/queue-lists.functions";
import {
  issueQueueToken,
  transferQueueToken,
} from "@/lib/scheduling/queue.functions";
import { checkInAppointment } from "@/lib/scheduling/appointments.functions";

export const Route = createFileRoute("/_authenticated/scheduling/reception")({
  component: ReceptionPage,
});

function ReceptionPage() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [queueId, setQueueId] = useState<string | null>(null);
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
  const personSearchFn = useServerFn(searchPersons);
  const checkinFn = useServerFn(checkInAppointment);
  const issueFn = useServerFn(issueQueueToken);
  const transferFn = useServerFn(transferQueueToken);

  const arrivalsQ = useQuery({
    queryKey: ["arrivals", activeTenantId, branchId, range.from],
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

  const searchQ = useQuery({
    queryKey: ["reception-person-search", activeTenantId, search],
    queryFn: () =>
      personSearchFn({
        data: { tenant_id: activeTenantId!, query: search, limit: 15 },
      }),
    enabled: !!activeTenantId && search.length >= 2,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["arrivals"] });
    qc.invalidateQueries({ queryKey: ["queue-tokens"] });
  };

  const checkInM = useMutation({
    mutationFn: (args: { appointmentId: string }) =>
      checkinFn({
        data: {
          tenant_id: activeTenantId!,
          appointment_id: args.appointmentId,
          checkin_channel: "reception",
        },
      }),
    onSuccess: () => {
      toast.success("Checked in");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const issueTokenM = useMutation({
    mutationFn: (args: {
      appointmentId?: string;
      personId?: string;
    }) => {
      if (!queueId) throw new Error("Select a queue first");
      return issueFn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId ?? queues.find((q) => q.id === queueId)?.branch_id ?? "",
          queue_id: queueId,
          appointment_id: args.appointmentId ?? null,
          person_id: args.personId ?? null,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Token issued — ${res.token.token_label ?? res.token.token_number}`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const arrivals = arrivalsQ.data?.rows ?? [];
  const persons = searchQ.data?.rows ?? [];

  return (
    <SchedulerShell
      title="Reception Desk"
      subtitle="Walk-ins, check-ins and queue assignment."
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
      quickActions={
        <>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/new">
              <UserPlus className="mr-2 h-4 w-4" /> Walk-in booking
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/scheduling/queue">Live queue</Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="text-sm font-medium">
                Expected today ({arrivals.length})
              </div>
              <Select
                value={queueId ?? "__none"}
                onValueChange={(v) => setQueueId(v === "__none" ? null : v)}
              >
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Assign to queue…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— No queue —</SelectItem>
                  {queues.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.name} · {q.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {arrivalsQ.isLoading && (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            )}
            <ul className="divide-y">
              {arrivals.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.appointment_code}
                      {a.is_walk_in && (
                        <Badge variant="secondary" className="ml-2">
                          Walk-in
                        </Badge>
                      )}
                      {a.is_vip && (
                        <Badge variant="outline" className="ml-1">VIP</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(a.starts_at), "p")} · {a.duration_minutes}m
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.status_code}</Badge>
                    {a.status_code !== "checked_in" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          checkInM.mutate({ appointmentId: a.id })
                        }
                        disabled={checkInM.isPending}
                      >
                        <UserCheck className="mr-1 h-4 w-4" /> Check-in
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() =>
                        issueTokenM.mutate({
                          appointmentId: a.id,
                          personId: a.person_id,
                        })
                      }
                      disabled={issueTokenM.isPending || !queueId}
                    >
                      <Ticket className="mr-1 h-4 w-4" /> Token
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
              {!arrivalsQ.isLoading && arrivals.length === 0 && (
                <li className="p-6 text-sm text-muted-foreground text-center">
                  No expected arrivals in this window.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="text-sm font-medium">Search patient</div>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Name, phone or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ul className="divide-y max-h-[520px] overflow-auto">
              {persons.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.full_name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.phone_e164 ?? p.email_normalized ?? p.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        issueTokenM.mutate({ personId: p.id })
                      }
                      disabled={issueTokenM.isPending || !queueId}
                    >
                      <Ticket className="mr-1 h-4 w-4" /> Token
                    </Button>
                  </div>
                </li>
              ))}
              {search.length >= 2 && persons.length === 0 && !searchQ.isLoading && (
                <li className="py-2 text-xs text-muted-foreground">
                  No matches — try a walk-in booking.
                </li>
              )}
            </ul>
            <div className="pt-2 border-t">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  void transferFn;
                }}
              >
                <Link to="/scheduling/new">
                  <UserPlus className="mr-2 h-4 w-4" /> New walk-in
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SchedulerShell>
  );
}
