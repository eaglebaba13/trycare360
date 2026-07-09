/**
 * Deduplication — Scanner + Repository (server-only).
 *
 * `scanPerson()` finds candidate rows for a given person using cheap
 * blocking predicates (same phone/email/DOB/national-id-hash, name-token
 * ILIKE), runs the `DedupEngine` over each pair, and upserts rows into
 * `person_duplicate_candidates` for anything above `MIN_PERSISTED_SCORE`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import {
  DedupEngine,
  classifyConfidence,
  loadWeights,
  type EngineResult,
  type PersonLike,
} from "./matchers.server";
import { nameTokens } from "./normalization";

type SB = SupabaseClient<Database>;

/** Rows below this combined score are NOT persisted (queue noise floor). */
export const MIN_PERSISTED_SCORE = 0.45;

const PERSON_COLUMNS =
  "id, tenant_id, full_name, first_name, last_name, phone_e164, email_normalized, national_id_hash, dob, gender, primary_address_line1, primary_address_city, primary_address_state, primary_address_country, primary_address_pincode, identity_status, merged_into_person_id";

export type DuplicateStatus = "open" | "reviewing" | "approved" | "rejected" | "deferred";
export type CandidateRow = Tables<"person_duplicate_candidates">;

/** Canonical (a, b) ordering so (X, Y) and (Y, X) collapse to one row. */
function orderPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

// ---------- Repository ----------------------------------------------------

export class DuplicateCandidateRepository {
  constructor(private readonly sb: SB) {}

  async listByPerson(tenantId: string, personId: string) {
    const { data, error } = await this.sb
      .from("person_duplicate_candidates")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`person_a_id.eq.${personId},person_b_id.eq.${personId}`)
      .order("score", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async search(args: {
    tenantId: string;
    status?: DuplicateStatus;
    minScore?: number;
    limit: number;
    offset: number;
  }) {
    let q = this.sb
      .from("person_duplicate_candidates")
      .select("*", { count: "exact" })
      .eq("tenant_id", args.tenantId)
      .order("score", { ascending: false })
      .range(args.offset, args.offset + args.limit - 1);
    if (args.status) q = q.eq("status", args.status);
    if (typeof args.minScore === "number") q = q.gte("score", args.minScore);
    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: (data ?? []) as CandidateRow[], total: count ?? 0 };
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: DuplicateStatus,
    reviewerId: string | null,
  ): Promise<CandidateRow> {
    const patch: Partial<CandidateRow> = {
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    };
    const { data, error } = await this.sb
      .from("person_duplicate_candidates")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as CandidateRow;
  }

  /**
   * Upsert on the canonical (person_a_id, person_b_id) pair. Existing
   * rows with a non-terminal status get their score/signals refreshed;
   * `approved`/`rejected` rows are left untouched so an audit decision
   * is never silently overwritten by a rescan.
   */
  async upsertPair(args: {
    tenantId: string;
    personAId: string;
    personBId: string;
    score: number;
    signals: Record<string, unknown>;
  }): Promise<{ row: CandidateRow; created: boolean; refreshed: boolean }> {
    const [a, b] = orderPair(args.personAId, args.personBId);
    const existing = await this.sb
      .from("person_duplicate_candidates")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("person_a_id", a)
      .eq("person_b_id", b)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);

    if (existing.data) {
      const cur = existing.data as CandidateRow;
      if (cur.status === "approved" || cur.status === "rejected") {
        return { row: cur, created: false, refreshed: false };
      }
      const { data, error } = await this.sb
        .from("person_duplicate_candidates")
        .update({ score: args.score, match_signals: args.signals as never })
        .eq("id", cur.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { row: data as CandidateRow, created: false, refreshed: true };
    }

    const { data, error } = await this.sb
      .from("person_duplicate_candidates")
      .insert({
        tenant_id: args.tenantId,
        person_a_id: a,
        person_b_id: b,
        score: args.score,
        match_signals: args.signals as never,
        status: "open",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { row: data as CandidateRow, created: true, refreshed: false };
  }
}

// ---------- Candidate pool (blocking) -------------------------------------

/**
 * Cheap blocking predicates to narrow the candidate pool for scoring.
 * We deliberately keep the SQL simple so it uses existing indexes on
 * `phone_e164`, `email_normalized`, `national_id_hash`, and `full_name`.
 */
async function fetchCandidatePool(
  sb: SB,
  base: PersonLike & { tenant_id: string },
  cap: number,
): Promise<PersonLike[]> {
  const filters: string[] = [];
  if (base.phone_e164) filters.push(`phone_e164.eq.${base.phone_e164}`);
  if (base.email_normalized) filters.push(`email_normalized.eq.${base.email_normalized}`);
  if (base.national_id_hash) filters.push(`national_id_hash.eq.${base.national_id_hash}`);
  if (base.dob) filters.push(`dob.eq.${base.dob}`);

  const first = nameTokens(base.full_name)[0];
  if (first && first.length >= 3) {
    filters.push(`full_name.ilike.%${first.replace(/[%_]/g, "\\$&")}%`);
  }
  if (filters.length === 0) return [];

  const { data, error } = await sb
    .from("persons")
    .select(PERSON_COLUMNS)
    .eq("tenant_id", base.tenant_id)
    .neq("id", base.id)
    .is("merged_into_person_id", null)
    .neq("identity_status", "archived")
    .or(filters.join(","))
    .limit(cap);
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonLike[];
}

// ---------- Scanner -------------------------------------------------------

export interface ScanResult {
  personId: string;
  scanned: number;
  persisted: number;
  detected: Array<{
    otherId: string;
    score: number;
    band: ReturnType<typeof classifyConfidence>;
    created: boolean;
  }>;
}

/** Scan a single person and persist duplicate candidates above the floor. */
export async function scanPerson(
  sb: SB,
  args: { tenantId: string; personId: string; poolCap?: number },
): Promise<ScanResult> {
  const cap = args.poolCap ?? 200;
  const { data: baseRow, error: baseErr } = await sb
    .from("persons")
    .select(PERSON_COLUMNS)
    .eq("tenant_id", args.tenantId)
    .eq("id", args.personId)
    .maybeSingle();
  if (baseErr) throw new Error(baseErr.message);
  if (!baseRow) throw new Error("Person not found");

  const base = baseRow as PersonLike & { tenant_id: string; merged_into_person_id: string | null };
  if (base.merged_into_person_id) {
    return { personId: args.personId, scanned: 0, persisted: 0, detected: [] };
  }

  const pool = await fetchCandidatePool(sb, base, cap);
  if (pool.length === 0) {
    return { personId: args.personId, scanned: 0, persisted: 0, detected: [] };
  }

  const weights = await loadWeights(sb, args.tenantId);
  const engine = new DedupEngine(undefined, weights);
  const repo = new DuplicateCandidateRepository(sb);

  const detected: ScanResult["detected"] = [];
  let persisted = 0;

  for (const other of pool) {
    const result: EngineResult = engine.evaluate(base, other);
    if (result.score < MIN_PERSISTED_SCORE) continue;
    const up = await repo.upsertPair({
      tenantId: args.tenantId,
      personAId: base.id,
      personBId: other.id,
      score: result.score,
      signals: { ...result.signals, contributions: result.contributions },
    });
    if (up.created || up.refreshed) persisted++;
    detected.push({
      otherId: other.id,
      score: result.score,
      band: result.band,
      created: up.created,
    });
  }

  return { personId: args.personId, scanned: pool.length, persisted, detected };
}

// ---------- Dashboard -----------------------------------------------------

export interface DashboardStats {
  counts: Record<DuplicateStatus, number>;
  totalOpen: number;
  byBand: Record<ReturnType<typeof classifyConfidence>, number>;
  highRisk: number; // score >= 0.9 AND status = open
  recentReviewed7d: number;
}

export async function computeDashboard(
  sb: SB,
  tenantId: string,
): Promise<DashboardStats> {
  const statuses: DuplicateStatus[] = ["open", "reviewing", "approved", "rejected", "deferred"];
  const counts = { open: 0, reviewing: 0, approved: 0, rejected: 0, deferred: 0 } as Record<
    DuplicateStatus,
    number
  >;

  await Promise.all(
    statuses.map(async (s) => {
      const { count, error } = await sb
        .from("person_duplicate_candidates")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", s);
      if (error) throw new Error(error.message);
      counts[s] = count ?? 0;
    }),
  );

  const byBand = { automatic: 0, probable: 0, fuzzy: 0, low: 0 } as Record<
    ReturnType<typeof classifyConfidence>,
    number
  >;
  const bands: Array<{ band: ReturnType<typeof classifyConfidence>; min: number; max?: number }> = [
    { band: "automatic", min: 0.9 },
    { band: "probable", min: 0.7, max: 0.9 },
    { band: "fuzzy", min: 0.45, max: 0.7 },
  ];
  await Promise.all(
    bands.map(async (b) => {
      let q = sb
        .from("person_duplicate_candidates")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .gte("score", b.min);
      if (b.max !== undefined) q = q.lt("score", b.max);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      byBand[b.band] = count ?? 0;
    }),
  );

  const highRiskRes = await sb
    .from("person_duplicate_candidates")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "open")
    .gte("score", 0.9);
  if (highRiskRes.error) throw new Error(highRiskRes.error.message);

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const reviewedRes = await sb
    .from("person_duplicate_candidates")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .not("reviewed_at", "is", null)
    .gte("reviewed_at", since);
  if (reviewedRes.error) throw new Error(reviewedRes.error.message);

  return {
    counts,
    totalOpen: counts.open,
    byBand,
    highRisk: highRiskRes.count ?? 0,
    recentReviewed7d: reviewedRes.count ?? 0,
  };
}
