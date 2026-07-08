import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { automationDashboard } from "@/lib/api/automation.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Workflow, PlayCircle, PauseCircle, AlertCircle, CheckCircle2, Clock,
  ListTodo, AlertTriangle, CheckSquare, Timer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/automation/")({
  component: AutomationDashboard,
});

function AutomationDashboard() {
  const { activeTenantId } = useTenant();
  const call = useServerFn(automationDashboard);
  const { data } = useQuery({
    queryKey: ["automation", "dashboard", activeTenantId],
    queryFn: () => call({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  if (!activeTenantId) {
    return <div className="text-sm text-muted-foreground">Select a tenant to view automation activity.</div>;
  }

  const tiles = [
    { label: "Workflows", value: data?.workflows ?? 0, icon: Workflow, tone: "text-primary" },
    { label: "Runs — running", value: data?.runs.running ?? 0, icon: PlayCircle, tone: "text-emerald-600" },
    { label: "Runs — queued", value: data?.runs.queued ?? 0, icon: Clock, tone: "text-blue-600" },
    { label: "Runs — waiting", value: data?.runs.waiting ?? 0, icon: PauseCircle, tone: "text-amber-600" },
    { label: "Runs — failed", value: data?.runs.failed ?? 0, icon: AlertCircle, tone: "text-destructive" },
    { label: "Completed (24h)", value: data?.runs.completed24h ?? 0, icon: CheckCircle2, tone: "text-emerald-600" },
    { label: "Tasks open", value: data?.tasks.open ?? 0, icon: ListTodo, tone: "text-blue-600" },
    { label: "Tasks overdue", value: data?.tasks.overdue ?? 0, icon: AlertTriangle, tone: "text-orange-600" },
    { label: "Approvals pending", value: data?.approvalsPending ?? 0, icon: CheckSquare, tone: "text-purple-600" },
    { label: "SLA breached", value: data?.slaBreached ?? 0, icon: Timer, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <CardHeader>
          <CardTitle className="text-base">How the engine flows</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Business modules never call third-party services or hardcode workflows. They emit domain events
            through <code className="mx-1 rounded bg-muted px-1">emit_automation_event</code>. Matching
            triggers create queued <code className="mx-1 rounded bg-muted px-1">workflow_runs</code>, which
            traverse the definition graph — actions that touch external services dispatch through the
            Integration Center.
          </p>
          <p>
            Every dropdown value (workflow node types, action types, event types, task priorities,
            template types, form field types) is registered as a Master and can be added without a code change.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
