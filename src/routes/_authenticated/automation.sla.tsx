import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import { listSlaPolicies, upsertSlaPolicy, deleteSlaPolicy } from "@/lib/api/automation.functions";

export const Route = createFileRoute("/_authenticated/automation/sla")({
  component: SlaPage,
});

type Row = {
  id: string; name: string; code: string; module: string | null; entity: string | null;
  response_minutes: number | null; resolution_minutes: number | null; is_active: boolean;
};

function SlaPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listSlaPolicies);
  const save = useServerFn(upsertSlaPolicy);
  const del = useServerFn(deleteSlaPolicy);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "sla", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="SLA policies"
      description="Response and resolution SLAs with business-hours calendar and escalation ladder. Attached to entities via the applies-when rule."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "module", label: "Module", render: (r) => r.module ?? "—", width: "120px" },
        { key: "response_minutes", label: "Resp (min)", width: "90px" },
        { key: "resolution_minutes", label: "Res (min)", width: "90px" },
      ]}
      extraFields={[
        { key: "module", label: "Module", type: "text" },
        { key: "entity", label: "Entity", type: "text", placeholder: "ticket, lead…" },
        { key: "response_minutes", label: "Response minutes", type: "text", placeholder: "15" },
        { key: "resolution_minutes", label: "Resolution minutes", type: "text", placeholder: "240" },
        { key: "business_hours", label: "Business hours (JSON)", type: "json", help: '{ "tz":"Asia/Kolkata", "days":{ "mon":["09:00","18:00"], ... }, "holidays":["2026-01-26"] }' },
        { key: "escalation", label: "Escalation (JSON)", type: "json", help: '[{ "after_minutes":30, "notify":{ "type":"role", "value":"center_manager" } }]' },
        { key: "applies_when", label: "Applies when (rule JSON)", type: "json" },
      ]}
      defaultDraft={{ business_hours: {}, escalation: [] }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        module: form.module ?? null,
        entity: form.entity ?? null,
        response_minutes: form.response_minutes ? Number(form.response_minutes) : null,
        resolution_minutes: form.resolution_minutes ? Number(form.resolution_minutes) : null,
        business_hours: form.business_hours ?? {},
        escalation: form.escalation ?? [],
        breach_notify: form.breach_notify ?? {},
        applies_when: form.applies_when ?? null,
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
    />
  );
}
