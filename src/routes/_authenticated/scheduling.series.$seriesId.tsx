import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import {
  listAppointmentSeries,
  getSeriesDetail,
} from "@/lib/scheduling/lists.functions";
import { materializeRecurrence } from "@/lib/scheduling/engines.functions";

export const Route = createFileRoute("/_authenticated/scheduling/series/$seriesId")({
  component: SeriesPage,
});

function SeriesPage() {
  const { seriesId } = Route.useParams();
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"series" | "occurrences" | "exceptions">(
    "series",
  );

  const detailFn = useServerFn(getSeriesDetail);
  const q = useQuery({
    queryKey: ["series", seriesId],
    queryFn: () =>
      detailFn({
        data: { tenant_id: activeTenantId!, series_id: seriesId },
      }),
    enabled: !!activeTenantId,
  });

  const listFn = useServerFn(listAppointmentSeries);
  const allQ = useQuery({
    queryKey: ["series-list", activeTenantId],
    queryFn: () =>
      listFn({ data: { tenant_id: activeTenantId!, limit: 50 } }),
    enabled: !!activeTenantId,
  });

  const matFn = useServerFn(materializeRecurrence);
  const mat = useMutation({
    mutationFn: () =>
      matFn({
        data: {
          tenant_id: activeTenantId!,
          series_id: seriesId,
          horizon_days: 60,
        },
      }),
    onSuccess: () => {
      toast.success("Recurrence materialized");
      qc.invalidateQueries({ queryKey: ["series", seriesId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = q.data?.series;

  return (
    <SchedulerShell
      title="Recurring Appointment"
      subtitle="Series · Occurrences · Exceptions · Future changes"
      contextPanel={
        <div className="text-sm space-y-2">
          <div className="text-xs uppercase text-muted-foreground">
            Other series
          </div>
          <ul className="space-y-1">
            {(allQ.data?.rows ?? []).slice(0, 12).map((r) => (
              <li key={r.id}>
                <Link
                  to="/scheduling/series/$seriesId"
                  params={{ seriesId: r.id }}
                  className="block truncate text-primary underline"
                >
                  {r.id.slice(0, 8)} · {r.status}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      }
      quickActions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => mat.mutate()}
          disabled={mat.isPending}
        >
          {mat.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Materialize
        </Button>
      }
    >
      {q.isLoading && (
        <div className="p-6 text-sm text-muted-foreground">Loading…</div>
      )}
      {!q.isLoading && s && (
        <>
          <Card>
            <CardContent className="p-4 grid gap-3 text-sm md:grid-cols-3">
              <F k="RRULE" v={s.rrule} />
              <F k="DTSTART" v={format(new Date(s.dtstart), "PPp")} />
              <F k="Until" v={s.until ? format(new Date(s.until), "PPp") : "—"} />
              <F k="Status" v={s.status} />
              <F k="Branch" v={s.branch_id} />
              <F k="Service" v={s.service_id} />
              <F k="Timezone" v={s.timezone} />
              <F k="Count" v={String(s.occurrence_count ?? "—")} />
            </CardContent>
          </Card>

          <div className="mt-4 flex gap-2 text-sm">
            {(["series", "occurrences", "exceptions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded border ${
                  tab === t ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "occurrences" && (
            <Card className="mt-3">
              <CardContent className="p-0">
                <ul className="divide-y">
                  {(q.data?.occurrences ?? []).length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground">
                      No materialized occurrences yet — click Materialize.
                    </li>
                  )}
                  {(q.data?.occurrences ?? []).map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between p-3 text-sm"
                    >
                      <div>
                        <div className="font-medium">
                          {format(new Date(o.starts_at), "PPp")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Branch {o.branch_id} · Doctor {o.doctor_id ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{o.status_code}</Badge>
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/scheduling/appointments/$appointmentId"
                            params={{ appointmentId: o.id }}
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
          )}

          {tab === "exceptions" && (
            <Card className="mt-3">
              <CardContent className="p-0">
                <ul className="divide-y">
                  {(q.data?.exceptions ?? []).length === 0 && (
                    <li className="p-4 text-sm text-muted-foreground">
                      No exceptions.
                    </li>
                  )}
                  {(q.data?.exceptions ?? []).map((ex) => (
                    <li key={ex.id} className="p-3 text-sm">
                      <div className="flex justify-between">
                        <div className="font-medium flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" />
                          {format(new Date(ex.original_start_at), "PP")}
                        </div>
                        <Badge variant="outline">{ex.exception_type}</Badge>
                      </div>
                      {ex.reason_code && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {ex.reason_code}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </SchedulerShell>
  );
}

function F({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{k}</div>
      <div className="font-medium truncate">{v}</div>
    </div>
  );
}
