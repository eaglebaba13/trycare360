/**
 * Automation Engine — server functions.
 * Covers workflows, workflow runs, triggers, forms, rules,
 * approvals, tasks, SLAs, templates and notification rules.
 * Every business module (CRM, Clinical, Inventory, Accounts, HR,
 * Franchise, Academy, Marketing) reads/writes through here — no
 * module should hardcode workflows, forms or notification logic.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ============================================================
// FORMS
// ============================================================
export const listForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid().nullable().optional(), module: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("form_definitions").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    if (data.module) q = q.eq("module", data.module);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getForm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("form_definitions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const formSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().nullable().optional(),
  entity: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  version: z.number().int().default(1),
  schema: z.record(z.string(), z.unknown()).default({ sections: [] }),
  is_active: z.boolean().default(true),
});

export const upsertForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => formSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("form_definitions")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("form_definitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      formId: z.string().uuid(),
      data: z.record(z.string(), z.unknown()),
      entityRef: z.record(z.string(), z.unknown()).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("form_submissions").insert({
        tenant_id: data.tenantId,
        form_id: data.formId,
        data: data.data,
        entity_ref: data.entityRef ?? null,
        submitted_by: context.userId,
      }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listFormSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), formId: z.string().uuid().optional(), limit: z.number().default(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("form_submissions").select("*").eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.formId) q = q.eq("form_id", data.formId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// WORKFLOWS
// ============================================================
export const listWorkflows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid().nullable().optional(), module: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("workflow_definitions").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    if (data.module) q = q.eq("module", data.module);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getWorkflow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("workflow_definitions").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const workflowSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  trigger_type: z.enum(["event", "schedule", "webhook", "manual", "api", "db_change"]).default("manual"),
  trigger_config: z.record(z.string(), z.unknown()).default({}),
  graph: z.record(z.string(), z.unknown()).default({ nodes: [], edges: [] }),
  version: z.number().int().default(1),
  is_active: z.boolean().default(true),
});

export const upsertWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => workflowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("workflow_definitions")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWorkflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("workflow_definitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Workflow runs ----------
export const listWorkflowRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      workflowId: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.number().default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("workflow_runs").select("*, workflow:workflow_definitions(name,code)")
      .eq("tenant_id", data.tenantId).order("started_at", { ascending: false }).limit(data.limit);
    if (data.workflowId) q = q.eq("workflow_id", data.workflowId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const startWorkflowRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      workflowId: z.string().uuid(),
      context: z.record(z.string(), z.unknown()).default({}),
      entityRef: z.record(z.string(), z.unknown()).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.rpc("start_workflow_run", {
      _workflow_id: data.workflowId,
      _context: data.context,
      _entity_ref: data.entityRef ?? null,
    });
    if (error) throw new Error(error.message);
    return { runId: row };
  });

export const retryWorkflowRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("workflow_runs")
      .update({ status: "queued", error: null, finished_at: null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelWorkflowRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("workflow_runs")
      .update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRunSteps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.from("workflow_steps")
      .select("*").eq("run_id", data.runId).order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// TRIGGERS
// ============================================================
export const listTriggers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("automation_triggers")
      .select("*, workflow:workflow_definitions(name,code)").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const triggerSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  trigger_type: z.enum(["event", "schedule", "webhook", "manual", "api", "db_change"]),
  event_type: z.string().nullable().optional(),
  event_filter: z.record(z.string(), z.unknown()).default({}),
  schedule_cron: z.string().nullable().optional(),
  workflow_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const upsertTrigger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => triggerSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("automation_triggers")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTrigger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("automation_triggers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const emitEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      eventType: z.string(),
      payload: z.record(z.string(), z.unknown()).default({}),
      entityRef: z.record(z.string(), z.unknown()).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: fired, error } = await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenantId,
      _event_type: data.eventType,
      _payload: data.payload,
      _entity_ref: data.entityRef ?? null,
    });
    if (error) throw new Error(error.message);
    return { runsCreated: fired ?? 0 };
  });

// ============================================================
// RULES
// ============================================================
export const listRuleSets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("rule_sets").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  definition: z.record(z.string(), z.unknown()).default({ op: "AND", conditions: [] }),
  is_active: z.boolean().default(true),
});

export const upsertRuleSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ruleSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("rule_sets")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteRuleSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("rule_sets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// APPROVALS
// ============================================================
export const listApprovalDefinitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("approval_definitions").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const approvalDefSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().nullable().optional(),
  entity: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  levels: z.array(z.record(z.string(), z.unknown())).default([]),
  is_active: z.boolean().default(true),
});

export const upsertApprovalDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => approvalDefSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("approval_definitions")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteApprovalDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("approval_definitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listApprovalRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      status: z.string().optional(),
      mine: z.boolean().default(false),
      limit: z.number().default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("approval_requests")
      .select("*, definition:approval_definitions(name,code,levels)")
      .eq("tenant_id", data.tenantId).order("created_at", { ascending: false }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.mine) q = q.eq("submitted_by", context.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const submitApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      definitionId: z.string().uuid(),
      payload: z.record(z.string(), z.unknown()).default({}),
      entityRef: z.record(z.string(), z.unknown()).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("approval_requests").insert({
      tenant_id: data.tenantId,
      definition_id: data.definitionId,
      payload: data.payload,
      entity_ref: data.entityRef ?? null,
      submitted_by: context.userId,
      status: "pending",
      current_level: 1,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const actOnApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      requestId: z.string().uuid(),
      action: z.enum(["approve", "reject", "delegate", "comment", "escalate", "resubmit"]),
      comment: z.string().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: req, error: reqErr } = await context.supabase
      .from("approval_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("approval_not_found");
    const r = req as { id: string; current_level: number; status: string; definition_id: string };

    await context.supabase.from("approval_actions").insert({
      request_id: data.requestId,
      level: r.current_level,
      actor_id: context.userId,
      action: data.action,
      comment: data.comment ?? null,
      meta: data.meta ?? null,
    });

    // Load definition to advance levels
    const { data: def } = await context.supabase
      .from("approval_definitions").select("levels").eq("id", r.definition_id).maybeSingle();
    const levels = ((def as { levels?: unknown[] } | null)?.levels ?? []) as unknown[];
    const totalLevels = levels.length || 1;

    let update: Record<string, unknown> = {};
    if (data.action === "approve") {
      if (r.current_level >= totalLevels) {
        update = { status: "approved", decided_at: new Date().toISOString() };
      } else {
        update = { current_level: r.current_level + 1 };
      }
    } else if (data.action === "reject") {
      update = { status: "rejected", decided_at: new Date().toISOString(), reason: data.comment ?? null };
    } else if (data.action === "escalate") {
      update = { status: "escalated" };
    } else if (data.action === "resubmit") {
      update = { status: "pending", current_level: 1, decided_at: null };
    }

    if (Object.keys(update).length) {
      const { error } = await context.supabase.from("approval_requests").update(update).eq("id", data.requestId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listApprovalActions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("approval_actions").select("*").eq("request_id", data.requestId).order("acted_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// TASKS
// ============================================================
export const listTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      status: z.string().optional(),
      assigneeId: z.string().uuid().optional(),
      mine: z.boolean().default(false),
      parentTaskId: z.string().uuid().nullable().optional(),
      limit: z.number().default(200),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("tasks").select("*")
      .eq("tenant_id", data.tenantId).order("due_at", { ascending: true, nullsFirst: false }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.assigneeId) q = q.eq("assignee_id", data.assigneeId);
    if (data.mine) q = q.eq("assignee_id", context.userId);
    if (data.parentTaskId === null) q = q.is("parent_task_id", null);
    else if (data.parentTaskId) q = q.eq("parent_task_id", data.parentTaskId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const taskSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  parent_task_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  entity_ref: z.record(z.string(), z.unknown()).nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  department_id: z.string().uuid().nullable().optional(),
  org_unit_id: z.string().uuid().nullable().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  status: z.enum(["open", "in_progress", "blocked", "completed", "cancelled"]).default("open"),
  due_at: z.string().nullable().optional(),
  reminder_at: z.string().nullable().optional(),
  checklist: z.array(z.record(z.string(), z.unknown())).default([]),
  recurrence: z.record(z.string(), z.unknown()).nullable().optional(),
  source: z.string().nullable().optional(),
  source_ref: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskSchema.parse(d))
  .handler(async ({ context, data }) => {
    const payload: Record<string, unknown> = { ...data };
    if (data.status === "completed" && !payload.completed_at) payload.completed_at = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("tasks")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(payload as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ taskId: z.string().uuid(), body: z.string().min(1) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("task_comments")
      .insert({ task_id: data.taskId, body: data.body, author_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// SLA
// ============================================================
export const listSlaPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("sla_policies").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const slaSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  module: z.string().nullable().optional(),
  entity: z.string().nullable().optional(),
  response_minutes: z.number().int().nullable().optional(),
  resolution_minutes: z.number().int().nullable().optional(),
  business_hours: z.record(z.string(), z.unknown()).default({}),
  escalation: z.array(z.record(z.string(), z.unknown())).default([]),
  breach_notify: z.record(z.string(), z.unknown()).default({}),
  applies_when: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const upsertSlaPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => slaSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("sla_policies")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSlaPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sla_policies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// TEMPLATES
// ============================================================
export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid().nullable().optional(), type: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("templates").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    if (data.type) q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["email", "whatsapp", "sms", "push", "inapp", "pdf", "invoice", "certificate"]),
  subject: z.string().nullable().optional(),
  body: z.string().min(1),
  variables: z.array(z.record(z.string(), z.unknown())).default([]),
  provider_template_id: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()).default({}),
  is_active: z.boolean().default(true),
});

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => templateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("templates")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// NOTIFICATION RULES
// ============================================================
export const listNotificationRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("notification_rules").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const notifRuleSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().nullable().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  event_type: z.string().min(1),
  condition: z.record(z.string(), z.unknown()).default({}),
  channels: z.array(z.enum(["email", "sms", "whatsapp", "push", "inapp"])).default([]),
  template_ids: z.record(z.string(), z.unknown()).default({}),
  recipients: z.array(z.record(z.string(), z.unknown())).default([]),
  is_active: z.boolean().default(true),
});

export const upsertNotificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => notifRuleSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("notification_rules")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNotificationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notification_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// DASHBOARD
// ============================================================
export const automationDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [wfCount, running, queued, failed, waiting, completed24, tasksOpen, tasksOverdue, approvalsPending, slaBreached] = await Promise.all([
      s.from("workflow_definitions").select("id", { count: "exact", head: true }).or(`tenant_id.eq.${t},tenant_id.is.null`),
      s.from("workflow_runs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "running"),
      s.from("workflow_runs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "queued"),
      s.from("workflow_runs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "failed"),
      s.from("workflow_runs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "waiting"),
      s.from("workflow_runs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "completed").gte("finished_at", since),
      s.from("tasks").select("id", { count: "exact", head: true }).eq("tenant_id", t).in("status", ["open", "in_progress"]),
      s.from("tasks").select("id", { count: "exact", head: true }).eq("tenant_id", t).in("status", ["open", "in_progress"]).lt("due_at", new Date().toISOString()),
      s.from("approval_requests").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "pending"),
      s.from("sla_events").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "breached"),
    ]);
    return {
      workflows: wfCount.count ?? 0,
      runs: {
        running: running.count ?? 0,
        queued: queued.count ?? 0,
        failed: failed.count ?? 0,
        waiting: waiting.count ?? 0,
        completed24h: completed24.count ?? 0,
      },
      tasks: { open: tasksOpen.count ?? 0, overdue: tasksOverdue.count ?? 0 },
      approvalsPending: approvalsPending.count ?? 0,
      slaBreached: slaBreached.count ?? 0,
    };
  });
