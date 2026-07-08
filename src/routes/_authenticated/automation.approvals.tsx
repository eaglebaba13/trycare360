import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import {
  listApprovalDefinitions, upsertApprovalDefinition, deleteApprovalDefinition,
} from "@/lib/api/automation.functions";

export const Route = createFileRoute("/_authenticated/automation/approvals")({
  component: ApprovalsPage,
});

type Row = { id: string; name: string; code: string; module: string | null; entity: string | null; is_active: boolean; levels: unknown[] };

function ApprovalsPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listApprovalDefinitions);
  const save = useServerFn(upsertApprovalDefinition);
  const del = useServerFn(deleteApprovalDefinition);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "approvals", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="Approval flows"
      description="Single/multi-level approval definitions. Modules submit approval requests against a definition; requests advance sequentially or in parallel."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "module", label: "Module", render: (r) => r.module ?? "—", width: "120px" },
        { key: "levels", label: "Levels", render: (r) => Array.isArray(r.levels) ? String(r.levels.length) : "0", width: "80px" },
      ]}
      extraFields={[
        { key: "module", label: "Module", type: "text" },
        { key: "entity", label: "Entity", type: "text", placeholder: "invoice, refund, discount…" },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "levels", label: "Levels (JSON)", type: "json",
          help: 'Array of { "level":1, "mode":"sequential"|"parallel", "approvers":[{ "type":"role"|"user"|"department", "value":"..." }], "min_approvals":1, "timeout_hours":24, "on_timeout":"escalate"|"auto_approve"|"auto_reject" }',
        },
      ]}
      defaultDraft={{ levels: [] }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        module: form.module ?? null,
        entity: form.entity ?? null,
        description: form.description ?? null,
        levels: form.levels ?? [],
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
    />
  );
}
