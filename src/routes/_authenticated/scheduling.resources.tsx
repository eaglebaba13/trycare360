import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { startOfDay, endOfDay, format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import { getResourceUtilization } from "@/lib/scheduling/lists.functions";

export const Route = createFileRoute("/_authenticated/scheduling/resources")({
  component: ResourceUtilizationPage,
});

type Kind = "all" | "doctor" | "room" | "machine" | "therapist";

function ResourceUtilizationPage() {
  const { activeTenantId } = useTenant();
  const [date, setDate] = useState<Date>(new Date());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("all");

  const range = useMemo(
    () => ({
      day_start: startOfDay(date).toISOString(),
      day_end: endOfDay(date).toISOString(),
    }),
    [date],
  );

  const fn = useServerFn(getResourceUtilization);
  const q = useQuery({
    queryKey: ["res-util", activeTenantId, branchId, range.day_start],
    queryFn: () =>
      fn({
        data: {
          tenant_id: activeTenantId!,
          branch_id: branchId!,
          day_start: range.day_start,
          day_end: range.day_end,
        },
      }),
    enabled: !!activeTenantId && !!branchId,
  });

  const resources = (q.data?.resources ?? []).filter(
    (r) => kind === "all" || r.kind === kind,
  );

  return (
    <SchedulerShell
      title="Resource Utilization"
      subtitle="Doctors · Rooms · Machines · Therapists"
      date={date}
      onDateChange={setDate}
      branchId={branchId}
      onBranchChange={setBranchId}
      filters={
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="doctor">Doctors</TabsTrigger>
            <TabsTrigger value="therapist">Therapists</TabsTrigger>
            <TabsTrigger value="room">Rooms</TabsTrigger>
            <TabsTrigger value="machine">Machines</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {!branchId && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            Select a branch to view utilization.
          </CardContent>
        </Card>
      )}
      {branchId && q.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            Loading…
          </CardContent>
        </Card>
      )}
      {branchId && !q.isLoading && resources.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            No resources for this filter.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {resources.map((r) => {
          const pct = Math.round(r.utilization * 100);
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.kind}
                    </div>
                  </div>
                  <Badge variant="outline">{r.appointment_count} appts</Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Utilization</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                  <div className="text-xs text-muted-foreground">
                    {r.booked_minutes} min booked on {format(date, "PP")}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SchedulerShell>
  );
}
