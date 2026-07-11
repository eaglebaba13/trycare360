import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SchedulerShell } from "@/components/scheduling/scheduler-shell";
import { useTenant } from "@/hooks/use-tenant";
import { listPackagePlans } from "@/lib/scheduling/lists.functions";

export const Route = createFileRoute("/_authenticated/scheduling/packages")({
  component: PackagesPage,
});

function PackagesPage() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(listPackagePlans);
  const q = useQuery({
    queryKey: ["packages", activeTenantId],
    queryFn: () => fn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const rows = q.data?.rows ?? [];
  return (
    <SchedulerShell
      title="Package Scheduler"
      subtitle="Sequences · Progress · Dependencies"
    >
      {q.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            Loading…
          </CardContent>
        </Card>
      )}
      {!q.isLoading && rows.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            No package plans defined yet.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => {
          const meta = (p.meta ?? {}) as Record<string, unknown>;
          const total = Number(meta.total_sessions ?? 0);
          const completed = Number(meta.completed_sessions ?? 0);
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          return (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{p.name}</div>
                  <Badge variant="outline">{p.is_active ? "active" : "inactive"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.description ?? ""}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {completed}/{total}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SchedulerShell>
  );
}
