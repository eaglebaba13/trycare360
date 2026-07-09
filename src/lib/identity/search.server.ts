/**
 * Identity Search Service (Stage E).
 *
 * Two entry points:
 *
 *   • `quickSearch()` — single query string, returns top hits across
 *     name / phone / email. Backs the omnibox and typeahead.
 *   • `advancedSearch()` — structured filters (role, branch, city, tag,
 *     status, consent, verification, membership, doctor, franchise,
 *     employee). Backs the People Management list page.
 *
 * Both run under RLS as the caller and use existing indexes on
 * `persons`, role extension tables, `person_tags`, `person_addresses`,
 * and `person_consents`. Full-text is delegated to the `search_index`
 * table when `useSearchIndex=true`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;
type PersonRow = Tables<"persons">;

export interface AdvancedSearchFilters {
  tenantId: string;
  query?: string;
  role?:
    | "patient"
    | "doctor"
    | "employee"
    | "franchise_owner"
    | "academy_student"
    | "lead"
    | "corporate_contact"
    | "vendor_contact";
  branchId?: string;
  city?: string;
  tagDefId?: string;
  identityStatus?: "active" | "archived" | "merged";
  consentPurposeCode?: string;
  consentGranted?: boolean;
  verified?: boolean;
  membershipTier?: string;
  doctorId?: string;
  franchiseId?: string;
  employeeDepartmentId?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  rows: PersonRow[];
  total: number | null;
  limit: number;
  offset: number;
}

const ROLE_TABLE: Record<NonNullable<AdvancedSearchFilters["role"]>, string> = {
  patient: "patients",
  doctor: "person_doctors",
  employee: "person_employees",
  franchise_owner: "person_franchise_owners",
  academy_student: "person_academy_students",
  lead: "person_leads",
  corporate_contact: "person_corporate_contacts",
  vendor_contact: "person_vendor_contacts",
};

export class SearchService {
  constructor(private readonly sb: SB) {}

  async quickSearch(tenantId: string, query: string, limit = 10): Promise<PersonRow[]> {
    const q = query.trim();
    if (!q) return [];
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    const { data, error } = await this.sb
      .from("persons")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("identity_status", "active")
      .or(
        `full_name.ilike.${like},phone_e164.ilike.${like},email_normalized.ilike.${like},display_name.ilike.${like}`,
      )
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async advancedSearch(f: AdvancedSearchFilters): Promise<SearchResult> {
    const limit = Math.min(Math.max(f.limit ?? 50, 1), 500);
    const offset = Math.max(f.offset ?? 0, 0);

    // Pre-filter by narrowing joins for role/tag/city/consent when present.
    // Each returns a list of person_ids to intersect with the main query.
    const idSets: Array<Set<string>> = [];

    if (f.role) {
      const table = ROLE_TABLE[f.role];
      // biome-ignore lint/suspicious/noExplicitAny: dynamic table over union
      let q: any = (this.sb.from as any)(table)
        .select("person_id")
        .eq("tenant_id", f.tenantId);
      if (f.role === "doctor" && f.doctorId) q = q.eq("person_id", f.doctorId);
      if (f.role === "employee" && f.employeeDepartmentId) q = q.eq("department_id", f.employeeDepartmentId);
      if (f.role === "franchise_owner" && f.franchiseId) q = q.eq("branch_id", f.franchiseId);
      const { data, error } = await q.limit(5000);
      if (error) throw new Error(error.message);
      idSets.push(new Set<string>((data ?? []).map((r: { person_id: string }) => r.person_id)));
    }

    if (f.branchId) {
      const { data, error } = await this.sb
        .from("patients")
        .select("person_id")
        .eq("tenant_id", f.tenantId)
        .eq("home_branch_id", f.branchId)
        .limit(5000);
      if (error) throw new Error(error.message);
      idSets.push(new Set<string>((data ?? []).map((r) => r.person_id)));
    }

    if (f.city) {
      const { data, error } = await this.sb
        .from("person_addresses")
        .select("person_id")
        .eq("tenant_id", f.tenantId)
        .ilike("city", `%${f.city}%`)
        .limit(5000);
      if (error) throw new Error(error.message);
      idSets.push(new Set<string>((data ?? []).map((r) => r.person_id)));
    }

    if (f.tagDefId) {
      const { data, error } = await this.sb
        .from("person_tags")
        .select("person_id")
        .eq("tenant_id", f.tenantId)
        .eq("tag_def_id", f.tagDefId)
        .limit(5000);
      if (error) throw new Error(error.message);
      idSets.push(new Set<string>((data ?? []).map((r) => r.person_id)));
    }

    if (f.consentPurposeCode) {
      const { data, error } = await this.sb
        .from("person_consents")
        .select("person_id, granted")
        .eq("tenant_id", f.tenantId)
        .eq("purpose_code", f.consentPurposeCode)
        .limit(5000);
      if (error) throw new Error(error.message);
      const wanted = f.consentGranted ?? true;
      idSets.push(
        new Set<string>((data ?? []).filter((r) => r.granted === wanted).map((r) => r.person_id)),
      );
    }

    if (f.verified === true) {
      const { data, error } = await this.sb
        .from("person_verifications")
        .select("person_id")
        .eq("tenant_id", f.tenantId)
        .eq("status", "verified")
        .limit(5000);
      if (error) throw new Error(error.message);
      idSets.push(new Set<string>((data ?? []).map((r) => r.person_id)));
    }

    let candidateIds: string[] | null = null;
    if (idSets.length > 0) {
      const [first, ...rest] = idSets;
      const intersection = new Set(first);
      for (const s of rest) {
        for (const id of intersection) if (!s.has(id)) intersection.delete(id);
      }
      candidateIds = Array.from(intersection);
      if (candidateIds.length === 0) {
        return { rows: [], total: 0, limit, offset };
      }
    }

    let q = this.sb
      .from("persons")
      .select("*", { count: "exact" })
      .eq("tenant_id", f.tenantId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    q = q.eq("identity_status", f.identityStatus ?? "active");
    if (f.membershipTier) q = q.eq("membership_tier", f.membershipTier);
    if (candidateIds) q = q.in("id", candidateIds.slice(0, 1000));
    if (f.query && f.query.trim()) {
      const like = `%${f.query.trim().replace(/[%_]/g, "\\$&")}%`;
      q = q.or(
        `full_name.ilike.${like},phone_e164.ilike.${like},email_normalized.ilike.${like},display_name.ilike.${like}`,
      );
    }

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: data ?? [], total: count ?? null, limit, offset };
  }

  /** Full-text delegate for the omnibox using the existing search_index table. */
  async globalSearch(tenantId: string, query: string, limit = 20) {
    const q = query.trim();
    if (!q) return [];
    const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
    const { data, error } = await this.sb
      .from("search_index")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(`title.ilike.${like},subtitle.ilike.${like},keywords.ilike.${like}`)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
}
