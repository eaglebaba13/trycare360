import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import { listRuleSets, upsertRuleSet, deleteRuleSet } from "@/lib/api/automation.functions";

export const Route = createFileRoute("/_authenticated/automation/rules")({
  component: RulesPage,
});

type Row = { id: string; name: string; code: string; description: string | null; is_active: boolean };

function RulesPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listRuleSets);
  const save = useServerFn(upsertRuleSet);
  const del = useServerFn(deleteRuleSet);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "rules", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="Rule sets"
      description="Reusable AND/OR/NOT condition trees. Consumed by trigger filters, notification rules, SLA scoping and workflow condition nodes."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "description", label: "Description", render: (r) => <span className="text-muted-foreground text-xs line-clamp-1">{r.description ?? "—"}</span> },
      ]}
      extraFields={[
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "definition", label: "Rule definition (JSON)", type: "json",
          help: 'Shape: { "op":"AND"|"OR"|"NOT", "conditions":[{ "field","operator","value" } | <nested group>] }',
        },
      ]}
      defaultDraft={{ definition: { op: "AND", conditions: [] } }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        description: form.description ?? null,
        definition: form.definition ?? { op: "AND", conditions: [] },
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
    />
  );
}
