import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { adminListExperiments, adminUpsertExperiment, adminPromoteWinner } from "@/lib/cms/marketing.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cms/experiments")({
  component: ExperimentsPage,
});

function ExperimentsPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const qc = useQueryClient();
  const listFn = useServerFn(adminListExperiments);
  const upsertFn = useServerFn(adminUpsertExperiment);
  const promoteFn = useServerFn(adminPromoteWinner);
  const { data: rows = [] } = useQuery({
    queryKey: ["cms-experiments", tenantId],
    queryFn: () => listFn({ data: { tenant_id: tenantId } }),
    enabled: !!tenantId,
  });

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => upsertFn({ data: patch as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms-experiments", tenantId] }),
  });
  const promote = useMutation({
    mutationFn: (v: { id: string; winner: "A" | "B" }) => promoteFn({ data: { experiment_id: v.id, winner: v.winner } }),
    onSuccess: () => { toast.success("Winner promoted"); qc.invalidateQueries({ queryKey: ["cms-experiments", tenantId] }); },
  });

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight">A/B experiments</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Split traffic between two variants of a page, measure conversion on the goal event, and promote the winner.
      </p>
      <div className="grid gap-3">
        {rows.map((r) => {
          const stats = r.stats as { a: { views: number; conv: number }; b: { views: number; conv: number } };
          const cvrA = stats.a.views ? ((stats.a.conv / stats.a.views) * 100).toFixed(1) : "—";
          const cvrB = stats.b.views ? ((stats.b.conv / stats.b.views) * 100).toFixed(1) : "—";
          return (
            <Card key={r.id as string} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.name as string}</div>
                  <div className="text-xs text-muted-foreground">
                    Goal: {(r.goal_event as string) ?? "—"} · Split {r.traffic_split as number}/{100 - (r.traffic_split as number)}
                  </div>
                </div>
                <Badge>{r.status as string}</Badge>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3 text-sm">
                  <div className="font-semibold">Variant A</div>
                  <div className="text-muted-foreground">{stats.a.views} views · {stats.a.conv} conv · {cvrA}%</div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => promote.mutate({ id: r.id as string, winner: "A" })}>Promote A</Button>
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <div className="font-semibold">Variant B</div>
                  <div className="text-muted-foreground">{stats.b.views} views · {stats.b.conv} conv · {cvrB}%</div>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => promote.mutate({ id: r.id as string, winner: "B" })}>Promote B</Button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {r.status !== "running" && (
                  <Button size="sm" onClick={() => update.mutate({ id: r.id, tenant_id: tenantId, page_id: r.page_id, name: r.name, variant_a: r.variant_a, variant_b: r.variant_b, traffic_split: r.traffic_split, goal_event: r.goal_event, status: "running" })}>Start</Button>
                )}
                {r.status === "running" && (
                  <Button size="sm" variant="outline" onClick={() => update.mutate({ id: r.id, tenant_id: tenantId, page_id: r.page_id, name: r.name, variant_a: r.variant_a, variant_b: r.variant_b, traffic_split: r.traffic_split, goal_event: r.goal_event, status: "paused" })}>Pause</Button>
                )}
              </div>
            </Card>
          );
        })}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No experiments yet. Create one from the page builder.
          </div>
        )}
      </div>
    </div>
  );
}
