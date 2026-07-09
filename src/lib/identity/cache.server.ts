/**
 * Person Cache Layer (Stage E).
 *
 * In-process TTL cache for hot person reads. Because server functions
 * run inside a Cloudflare Worker isolate, the cache is per-isolate —
 * good enough to collapse duplicate reads within a single request and
 * short bursts of traffic on the same isolate, and safe under merge/
 * unmerge because every mutation path calls `invalidatePerson()`.
 *
 * The cache stores only public identity fields (row from `persons`).
 * Consent, tags, alerts, and role tables are NOT cached here — those
 * have their own service-side batching.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;
type PersonRow = Tables<"persons">;

interface Entry {
  value: PersonRow;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000;
const MAX_ENTRIES = 500;

const store = new Map<string, Entry>();

function key(tenantId: string, personId: string): string {
  return `${tenantId}:${personId}`;
}

function evictIfFull() {
  if (store.size <= MAX_ENTRIES) return;
  const cutoff = Math.floor(store.size - MAX_ENTRIES * 0.9);
  let i = 0;
  for (const k of store.keys()) {
    if (i++ >= cutoff) break;
    store.delete(k);
  }
}

export class PersonCache {
  constructor(private readonly sb: SB, private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async get(tenantId: string, personId: string): Promise<PersonRow | null> {
    const k = key(tenantId, personId);
    const hit = store.get(k);
    const now = Date.now();
    if (hit && hit.expiresAt > now) return hit.value;
    const { data, error } = await this.sb
      .from("persons")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", personId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    store.set(k, { value: data, expiresAt: now + this.ttlMs });
    evictIfFull();
    return data;
  }

  async getMany(tenantId: string, personIds: string[]): Promise<PersonRow[]> {
    if (personIds.length === 0) return [];
    const now = Date.now();
    const missing: string[] = [];
    const hits: PersonRow[] = [];
    for (const id of personIds) {
      const hit = store.get(key(tenantId, id));
      if (hit && hit.expiresAt > now) hits.push(hit.value);
      else missing.push(id);
    }
    if (missing.length > 0) {
      const { data, error } = await this.sb
        .from("persons")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", missing);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        store.set(key(tenantId, row.id), { value: row, expiresAt: now + this.ttlMs });
        hits.push(row);
      }
    }
    return hits;
  }
}

export function invalidatePerson(tenantId: string, personId: string): void {
  store.delete(key(tenantId, personId));
}

export function invalidatePersons(tenantId: string, personIds: string[]): void {
  for (const id of personIds) store.delete(key(tenantId, id));
}

export function invalidateTenant(tenantId: string): void {
  const prefix = `${tenantId}:`;
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

export function clearPersonCache(): void {
  store.clear();
}

export function personCacheStats() {
  return { size: store.size, maxEntries: MAX_ENTRIES };
}
