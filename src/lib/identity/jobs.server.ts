/**
 * Identity Background Jobs (Stage E).
 *
 * Pure functions that a scheduler (pg_cron via a public hook route, or
 * an admin-triggered server function) can invoke. Each job is
 * idempotent, tenant-scoped, and returns a JSON summary suitable for
 * logging and alerting. They avoid long transactions and cap per-run
 * work so a single call cannot exceed the Worker CPU budget.
 *
 * Jobs:
 *   • nightlyDuplicateScan — refresh candidate queue for recently
 *     updated persons.
 *   • rebuildSearchIndex   — repopulate `search_index` rows for
 *     recently changed people.
 *   • rebuildPersonCache   — warm the in-process cache with the most
 *     recently touched people (best-effort).
 *   • healthReport         — persist a snapshot of `HealthCheckReport`
 *     for the ops dashboard.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { scanPerson } from "./dedup.server";
import { HealthCheckService } from "./health.server";
import { PersonCache } from "./cache.server";

type SB = SupabaseClient<Database>;

export interface JobResult {
  job: string;
  tenant_id: string;
  started_at: string;
  finished_at: string;
  ok: boolean;
  metrics: Record<string, number>;
  errors?: string[];
}

function stamp(): string {
  return new Date().toISOString();
}

export async function nightlyDuplicateScan(
  sb: SB,
  tenantId: string,
  opts?: { batch?: number; sinceHours?: number },
): Promise<JobResult> {
  const startedAt = stamp();
  const errors: string[] = [];
  const batch = Math.min(Math.max(opts?.batch ?? 200, 1), 2000);
  const since = new Date(
    Date.now() - (opts?.sinceHours ?? 24) * 60 * 60 * 1000,
  ).toISOString();

  let scanned = 0;
  let candidates = 0;

  try {
    const { data } = await sb
      .from("persons")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("identity_status", "active")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(batch);

    const ids = (data ?? []).map((r) => r.id);
    for (const id of ids) {
      try {
        const res = await scanPerson(sb, { tenantId, personId: id });
        scanned++;
        candidates += res.persisted;
      } catch (e) {
        errors.push(`scan ${id}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  return {
    job: "identity.nightly_duplicate_scan",
    tenant_id: tenantId,
    started_at: startedAt,
    finished_at: stamp(),
    ok: errors.length === 0,
    metrics: { scanned, candidates },
    errors: errors.length ? errors : undefined,
  };
}

export async function rebuildSearchIndex(
  sb: SB,
  tenantId: string,
  opts?: { batch?: number; sinceHours?: number },
): Promise<JobResult> {
  const startedAt = stamp();
  const errors: string[] = [];
  const batch = Math.min(Math.max(opts?.batch ?? 500, 1), 5000);
  const since = new Date(
    Date.now() - (opts?.sinceHours ?? 24) * 60 * 60 * 1000,
  ).toISOString();

  let upserts = 0;

  try {
    const { data } = await sb
      .from("persons")
      .select("id, full_name, phone_e164, email_normalized, updated_at")
      .eq("tenant_id", tenantId)
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(batch);

    const rows = (data ?? []).map((p) => ({
      tenant_id: tenantId,
      entity_type: "person",
      entity_id: p.id,
      title: p.full_name,
      subtitle: p.phone_e164 ?? p.email_normalized ?? null,
      keywords: [p.full_name, p.phone_e164, p.email_normalized].filter(Boolean).join(" "),
      body: null,
      url: `/people/${p.id}`,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error } = await sb
        .from("search_index")
        .upsert(rows, { onConflict: "tenant_id,entity_type,entity_id" });
      if (error) errors.push(error.message);
      else upserts = rows.length;
    }
  } catch (e) {
    errors.push((e as Error).message);
  }

  return {
    job: "identity.rebuild_search_index",
    tenant_id: tenantId,
    started_at: startedAt,
    finished_at: stamp(),
    ok: errors.length === 0,
    metrics: { upserts },
    errors: errors.length ? errors : undefined,
  };
}

export async function rebuildPersonCache(
  sb: SB,
  tenantId: string,
  opts?: { batch?: number },
): Promise<JobResult> {
  const startedAt = stamp();
  const errors: string[] = [];
  const batch = Math.min(Math.max(opts?.batch ?? 200, 1), 2000);
  let warmed = 0;
  try {
    const { data } = await sb
      .from("persons")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("identity_status", "active")
      .order("updated_at", { ascending: false })
      .limit(batch);
    const ids = (data ?? []).map((r) => r.id);
    const rows = await new PersonCache(sb).getMany(tenantId, ids);
    warmed = rows.length;
  } catch (e) {
    errors.push((e as Error).message);
  }
  return {
    job: "identity.rebuild_person_cache",
    tenant_id: tenantId,
    started_at: startedAt,
    finished_at: stamp(),
    ok: errors.length === 0,
    metrics: { warmed },
    errors: errors.length ? errors : undefined,
  };
}

export async function healthReport(sb: SB, tenantId: string): Promise<JobResult> {
  const startedAt = stamp();
  const errors: string[] = [];
  const metrics: Record<string, number> = {};
  try {
    const report = await new HealthCheckService(sb).run(tenantId);
    metrics.duplicate_contacts = report.duplicate_contacts.count;
    metrics.missing_dob = report.missing_dob.count;
    metrics.missing_consent = report.missing_consent.count;
    metrics.incomplete_profiles = report.incomplete_profiles.count;
    metrics.broken_relationships = report.broken_relationships.count;
    metrics.invalid_role_refs = report.invalid_role_refs.count;
    try {
      await sb.from("platform_settings").upsert(
        {
          key: `identity.health_report.${tenantId}`,
          category: "identity.health",
          value: report as unknown as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    } catch {
      /* best-effort persist */
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  return {
    job: "identity.health_report",
    tenant_id: tenantId,
    started_at: startedAt,
    finished_at: stamp(),
    ok: errors.length === 0,
    metrics,
    errors: errors.length ? errors : undefined,
  };
}
