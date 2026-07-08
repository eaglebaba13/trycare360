import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import { listTemplates, upsertTemplate, deleteTemplate } from "@/lib/api/automation.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/automation/templates")({
  component: TemplatesPage,
});

type Row = { id: string; name: string; code: string; type: string; subject: string | null; is_active: boolean };

function TemplatesPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listTemplates);
  const save = useServerFn(upsertTemplate);
  const del = useServerFn(deleteTemplate);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "templates", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="Templates"
      description="Email, WhatsApp, SMS, push, in-app, PDF, invoice and certificate templates. Referenced by notification rules and workflow actions."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "type", label: "Type", render: (r) => <Badge variant="outline" className="capitalize">{r.type}</Badge>, width: "110px" },
        { key: "subject", label: "Subject", render: (r) => r.subject ?? "—" },
      ]}
      extraFields={[
        {
          key: "type", label: "Type", type: "select",
          options: [
            { value: "email", label: "Email" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "sms", label: "SMS" },
            { value: "push", label: "Push" },
            { value: "inapp", label: "In-app" },
            { value: "pdf", label: "PDF" },
            { value: "invoice", label: "Invoice" },
            { value: "certificate", label: "Certificate" },
          ],
        },
        { key: "subject", label: "Subject / title", type: "text" },
        { key: "body", label: "Body", type: "textarea", placeholder: "Hi {{name}}, your appointment on {{date}} is confirmed." },
        { key: "provider_template_id", label: "Provider template ID", type: "text", placeholder: "approved_whatsapp_template_name" },
        { key: "variables", label: "Variables (JSON)", type: "json", help: '[{ "key":"name", "label":"Customer name", "required":true }]' },
      ]}
      defaultDraft={{ type: "email", variables: [] }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        type: form.type,
        subject: form.subject ?? null,
        body: form.body ?? "",
        variables: form.variables ?? [],
        provider_template_id: form.provider_template_id ?? null,
        meta: form.meta ?? {},
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
    />
  );
}
