import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { dataFoundationDashboard } from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity, FolderOpen, StickyNote, Search, LayoutGrid,
  FileBarChart, TrendingUp, Database, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/")({
  component: DataOverview,
});

function DataOverview() {
  const { activeTenantId } = useTenant();
  const call = useServerFn(dataFoundationDashboard);
  const { data } = useQuery({
    queryKey: ["data", "dashboard", activeTenantId],
    queryFn: () => call({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  if (!activeTenantId) {
    return <div className="text-sm text-muted-foreground">Select a tenant to view foundation activity.</div>;
  }

  const tiles = [
    { label: "Timeline events", value: data?.timeline ?? 0, icon: Activity, tone: "text-primary" },
    { label: "Documents", value: data?.documents ?? 0, icon: FolderOpen, tone: "text-blue-600" },
    { label: "Notes", value: data?.notes ?? 0, icon: StickyNote, tone: "text-amber-600" },
    { label: "Indexed entities", value: data?.indexed ?? 0, icon: Search, tone: "text-purple-600" },
    { label: "Dashboard layouts", value: data?.layouts ?? 0, icon: LayoutGrid, tone: "text-emerald-600" },
    { label: "Report definitions", value: data?.reports ?? 0, icon: FileBarChart, tone: "text-emerald-600" },
    { label: "KPIs registered", value: data?.kpis ?? 0, icon: TrendingUp, tone: "text-primary" },
    { label: "KPI snapshots", value: data?.snapshots ?? 0, icon: Database, tone: "text-blue-600" },
    { label: "Audit events (24h)", value: data?.audit24h ?? 0, icon: ShieldCheck, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
                <Icon className={`h-4 w-4 ${t.tone}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold font-display">{t.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">How modules consume this foundation</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Every module writes activity through <code className="mx-1 rounded bg-muted px-1">log_timeline_event</code>,
            attaches files as <code className="mx-1 rounded bg-muted px-1">documents</code>, publishes searchable
            records through <code className="mx-1 rounded bg-muted px-1">index_search_entity</code>, renders KPIs
            through <code className="mx-1 rounded bg-muted px-1">analytics_snapshots</code>, and reads
            <code className="mx-1 rounded bg-muted px-1">dashboard_layouts</code> for role-scoped widgets.
          </p>
          <p>
            All dropdown values (event types, categories, entity types, widget types, export formats, KPI
            categories) are Masters — Super Admin can extend them without a code change.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
