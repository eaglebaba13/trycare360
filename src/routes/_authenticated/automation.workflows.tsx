import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import {
  listWorkflows, upsertWorkflow, deleteWorkflow, startWorkflowRun,
} from "@/lib/api/automation.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/automation/workflows")({
  component: WorkflowsPage,
});

type Row = { id: string; name: string; code: string; module?: string | null; trigger_type: string; is_active: boolean };

function WorkflowsPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listWorkflows);
  const save = useServerFn(upsertWorkflow);
  const del = useServerFn(deleteWorkflow);
  const start = useServerFn(startWorkflowRun);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "workflows", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="Workflows"
      description="Multi-step processes. Every future module wires flows here instead of hardcoding side-effects."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "module", label: "Module", render: (r) => r.module ?? "—", width: "120px" },
        { key: "trigger_type", label: "Trigger", render: (r) => <Badge variant="outline" className="capitalize">{r.trigger_type.replace("_", " ")}</Badge>, width: "140px" },
      ]}
      extraFields={[
        { key: "module", label: "Module", type: "text", placeholder: "crm, clinical, accounts…" },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "trigger_type", label: "Trigger type", type: "select",
          options: [
            { value: "manual", label: "Manual" },
            { value: "event", label: "Event" },
            { value: "schedule", label: "Schedule" },
            { value: "webhook", label: "Webhook" },
            { value: "api", label: "API" },
            { value: "db_change", label: "Database change" },
          ],
        },
        { key: "graph", label: "Workflow graph (JSON)", type: "json", help: 'Shape: { "nodes":[...], "edges":[...] }' },
        { key: "trigger_config", label: "Trigger config (JSON)", type: "json" },
      ]}
      defaultDraft={{ trigger_type: "manual", graph: { nodes: [], edges: [] }, trigger_config: {} }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        module: form.module ?? null,
        description: form.description ?? null,
        trigger_type: form.trigger_type ?? "manual",
        trigger_config: form.trigger_config ?? {},
        graph: form.graph ?? { nodes: [], edges: [] },
        version: (form.version as number) ?? 1,
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRun={(row) => start({ data: { workflowId: row.id, context: {} } })}
      onRefresh={refetch}
    />
  );
}
