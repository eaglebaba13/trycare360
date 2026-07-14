/**
 * Phase 1.5e — Data, Document & Analytics Foundation server functions.
 *
 * Every future business module (CRM, Clinical, Inventory, Accounts, HR,
 * Franchise, Academy, Marketing) MUST consume these primitives — do NOT
 * roll a per-module timeline, notes, documents, reports, widgets or search.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sanitizeActorPayload } from "@/lib/security/superadmin-stealth.server";

// ============================================================
// TIMELINE
// ============================================================
export const listTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      eventType: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("timeline_events")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("ts", { ascending: false })
      .limit(data.limit);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    if (data.entityId) q = q.eq("entity_id", data.entityId);
    if (data.eventType) q = q.eq("event_type", data.eventType);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return sanitizeActorPayload(context.supabase, rows ?? [], context.userId);
  });

export const logTimelineEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      eventType: z.string().min(1),
      title: z.string().min(1),
      body: z.string().nullable().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: id, error } = await context.supabase.rpc("log_timeline_event", {
      _tenant_id: data.tenantId,
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      _event_type: data.eventType,
      _title: data.title,
      _body: data.body ?? undefined,
      _meta: (data.meta ?? {}) as never,

    });
    if (error) throw new Error(error.message);
    return { id };
  });

// ============================================================
// DOCUMENTS
// ============================================================
export const listDocumentFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("document_folders").select("*")
      .eq("tenant_id", data.tenantId).order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDocumentFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      parent_id: z.string().uuid().nullable().optional(),
      name: z.string().min(1),
      category: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("document_folders")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDocumentFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("document_folders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      folderId: z.string().uuid().nullable().optional(),
      category: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(200),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("documents").select("*")
      .eq("tenant_id", data.tenantId)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (data.folderId !== undefined && data.folderId !== null) q = q.eq("folder_id", data.folderId);
    if (data.category) q = q.eq("category", data.category);
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    if (data.entityId) q = q.eq("entity_id", data.entityId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      folder_id: z.string().uuid().nullable().optional(),
      file_id: z.string().uuid().nullable().optional(),
      name: z.string().min(1),
      category: z.string().nullable().optional(),
      visibility: z.enum(["private", "tenant", "public"]).default("private"),
      entity_type: z.string().nullable().optional(),
      entity_id: z.string().nullable().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("documents")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDocumentTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("document_tags").select("*")
      .eq("tenant_id", data.tenantId).order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDocumentTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      name: z.string().min(1),
      color: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("document_tags")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ============================================================
// NOTES
// ============================================================
export const listNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      pinnedOnly: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("notes").select("*")
      .eq("tenant_id", data.tenantId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (data.entityType) q = q.eq("entity_type", data.entityType);
    if (data.entityId) q = q.eq("entity_id", data.entityId);
    if (data.pinnedOnly) q = q.eq("pinned", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      entity_type: z.string().min(1),
      entity_id: z.string().min(1),
      body: z.string().min(1),
      visibility: z.enum(["public", "private"]).default("public"),
      pinned: z.boolean().default(false),
      mentions: z.array(z.string().uuid()).default([]),
      attachments: z.array(z.record(z.string(), z.unknown())).default([]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("notes")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// SEARCH — the universal index & global search
// ============================================================
export const searchGlobal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      query: z.string().min(1),
      entityTypes: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(100).default(25),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.rpc("search_global", {
      _tenant_id: data.tenantId,
      _query: data.query,
      _entity_types: data.entityTypes ?? undefined,
      _limit: data.limit,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const indexSearchEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      entityType: z.string(),
      entityId: z.string(),
      title: z.string(),
      subtitle: z.string().nullable().optional(),
      body: z.string().nullable().optional(),
      keywords: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("index_search_entity", {
      _tenant_id: data.tenantId,
      _entity_type: data.entityType,
      _entity_id: data.entityId,
      _title: data.title,
      _subtitle: data.subtitle ?? undefined,
      _body: data.body ?? undefined,
      _keywords: data.keywords ?? undefined,
      _url: data.url ?? undefined,

      _meta: (data.meta ?? {}) as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchIndexSample = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("search_index")
      .select("entity_type, entity_id, title, subtitle, url, updated_at")
      .eq("tenant_id", data.tenantId)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// WIDGETS
// ============================================================
export const listDashboardLayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("dashboard_layouts").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    else q = q.is("tenant_id", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertDashboardLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid().nullable().optional(),
      code: z.string().min(1),
      name: z.string().min(1),
      scope: z.enum(["role", "user", "tenant"]).default("role"),
      role_code: z.string().nullable().optional(),
      user_id: z.string().uuid().nullable().optional(),
      is_default: z.boolean().default(false),
      is_active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("dashboard_layouts")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDashboardLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("dashboard_layouts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWidgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ layoutId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.from("dashboard_widgets")
      .select("*").eq("layout_id", data.layoutId).order("display_order");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      layout_id: z.string().uuid(),
      widget_type: z.string().min(1),
      title: z.string().min(1),
      config: z.record(z.string(), z.unknown()).default({}),
      position: z.record(z.string(), z.unknown()).default({}),
      display_order: z.number().int().default(0),
      is_active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("dashboard_widgets")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("dashboard_widgets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// REPORTS
// ============================================================
export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("report_definitions").select("*").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid().nullable().optional(),
      code: z.string().min(1),
      name: z.string().min(1),
      module: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      data_source: z.string().min(1),
      columns: z.array(z.record(z.string(), z.unknown())).default([]),
      filters: z.array(z.record(z.string(), z.unknown())).default([]),
      group_by: z.array(z.string()).default([]),
      sort: z.array(z.record(z.string(), z.unknown())).default([]),
      layout: z.record(z.string(), z.unknown()).default({}),
      is_active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("report_definitions")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("report_definitions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReportRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      reportId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("report_runs").select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.reportId) q = q.eq("report_id", data.reportId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const queueReportRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      reportId: z.string().uuid(),
      format: z.enum(["pdf", "excel", "csv", "json"]).default("pdf"),
      params: z.record(z.string(), z.unknown()).default({}),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase.from("report_runs").insert({
      tenant_id: data.tenantId,
      report_id: data.reportId,
      status: "queued",
      format: data.format,
      params: data.params as never,
      requested_by: context.userId,
    }).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listReportSchedules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.from("report_schedules")
      .select("*").eq("tenant_id", data.tenantId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertReportSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      report_id: z.string().uuid(),
      cron: z.string().min(1),
      format: z.enum(["pdf", "excel", "csv", "json"]).default("pdf"),
      recipients: z.array(z.record(z.string(), z.unknown())).default([]),
      params: z.record(z.string(), z.unknown()).default({}),
      is_active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("report_schedules")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ============================================================
// ANALYTICS
// ============================================================
export const listKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid().nullable().optional(),
      category: z.string().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("analytics_kpis").select("*").order("category").order("name");
    if (data.tenantId) q = q.or(`tenant_id.eq.${data.tenantId},tenant_id.is.null`);
    else q = q.is("tenant_id", null);
    if (data.category) q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertKpi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid().nullable().optional(),
      code: z.string().min(1),
      name: z.string().min(1),
      category: z.string().min(1),
      unit: z.string().nullable().optional(),
      formula: z.string().nullable().optional(),
      data_source: z.string().nullable().optional(),
      target: z.number().nullable().optional(),
      direction: z.enum(["higher", "lower"]).default("higher"),
      is_active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("analytics_kpis")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any).select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteKpi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("analytics_kpis").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listKpiSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      kpiCode: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("analytics_snapshots").select("*")
      .eq("tenant_id", data.tenantId)
      .order("period_start", { ascending: false })
      .limit(data.limit);
    if (data.kpiCode) q = q.eq("kpi_code", data.kpiCode);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// AUDIT VIEWER (existing tables audit_logs / activity_logs / ip_logs / device_logs)
// ============================================================
export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid().nullable().optional(),
      actorId: z.string().uuid().optional(),
      tableName: z.string().optional(),
      rowId: z.string().optional(),
      action: z.string().optional(),
      q: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("audit_logs").select("*")
      .order("ts", { ascending: false }).limit(data.limit);
    if (data.tenantId) q = q.eq("tenant_id", data.tenantId);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    if (data.tableName) q = q.eq("table_name", data.tableName);
    if (data.rowId) q = q.eq("row_id", data.rowId);
    if (data.action) q = q.eq("action", data.action);
    if (data.q) q = q.or(`table_name.ilike.%${data.q}%,action.ilike.%${data.q}%,row_id.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const withIp = (rows ?? []).map((r) => ({ ...r, ip: r.ip == null ? null : String(r.ip) }));
    return sanitizeActorPayload(context.supabase, withIp, context.userId);
  });


export const listActivityLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid().nullable().optional(),
      actorId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("activity_logs").select("*")
      .order("ts", { ascending: false }).limit(data.limit);
    if (data.tenantId) q = q.eq("tenant_id", data.tenantId);
    if (data.actorId) q = q.eq("actor_id", data.actorId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return sanitizeActorPayload(context.supabase, rows ?? [], context.userId);
  });

export const listIpLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("ip_logs").select("*")
      .order("ts", { ascending: false }).limit(data.limit);
    if (data.userId) q = q.eq("user_id", data.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ ...r, ip: r.ip == null ? null : String(r.ip) }));

  });

export const listDeviceLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      userId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("device_logs").select("*")
      .order("ts", { ascending: false }).limit(data.limit);
    if (data.userId) q = q.eq("user_id", data.userId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// FILE STORAGE (framework metadata; buckets managed by storage helpers)
// ============================================================
export const listFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tenantId: z.string().uuid(),
      kind: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(200),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("files").select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================
// DATA PORTAL DASHBOARD
// ============================================================
export const dataFoundationDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const tenant = data.tenantId;
    // biome-ignore lint/suspicious/noExplicitAny: dynamic-table counts
    const sb = context.supabase as any;
    const counts = async (table: string, tenantScoped = true) => {
      let q = sb.from(table).select("*", { count: "exact", head: true });
      if (tenantScoped) q = q.eq("tenant_id", tenant);
      const { count, error } = await q;
      if (error) throw new Error(`${table}: ${error.message}`);
      return (count ?? 0) as number;
    };

    const [timeline, documents, notes, indexed, layouts, reports, kpis, snapshots, audit24h] =
      await Promise.all([
        counts("timeline_events"),
        counts("documents"),
        counts("notes"),
        counts("search_index"),
        (async () => {
          const { count } = await sb.from("dashboard_layouts")
            .select("*", { count: "exact", head: true })
            .or(`tenant_id.eq.${tenant},tenant_id.is.null`);
          return (count ?? 0) as number;
        })(),
        (async () => {
          const { count } = await sb.from("report_definitions")
            .select("*", { count: "exact", head: true })
            .or(`tenant_id.eq.${tenant},tenant_id.is.null`);
          return (count ?? 0) as number;
        })(),
        (async () => {
          const { count } = await sb.from("analytics_kpis")
            .select("*", { count: "exact", head: true })
            .or(`tenant_id.eq.${tenant},tenant_id.is.null`);
          return (count ?? 0) as number;
        })(),
        counts("analytics_snapshots"),
        (async () => {
          const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
          const { count } = await sb.from("audit_logs")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", tenant).gte("ts", since);
          return (count ?? 0) as number;
        })(),
      ]);
    return { timeline, documents, notes, indexed, layouts, reports, kpis, snapshots, audit24h };
  });

