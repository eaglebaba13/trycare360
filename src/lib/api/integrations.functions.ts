/**
 * Integration Center — server functions.
 * All UI actions go through here. Callers never touch DB directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { dispatch } from "@/lib/integrations/dispatcher.server";

// ---------- Providers ----------
export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integration_providers")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Connections ----------
export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("integration_connections")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const connSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  provider_code: z.string(),
  label: z.string().min(1),
  status: z.enum(["pending", "connected", "error", "disconnected"]).optional(),
  credentials_ref: z.string().nullable().optional(),
  config: z.record(z.string(), z.unknown()).default({}),
  scopes: z.array(z.string()).default([]),
  is_active: z.boolean().optional(),
});

export const upsertConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => connSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("integration_connections")
      // biome-ignore lint/suspicious/noExplicitAny: generic upsert
      .upsert(data as any)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("integration_connections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: conn } = await context.supabase
      .from("integration_connections")
      .select("id, tenant_id, provider_code")
      .eq("id", data.id)
      .maybeSingle();
    if (!conn) throw new Error("connection_not_found");
    const c = conn as { id: string; tenant_id: string; provider_code: string };
    const result = await dispatch({
      supabase: context.supabase,
      tenantId: c.tenant_id,
      providerCode: c.provider_code,
      action: "ping",
      payload: { probe: true },
    });
    const newStatus = result.ok ? "connected" : "error";
    await context.supabase
      .from("integration_connections")
      .update({ status: newStatus, last_sync_at: new Date().toISOString(), last_error: result.ok ? null : "error" in result ? result.error : null })
      .eq("id", data.id);
    // Serialize `result` as JSON-safe.
    return JSON.parse(JSON.stringify(result)) as { ok: boolean; latencyMs: number; error?: string; result?: unknown };
  });

// ---------- Webhooks ----------
export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("integration_webhooks")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const webhookSchema = z.object({
  id: z.string().uuid().optional(),
  tenant_id: z.string().uuid(),
  connection_id: z.string().uuid().nullable().optional(),
  url_slug: z
    .string()
    .min(4)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  event_types: z.array(z.string()).default([]),
  secret_ref: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const upsertWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => webhookSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("integration_webhooks")
      .upsert(data)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("integration_webhooks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), webhookId: z.string().uuid().optional(), limit: z.number().default(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("integration_webhook_events")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.webhookId) q = q.eq("webhook_id", data.webhookId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Jobs ----------
export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), status: z.string().optional(), limit: z.number().default(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("integration_jobs")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const retryJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("integration_jobs")
      .update({ status: "pending", next_run_at: new Date().toISOString(), last_error: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- API logs ----------
export const listApiLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), providerCode: z.string().optional(), limit: z.number().default(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("integration_api_logs")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.providerCode) q = q.eq("provider_code", data.providerCode);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- Dashboard KPIs ----------
export const integrationDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const s = context.supabase;
    const t = data.tenantId;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [conns, pending, failed, dead, events24, calls24] = await Promise.all([
      s.from("integration_connections").select("status", { count: "exact", head: false }).eq("tenant_id", t),
      s.from("integration_jobs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "pending"),
      s.from("integration_jobs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "failed"),
      s.from("integration_jobs").select("id", { count: "exact", head: true }).eq("tenant_id", t).eq("status", "dead"),
      s.from("integration_webhook_events").select("id", { count: "exact", head: true }).eq("tenant_id", t).gte("created_at", since),
      s.from("integration_api_logs").select("id", { count: "exact", head: true }).eq("tenant_id", t).gte("created_at", since),
    ]);
    const rows = (conns.data ?? []) as { status: string }[];
    return {
      connections: {
        total: rows.length,
        connected: rows.filter((r) => r.status === "connected").length,
        error: rows.filter((r) => r.status === "error").length,
        pending: rows.filter((r) => r.status === "pending").length,
      },
      jobs: {
        pending: pending.count ?? 0,
        failed: failed.count ?? 0,
        dead: dead.count ?? 0,
      },
      webhookEvents24h: events24.count ?? 0,
      apiCalls24h: calls24.count ?? 0,
    };
  });

// ---------- API Keys ----------
export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("api_keys")
      .select("id, label, prefix, scopes, last_used_at, expires_at, is_active, created_at")
      .eq("tenant_id", data.tenantId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), label: z.string().min(1), scopes: z.array(z.string()).default([]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    // Generate a random key: tc_<prefix>_<secret>
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const prefix = secret.slice(0, 8);
    const fullKey = `tc_${prefix}_${secret.slice(8)}`;

    // Hash with SHA-256
    const enc = new TextEncoder().encode(fullKey);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const hash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, "0")).join("");

    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({ tenant_id: data.tenantId, label: data.label, scopes: data.scopes, prefix, key_hash: hash })
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { key: fullKey, record: row }; // fullKey shown ONCE
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("api_keys").update({ is_active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
