/**
 * Central dispatcher — SERVER ONLY.
 * Every module MUST call dispatch() instead of hitting third-party APIs directly.
 * Handles: connection lookup, credential resolution, API logging, retry queueing.
 */
import { ADAPTERS, type AdapterContext } from "./providers";
import type { DispatchResult } from "./registry";
import { log } from "@/lib/logger";

type SupabaseLike = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: unknown) => {
        eq: (col: string, v: unknown) => {
          eq: (col: string, v: unknown) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> };
        };
      };
    };
    insert: (rows: unknown) => Promise<{ error: unknown }>;
  };
};

export async function dispatch(args: {
  supabase: SupabaseLike;
  tenantId: string;
  providerCode: string;
  action: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<DispatchResult> {
  const started = Date.now();
  const { supabase, tenantId, providerCode, action, payload } = args;

  const { data: conn, error } = await supabase
    .from("integration_connections")
    .select("id, credentials_ref, config, scopes, status, is_active")
    .eq("tenant_id", tenantId)
    .eq("provider_code", providerCode)
    .eq("is_active", true)
    .maybeSingle();

  const connection = conn as null | {
    id: string;
    credentials_ref: string | null;
    config: Record<string, unknown>;
    scopes: string[];
    status: string;
    is_active: boolean;
  };

  if (error) {
    return { ok: false, error: String((error as { message?: string }).message ?? error), retryable: false, latencyMs: Date.now() - started };
  }

  const adapter = ADAPTERS[providerCode];
  if (!adapter) {
    return { ok: false, error: `unknown_provider_${providerCode}`, retryable: false, latencyMs: Date.now() - started };
  }

  const ctx: AdapterContext = {
    credentialsRef: connection?.credentials_ref ?? null,
    config: connection?.config ?? {},
    scopes: connection?.scopes ?? [],
  };

  try {
    const result = await adapter(action, payload, ctx);
    const latencyMs = Date.now() - started;
    await logCall(supabase, {
      tenantId,
      connectionId: connection?.id ?? null,
      providerCode,
      endpoint: action,
      method: "ADAPTER",
      status_code: 200,
      latencyMs,
      request_summary: summarize(payload),
      response_summary: summarize(result),
      error: null,
    });
    return { ok: true, result, latencyMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retryable = /_429|_5\d\d|timeout|network/i.test(message);
    const latencyMs = Date.now() - started;
    await logCall(supabase, {
      tenantId,
      connectionId: connection?.id ?? null,
      providerCode,
      endpoint: action,
      method: "ADAPTER",
      status_code: retryable ? 503 : 400,
      latencyMs,
      request_summary: summarize(payload),
      response_summary: null,
      error: message,
    });
    log.warn("integration_dispatch_failed", { providerCode, action, error: message });
    return { ok: false, error: message, retryable, latencyMs };
  }
}

async function logCall(supabase: SupabaseLike, row: Record<string, unknown>) {
  try {
    await supabase.from("integration_api_logs").insert({
      tenant_id: row.tenantId,
      connection_id: row.connectionId,
      provider_code: row.providerCode,
      endpoint: row.endpoint,
      method: row.method,
      status_code: row.status_code,
      latency_ms: row.latencyMs,
      request_summary: row.request_summary,
      response_summary: row.response_summary,
      error: row.error,
    });
  } catch {
    /* logging must not throw */
  }
}

function summarize(v: unknown): unknown {
  try {
    const s = JSON.stringify(v);
    if (s.length <= 2000) return v;
    return { truncated: true, preview: s.slice(0, 2000) };
  } catch {
    return { unserializable: true };
  }
}
