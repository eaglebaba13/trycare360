# Automation Engine (Phase 1.5d)

Central metadata-driven engine. Every business module (CRM, Clinical,
Inventory, Accounts, HR, Franchise, Academy, Marketing) reads from and
writes to these tables — never hardcode workflows, forms, approvals,
notification logic or SLAs in module code.

## Contracts

| Concern              | Table(s)                                           | Server API (`src/lib/api/automation.functions.ts`) |
| -------------------- | -------------------------------------------------- | -------------------------------------------------- |
| Dynamic forms        | `form_definitions`, `form_submissions`             | `listForms`, `upsertForm`, `submitForm`            |
| Rule engine          | `rule_sets`                                        | `listRuleSets`, `upsertRuleSet`                    |
| Workflow definitions | `workflow_definitions`                             | `listWorkflows`, `upsertWorkflow`                  |
| Workflow runtime     | `workflow_runs`, `workflow_steps`                  | `startWorkflowRun`, `retryWorkflowRun`, `listRunSteps` |
| Triggers             | `automation_triggers`                              | `upsertTrigger`, `emitEvent`                       |
| Approvals            | `approval_definitions`, `approval_requests`, `approval_actions` | `submitApproval`, `actOnApproval`     |
| Tasks & subtasks     | `tasks`, `task_comments`                           | `listTasks`, `upsertTask`, `addTaskComment`        |
| SLA                  | `sla_policies`, `sla_events`                       | `upsertSlaPolicy`                                  |
| Templates            | `templates`                                        | `upsertTemplate` (email/whatsapp/sms/push/pdf/invoice/certificate) |
| Notification rules   | `notification_rules`                               | `upsertNotificationRule`                           |

## Emitting an event from a module

Modules never call external APIs, send messages, or hardcode workflows.
They emit a domain event and let the engine route it:

```ts
import { emitEvent } from "@/lib/api/automation.functions";

await useServerFn(emitEvent)({
  data: {
    tenantId,
    eventType: "lead.created",
    payload: { leadId, source: "landing_page" },
    entityRef: { module: "crm", entity: "lead", id: leadId },
  },
});
```

The DB function `emit_automation_event` fans out to every active
`automation_triggers` row matching the event and enqueues a
`workflow_runs` row (`status = queued`). A background worker (to be
wired in a later phase) picks it up and executes the graph.

## Node types recognised by the executor

Registered as masters under `workflow_node_types`:

- `start`, `end`
- `assign` — assign the entity to a user/department/role
- `wait` — delay for N minutes / until timestamp
- `condition` — evaluate a `rule_sets`-style expression
- `action` — invoke an `action_types` handler
- `approval` — create an `approval_requests` row and pause until decided
- `parallel`, `loop`

## Action types

Registered as masters under `action_types`. All actions that talk to a
third party (email, WhatsApp, SMS, push, external HTTP) MUST call
`dispatch()` from `src/lib/integrations/dispatcher.server.ts`. No
module ever `fetch`es a vendor URL directly.

## Rule evaluation shape

```jsonc
{
  "op": "AND",
  "conditions": [
    { "field": "lead.amount", "operator": ">=", "value": 10000 },
    { "op": "OR", "conditions": [
      { "field": "lead.source", "operator": "in", "value": ["meta", "google"] },
      { "field": "lead.priority", "operator": "=", "value": "high" }
    ]}
  ]
}
```

Same shape is reused for `notification_rules.condition`,
`sla_policies.applies_when`, `automation_triggers.event_filter` and
workflow `condition` nodes — one evaluator to build, one place to
change.

## Runtime status

- **Definitions, triggers, manual run enqueue, approvals, tasks, SLA
  policies, templates and notification rules** — fully wired end-to-end.
- **Workflow executor / SLA breach watcher / notification dispatcher** —
  primitives in place (`workflow_runs`, `workflow_steps`,
  `integration_jobs`), background worker to be added when the first
  consuming module needs it. Until then runs stay in `queued` until
  retried or cancelled from the UI.
