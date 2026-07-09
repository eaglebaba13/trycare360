/**
 * CMS Enhancement — Phase 2.1b server functions.
 * Templates, sections, page↔form binding, publishing workflow (draft/in_review/
 * scheduled/published/archived) + rollback, SEO auditor, A/B experiments,
 * media folders, marketing tracking analytics.
 *
 * All admin fns use requireSupabaseAuth. Public writes live in
 * src/routes/api/public/cms.* — those bypass auth and validate input.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// biome-ignore lint/suspicious/noExplicitAny: escape from deep PostgREST generics
type Sb = any;

const tenantId = z.string().uuid();
const uuid = z.string().uuid();

// ============ TEMPLATES ============

export const listPageTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("cms_page_templates")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name");
  return data ?? [];
});

export const adminListTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as Sb)
      .from("cms_page_templates")
      .select("*")
      .order("category")
      .order("name");
    return data ?? [];
  });

export const adminUpsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        slug: z.string().min(1),
        name: z.string().min(1),
        category: z.string().optional(),
        vertical: z.string().optional(),
        description: z.string().optional(),
        thumbnail_url: z.string().url().optional().nullable(),
        blocks: z.array(z.unknown()).default([]),
        default_seo: z.record(z.string(), z.unknown()).default({}),
        default_schema: z.record(z.string(), z.unknown()).default({}),
        default_tracking: z.record(z.string(), z.unknown()).default({}),
        suggested_forms: z.array(z.string()).default([]),
        cta_config: z.record(z.string(), z.unknown()).default({}),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as Sb)
      .from("cms_page_templates")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "slug" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as Sb).from("cms_page_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Create a page from a template (a "campaign page" is a normal page with template_id + utm defaults)
export const adminCreatePageFromTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: tenantId,
        template_id: uuid,
        title: z.string().min(1),
        slug: z.string().min(1),
        path: z.string().min(1),
        campaign_id: z.string().optional(),
        utm_defaults: z.record(z.string(), z.string()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: tpl, error: tplErr } = await sb
      .from("cms_page_templates")
      .select("*")
      .eq("id", data.template_id)
      .single();
    if (tplErr || !tpl) throw new Error("Template not found");
    const { data: page, error } = await sb
      .from("cms_pages")
      .insert({
        tenant_id: data.tenant_id,
        title: data.title,
        slug: data.slug,
        path: data.path,
        template: tpl.slug,
        template_id: tpl.id,
        blocks: tpl.blocks,
        seo: tpl.default_seo,
        tracking: tpl.default_tracking,
        campaign_id: data.campaign_id ?? null,
        utm_defaults: data.utm_defaults ?? {},
        goal_event: (tpl.default_tracking as Record<string, unknown>)?.goal_event ?? null,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return page;
  });

// ============ SECTIONS ============

export const adminListSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as Sb)
      .from("cms_section_library")
      .select("*")
      .order("category")
      .order("name");
    return data ?? [];
  });

export const adminSaveSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        tenant_id: tenantId.optional(),
        name: z.string().min(1),
        category: z.string().optional(),
        description: z.string().optional(),
        thumbnail_url: z.string().url().optional().nullable(),
        block: z.record(z.string(), z.unknown()),
        is_global: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as Sb)
      .from("cms_section_library")
      .upsert({ ...data, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as Sb).from("cms_section_library").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PAGE ↔ FORMS ============

export const listPageFormsPublic = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ page_id: uuid }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows } = await sb
      .from("cms_page_forms")
      .select("id, form_id, block_id, is_primary, conversion_event, workflow_id, form:form_definitions(id, code, name, schema)")
      .eq("page_id", data.page_id);
    return rows ?? [];
  });

export const adminListPageForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await (context.supabase as Sb)
      .from("cms_page_forms")
      .select("*, page:cms_pages(id,title,path), form:form_definitions(id,code,name)")
      .eq("tenant_id", data.tenant_id);
    return rows ?? [];
  });

export const adminAttachForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: tenantId,
        page_id: uuid,
        form_id: uuid,
        block_id: z.string().optional(),
        workflow_id: uuid.optional(),
        is_primary: z.boolean().default(false),
        conversion_event: z.string().default("lead_submit"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as Sb).from("cms_page_forms").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDetachForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await (context.supabase as Sb).from("cms_page_forms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PUBLISHING WORKFLOW ============

export const adminGetPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: page } = await (context.supabase as Sb).from("cms_pages").select("*").eq("id", data.id).maybeSingle();
    return page;
  });

export const adminSavePageDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid,
        tenant_id: tenantId,
        patch: z.record(z.string(), z.unknown()),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await (context.supabase as Sb)
      .from("cms_pages")
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("tenant_id", data.tenant_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

async function logPublish(
  sb: Sb,
  args: { tenant_id: string; page_id: string; action: string; from: string | null; to: string | null; actor: string; note?: string },
) {
  const { data: page } = await sb.from("cms_pages").select("*").eq("id", args.page_id).single();
  await sb.from("cms_page_publish_log").insert({
    tenant_id: args.tenant_id,
    page_id: args.page_id,
    action: args.action,
    from_status: args.from,
    to_status: args.to,
    snapshot: page,
    actor: args.actor,
    note: args.note ?? null,
  });
}

const transitionSchema = z.object({
  id: uuid,
  tenant_id: tenantId,
  target: z.enum(["draft", "in_review", "scheduled", "published", "archived"]),
  scheduled_at: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const adminTransitionPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => transitionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: existing } = await sb.from("cms_pages").select("status").eq("id", data.id).single();
    const patch: Record<string, unknown> = { status: data.target };
    if (data.target === "published") patch.published_at = new Date().toISOString();
    if (data.target === "scheduled") patch.scheduled_at = data.scheduled_at ?? new Date().toISOString();
    const { data: row, error } = await sb.from("cms_pages").update(patch).eq("id", data.id).select().single();
    if (error) throw new Error(error.message);
    await logPublish(sb, {
      tenant_id: data.tenant_id,
      page_id: data.id,
      action: data.target,
      from: existing?.status ?? null,
      to: data.target,
      actor: context.userId,
      note: data.note,
    });
    return row;
  });

export const adminListPublishLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page_id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await (context.supabase as Sb)
      .from("cms_page_publish_log")
      .select("*")
      .eq("page_id", data.page_id)
      .order("created_at", { ascending: false })
      .limit(100);
    return rows ?? [];
  });

export const adminRollbackPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ log_id: uuid, tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: log } = await sb.from("cms_page_publish_log").select("*").eq("id", data.log_id).single();
    if (!log) throw new Error("Snapshot not found");
    const snap = log.snapshot as Record<string, unknown>;
    const patch = {
      blocks: snap.blocks,
      seo: snap.seo,
      tracking: snap.tracking,
      title: snap.title,
      og_image_url: snap.og_image_url,
      updated_at: new Date().toISOString(),
    };
    const { data: row, error } = await sb.from("cms_pages").update(patch).eq("id", log.page_id).select().single();
    if (error) throw new Error(error.message);
    await logPublish(sb, {
      tenant_id: data.tenant_id,
      page_id: log.page_id,
      action: "rollback",
      from: null,
      to: (row as Record<string, unknown>).status as string,
      actor: context.userId,
      note: `Restored from snapshot ${data.log_id}`,
    });
    return row;
  });

// ============ SEO AUDIT ============

type SeoIssue = { level: "error" | "warn" | "info"; code: string; message: string };

function auditPageContent(page: Record<string, unknown>): { score: number; issues: SeoIssue[] } {
  const issues: SeoIssue[] = [];
  const title = String(page.title ?? "");
  const seo = (page.seo ?? {}) as Record<string, unknown>;
  const description = String(seo.description ?? "");
  const blocks = (page.blocks ?? []) as Array<{ type: string; data: Record<string, unknown> }>;

  if (!title || title.length < 5) issues.push({ level: "error", code: "title_missing", message: "Page title missing or too short" });
  if (title.length > 60) issues.push({ level: "warn", code: "title_long", message: `Title >60 chars (${title.length})` });
  if (!description) issues.push({ level: "error", code: "description_missing", message: "Meta description missing" });
  if (description && (description.length < 50 || description.length > 160))
    issues.push({ level: "warn", code: "description_length", message: `Description length ${description.length} — aim for 50–160` });
  if (!page.og_image_url) issues.push({ level: "info", code: "og_missing", message: "No social share image (og:image)" });
  if (!page.path) issues.push({ level: "error", code: "path_missing", message: "Canonical path missing" });
  const hasH1 = blocks.some((b) => b.type === "hero" || b.type === "rich_text");
  if (!hasH1) issues.push({ level: "warn", code: "h1_missing", message: "No hero/rich-text block; page may lack an H1" });
  for (const b of blocks) {
    if ((b.type === "hero" || b.type === "media") && b.data && "image_url" in b.data && !("alt" in b.data)) {
      issues.push({ level: "warn", code: "alt_missing", message: `Image block "${b.type}" without alt text` });
    }
  }

  const weight = { error: 25, warn: 10, info: 3 };
  const score = Math.max(0, 100 - issues.reduce((n, i) => n + weight[i.level], 0));
  return { score, issues };
}

export const adminAuditPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ page_id: uuid, tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: page } = await sb.from("cms_pages").select("*").eq("id", data.page_id).single();
    if (!page) throw new Error("Page not found");
    const { score, issues } = auditPageContent(page);
    await sb.from("cms_seo_audits").insert({
      tenant_id: data.tenant_id,
      page_id: data.page_id,
      score,
      issues,
      checked_by: context.userId,
    });
    await sb.from("cms_pages").update({ seo_score: score }).eq("id", data.page_id);
    return { score, issues };
  });

export const adminSeoDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: pages } = await sb
      .from("cms_pages")
      .select("id, title, path, status, seo_score, updated_at")
      .eq("tenant_id", data.tenant_id)
      .order("updated_at", { ascending: false });
    return pages ?? [];
  });

// ============ A/B EXPERIMENTS ============

export const adminListExperiments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: rows } = await sb
      .from("cms_ab_experiments")
      .select("*, page:cms_pages(id,title,path)")
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false });
    const withStats = await Promise.all(
      (rows ?? []).map(async (r: Record<string, unknown>) => {
        const { data: stats } = await sb
          .from("cms_ab_assignments")
          .select("variant, converted")
          .eq("experiment_id", r.id);
        const a = { views: 0, conv: 0 };
        const b = { views: 0, conv: 0 };
        for (const s of stats ?? []) {
          const bucket = s.variant === "A" ? a : b;
          bucket.views++;
          if (s.converted) bucket.conv++;
        }
        return { ...r, stats: { a, b } };
      }),
    );
    return withStats;
  });

export const adminUpsertExperiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        tenant_id: tenantId,
        page_id: uuid,
        name: z.string().min(1),
        variant_a: z.array(z.unknown()),
        variant_b: z.array(z.unknown()),
        traffic_split: z.number().int().min(0).max(100).default(50),
        goal_event: z.string().default("lead_submit"),
        status: z.enum(["draft", "running", "paused", "completed"]).default("draft"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const patch: Record<string, unknown> = { ...data };
    if (data.status === "running" && !data.id) patch.started_at = new Date().toISOString();
    if (data.status === "completed") patch.ended_at = new Date().toISOString();
    const { data: row, error } = await sb.from("cms_ab_experiments").upsert(patch).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminPromoteWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ experiment_id: uuid, winner: z.enum(["A", "B"]) }).parse(d))
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const { data: exp } = await sb.from("cms_ab_experiments").select("*").eq("id", data.experiment_id).single();
    if (!exp) throw new Error("Experiment not found");
    const blocks = data.winner === "A" ? exp.variant_a : exp.variant_b;
    await sb.from("cms_pages").update({ blocks, updated_at: new Date().toISOString() }).eq("id", exp.page_id);
    await sb
      .from("cms_ab_experiments")
      .update({ status: "completed", winner: data.winner, ended_at: new Date().toISOString() })
      .eq("id", data.experiment_id);
    return { ok: true };
  });

// ============ MEDIA FOLDERS ============

export const adminListFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenant_id: tenantId }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await (context.supabase as Sb)
      .from("cms_media_folders")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("path");
    return rows ?? [];
  });

export const adminCreateFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: tenantId, parent_id: uuid.optional().nullable(), name: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    let path = `/${data.name}`;
    if (data.parent_id) {
      const { data: parent } = await sb.from("cms_media_folders").select("path").eq("id", data.parent_id).single();
      if (parent) path = `${parent.path}/${data.name}`;
    }
    const { data: row, error } = await sb
      .from("cms_media_folders")
      .insert({ tenant_id: data.tenant_id, parent_id: data.parent_id ?? null, name: data.name, path })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============ TRACKING / ANALYTICS ============

export const adminPageAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: tenantId, page_id: uuid.optional(), days: z.number().int().min(1).max(90).default(30) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const sb = context.supabase as Sb;
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    let q = sb
      .from("cms_tracking_events")
      .select("event_type, utm_source, utm_medium, utm_campaign, occurred_at, page_id")
      .eq("tenant_id", data.tenant_id)
      .gte("occurred_at", since)
      .limit(5000);
    if (data.page_id) q = q.eq("page_id", data.page_id);
    const { data: events } = await q;
    const totals = { page_view: 0, lead_submit: 0, cta_click: 0 } as Record<string, number>;
    const bySource: Record<string, number> = {};
    const byCampaign: Record<string, number> = {};
    const byPage: Record<string, { views: number; leads: number }> = {};
    for (const e of events ?? []) {
      totals[e.event_type] = (totals[e.event_type] ?? 0) + 1;
      if (e.utm_source) bySource[e.utm_source] = (bySource[e.utm_source] ?? 0) + 1;
      if (e.utm_campaign) byCampaign[e.utm_campaign] = (byCampaign[e.utm_campaign] ?? 0) + 1;
      if (e.page_id) {
        const bucket = (byPage[e.page_id] ??= { views: 0, leads: 0 });
        if (e.event_type === "page_view") bucket.views++;
        if (e.event_type === "lead_submit") bucket.leads++;
      }
    }
    return { totals, bySource, byCampaign, byPage, count: events?.length ?? 0 };
  });
