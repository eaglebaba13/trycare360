/**
 * Identity Health Check Service (Stage E).
 *
 * Produces a data-quality snapshot for the identity domain per tenant:
 *
 *   • duplicate contacts (open review queue)
 *   • persons missing DOB
 *   • persons missing consent
 *   • incomplete profiles (no phone AND no email)
 *   • broken relationships (dangling from/to person_id)
 *   • invalid role references (role row for archived/missing person)
 *
 * All checks are read-only counts + up to 20 sample IDs each; they are
 * safe to run on demand and are also the payload of the nightly
 * `identity.health_report` background job.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface HealthCheckReport {
  tenant_id: string;
  generated_at: string;
  duplicate_contacts: { count: number; sample: string[] };
  missing_dob: { count: number; sample: string[] };
  missing_consent: { count: number; sample: string[] };
  incomplete_profiles: { count: number; sample: string[] };
  broken_relationships: { count: number; sample: string[] };
  invalid_role_refs: { count: number; sample: string[] };
}

async function countAndSample(
  sb: SB,
  table:
    | "persons"
    | "person_duplicate_candidates"
    | "person_relationships"
    | "person_doctors"
    | "person_consents",
  build: (
    q: ReturnType<SB["from"]>,
  ) => // biome-ignore lint/suspicious/noExplicitAny: dynamic table union
  any,
  idColumn: string = "id",
): Promise<{ count: number; sample: string[] }> {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic
    const q: any = build(sb.from(table) as never);
    const { data, count, error } = await q.select(idColumn, { count: "exact" }).limit(20);
    if (error) throw error;
    return { count: count ?? 0, sample: (data ?? []).map((r: Record<string, string>) => r[idColumn]) };
  } catch {
    return { count: 0, sample: [] };
  }
}

export class HealthCheckService {
  constructor(private readonly sb: SB) {}

  async run(tenantId: string): Promise<HealthCheckReport> {
    const dup = await countAndSample(this.sb, "person_duplicate_candidates", (q) =>
      q.eq("tenant_id", tenantId).eq("status", "open"),
    );

    const noDob = await countAndSample(this.sb, "persons", (q) =>
      q.eq("tenant_id", tenantId).eq("identity_status", "active").is("dob", null),
    );

    const incomplete = await countAndSample(this.sb, "persons", (q) =>
      q
        .eq("tenant_id", tenantId)
        .eq("identity_status", "active")
        .is("phone_e164", null)
        .is("email_normalized", null),
    );

    // Missing consent: persons with no rows in person_consents.
    const missingConsent = await this.missingConsent(tenantId);

    const broken = await this.brokenRelationships(tenantId);

    const invalidRoles = await this.invalidRoleReferences(tenantId);

    return {
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      duplicate_contacts: dup,
      missing_dob: noDob,
      missing_consent: missingConsent,
      incomplete_profiles: incomplete,
      broken_relationships: broken,
      invalid_role_refs: invalidRoles,
    };
  }

  private async missingConsent(tenantId: string) {
    try {
      const { data: people } = await this.sb
        .from("persons")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("identity_status", "active")
        .limit(2000);
      const ids = (people ?? []).map((p) => p.id);
      if (ids.length === 0) return { count: 0, sample: [] };
      const { data: consents } = await this.sb
        .from("person_consents")
        .select("person_id")
        .eq("tenant_id", tenantId)
        .in("person_id", ids);
      const have = new Set((consents ?? []).map((c) => c.person_id));
      const missing = ids.filter((id) => !have.has(id));
      return { count: missing.length, sample: missing.slice(0, 20) };
    } catch {
      return { count: 0, sample: [] };
    }
  }

  private async brokenRelationships(tenantId: string) {
    try {
      const { data } = await this.sb
        .from("person_relationships")
        .select("id, from_person_id, to_person_id")
        .eq("tenant_id", tenantId)
        .limit(2000);
      const rels = data ?? [];
      if (rels.length === 0) return { count: 0, sample: [] };
      const allIds = Array.from(
        new Set(rels.flatMap((r) => [r.from_person_id, r.to_person_id])),
      );
      const { data: existing } = await this.sb
        .from("persons")
        .select("id")
        .eq("tenant_id", tenantId)
        .in("id", allIds);
      const alive = new Set((existing ?? []).map((p) => p.id));
      const broken = rels.filter(
        (r) => !alive.has(r.from_person_id) || !alive.has(r.to_person_id),
      );
      return { count: broken.length, sample: broken.slice(0, 20).map((r) => r.id) };
    } catch {
      return { count: 0, sample: [] };
    }
  }

  private async invalidRoleReferences(tenantId: string) {
    try {
      const roleTables = [
        "person_doctors",
        "person_employees",
        "person_franchise_owners",
        "person_academy_students",
        "person_leads",
        "person_corporate_contacts",
        "person_vendor_contacts",
      ] as const;
      const sample: string[] = [];
      let count = 0;
      for (const t of roleTables) {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic table
        const { data } = await (this.sb.from(t) as any)
          .select("person_id")
          .eq("tenant_id", tenantId)
          .limit(500);
        const ids = (data ?? []).map((r: { person_id: string }) => r.person_id);
        if (ids.length === 0) continue;
        const { data: existing } = await this.sb
          .from("persons")
          .select("id, identity_status")
          .eq("tenant_id", tenantId)
          .in("id", ids);
        const alive = new Set(
          (existing ?? []).filter((p) => p.identity_status === "active").map((p) => p.id),
        );
        for (const id of ids) {
          if (!alive.has(id)) {
            count++;
            if (sample.length < 20) sample.push(`${t}:${id}`);
          }
        }
      }
      return { count, sample };
    } catch {
      return { count: 0, sample: [] };
    }
  }
}
