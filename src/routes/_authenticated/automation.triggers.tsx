import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import {
  listTriggers, upsertTrigger, deleteTrigger, listWorkflows,
} from "@/lib/api/automation.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/automation/triggers")({
  component: TriggersPage,
});

type Row = {
  id: string; name: string; code: string; trigger_type: string;
  event_type: string | null; is_active: boolean;
  workflow: { name: string; code: string } | null;
};

function TriggersPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listTriggers);
  const save = useServerFn(upsertTrigger);
  const del = useServerFn(deleteTrigger);
  const listWf = useServerFn(listWorkflows);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "triggers", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });
  const { data: workflows = [] } = useQuery({
    queryKey: ["automation", "wf_options", activeTenantId],
    queryFn: () => listWf({ data: { tenantId: activeTenantId } }) as Promise<{ id: string; name: string; code: string }[]>,
  });

  return (
    <DefinitionList<Row>
      title="Triggers"
      description="Match domain events or schedules to workflows. Modules emit events — triggers decide which workflow runs."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "trigger_type", label: "Type", render: (r) => <Badge variant="outline" className="capitalize">{r.trigger_type}</Badge>, width: "120px" },
        { key: "event_type", label: "Event", render: (r) => r.event_type ? <code className="text-xs">{r.event_type}</code> : "—" },
        { key: "workflow", label: "Workflow", render: (r) => r.workflow?.name ?? "—" },
      ]}
      extraFields={[
        {
          key: "trigger_type", label: "Trigger type", type: "select",
          options: [
            { value: "event", label: "Event" },
            { value: "schedule", label: "Schedule (cron)" },
            { value: "webhook", label: "Webhook" },
            { value: "manual", label: "Manual" },
            { value: "api", label: "API" },
            { value: "db_change", label: "Database change" },
          ],
        },
        { key: "event_type", label: "Event type", type: "text", placeholder: "lead.created, appointment.completed…" },
        { key: "schedule_cron", label: "Schedule (cron)", type: "text", placeholder: "0 9 * * *" },
        {
          key: "workflow_id", label: "Workflow", type: "select",
          options: workflows.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })),
        },
        { key: "event_filter", label: "Event filter (rule JSON)", type: "json", help: 'e.g. { "op":"AND", "conditions":[{"field":"amount","operator":">=","value":10000}] }' },
      ]}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        trigger_type: form.trigger_type,
        event_type: form.event_type ?? null,
        schedule_cron: form.schedule_cron ?? null,
        workflow_id: form.workflow_id ?? null,
        event_filter: form.event_filter ?? {},
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
      defaultDraft={{ trigger_type: "event", event_filter: {} }}
    />
  );
}
