import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import { listForms, upsertForm, deleteForm } from "@/lib/api/automation.functions";

export const Route = createFileRoute("/_authenticated/automation/forms")({
  component: FormsPage,
});

type Row = { id: string; name: string; code: string; module: string | null; entity: string | null; version: number; is_active: boolean };

function FormsPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listForms);
  const save = useServerFn(upsertForm);
  const del = useServerFn(deleteForm);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "forms", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="Forms"
      description="Dynamic forms with sections, groups, fields, validation and conditional visibility. Every module reads its input surfaces from here."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "module", label: "Module", render: (r) => r.module ?? "—", width: "120px" },
        { key: "entity", label: "Entity", render: (r) => r.entity ?? "—", width: "120px" },
        { key: "version", label: "v", width: "60px" },
      ]}
      extraFields={[
        { key: "module", label: "Module", type: "text", placeholder: "crm, clinical…" },
        { key: "entity", label: "Entity", type: "text", placeholder: "lead, patient, invoice…" },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "schema", label: "Form schema (JSON)", type: "json",
          help: 'Shape: { "sections":[{ "id","title","groups":[{ "id","title","fields":[{ "key","label","type","required","options","visibility","validation" }] }] }] }',
        },
      ]}
      defaultDraft={{ version: 1, schema: { sections: [] } }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        module: form.module ?? null,
        entity: form.entity ?? null,
        description: form.description ?? null,
        version: (form.version as number) ?? 1,
        schema: form.schema ?? { sections: [] },
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
    />
  );
}
