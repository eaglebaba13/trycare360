import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DefinitionList } from "@/components/automation/definition-list";
import { useTenant } from "@/hooks/use-tenant";
import { listNotificationRules, upsertNotificationRule, deleteNotificationRule } from "@/lib/api/automation.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/automation/notifications")({
  component: NotificationsPage,
});

type Row = {
  id: string; name: string; code: string; event_type: string;
  channels: string[]; is_active: boolean;
};

function NotificationsPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listNotificationRules);
  const save = useServerFn(upsertNotificationRule);
  const del = useServerFn(deleteNotificationRule);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["automation", "notifications", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId } }) as Promise<Row[]>,
  });

  return (
    <DefinitionList<Row>
      title="Notification rules"
      description="Route domain events to channels and templates. Every message the platform sends resolves through this table."
      rows={data}
      isLoading={isLoading}
      columns={[
        { key: "event_type", label: "Event", render: (r) => <code className="text-xs">{r.event_type}</code>, width: "180px" },
        { key: "channels", label: "Channels", render: (r) => (
          <div className="flex gap-1 flex-wrap">
            {(r.channels ?? []).map((c) => <Badge key={c} variant="outline" className="text-xs capitalize">{c}</Badge>)}
          </div>
        ) },
      ]}
      extraFields={[
        { key: "event_type", label: "Event type", type: "text", placeholder: "lead.created" },
        { key: "condition", label: "Condition (rule JSON)", type: "json" },
        { key: "channels", label: "Channels (JSON array)", type: "json", help: 'e.g. ["email","whatsapp","inapp"]' },
        { key: "template_ids", label: "Template IDs (JSON)", type: "json", help: '{ "email":"<uuid>", "whatsapp":"<uuid>" }' },
        { key: "recipients", label: "Recipients (JSON)", type: "json", help: '[{ "type":"role"|"user"|"department"|"expression", "value":"..." }]' },
      ]}
      defaultDraft={{ channels: [], condition: {}, template_ids: {}, recipients: [] }}
      buildPayload={(form) => ({
        id: form.id,
        tenant_id: activeTenantId ?? null,
        code: form.code,
        name: form.name,
        event_type: form.event_type,
        condition: form.condition ?? {},
        channels: (form.channels as ("email" | "sms" | "whatsapp" | "push" | "inapp")[]) ?? [],
        template_ids: form.template_ids ?? {},
        recipients: form.recipients ?? [],
        is_active: form.is_active !== false,
      })}
      onSave={(payload) => save({ data: payload as never })}
      onDelete={(row) => del({ data: { id: row.id } })}
      onRefresh={refetch}
    />
  );
}
