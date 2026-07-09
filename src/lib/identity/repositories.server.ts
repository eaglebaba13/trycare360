/**
 * Master Person Registry — Repository Layer (server-only).
 *
 * Repositories are thin wrappers around Supabase table access that expose
 * a stable, typed API to the service (server-function) layer. Business
 * logic — permission checks, event emission, normalization — lives in
 * the server functions that call these repositories. Repositories only:
 *
 *   1. Shape input into row payloads.
 *   2. Execute the query.
 *   3. Translate errors to plain `Error` instances.
 *   4. Return typed rows.
 *
 * All repositories accept a `SupabaseClient` in the constructor so the
 * caller controls auth context (user-scoped via `requireSupabaseAuth`,
 * or admin via `supabaseAdmin` for maintenance work).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) {
    throw new Error("Row not found");
  }
  return res.data;
}

function unwrapMaybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function unwrapList<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

// =====================================================================
// PERSON
// =====================================================================

export type PersonRow = Tables<"persons">;
export type PersonInsert = TablesInsert<"persons">;
export type PersonUpdate = TablesUpdate<"persons">;

export class PersonRepository {
  constructor(private readonly sb: SB) {}

  async insert(row: PersonInsert): Promise<PersonRow> {
    return unwrap(
      await this.sb.from("persons").insert(row).select("*").single(),
    );
  }

  async update(tenantId: string, id: string, patch: PersonUpdate): Promise<PersonRow> {
    return unwrap(
      await this.sb
        .from("persons")
        .update(patch)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("*")
        .single(),
    );
  }

  async getById(tenantId: string, id: string): Promise<PersonRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("persons")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle(),
    );
  }

  async archive(tenantId: string, id: string): Promise<PersonRow> {
    return this.update(tenantId, id, {
      identity_status: "archived",
      archived_at: new Date().toISOString(),
    });
  }

  /**
   * Search active people by name/phone/email substring. Uses ilike for
   * portability; global fuzzy search is served by the `search_index`
   * pipeline and `search_global()` RPC (Stage H).
   */
  async search(args: {
    tenantId: string;
    query?: string;
    identityStatus?: string;
    vipOnly?: boolean;
    limit: number;
    offset: number;
  }): Promise<PersonRow[]> {
    let q = this.sb
      .from("persons")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("updated_at", { ascending: false })
      .range(args.offset, args.offset + args.limit - 1);

    if (args.identityStatus) q = q.eq("identity_status", args.identityStatus);
    if (args.vipOnly) q = q.eq("vip_flag", true);
    if (args.query && args.query.length > 0) {
      const like = `%${args.query.replace(/[%_]/g, "\\$&")}%`;
      q = q.or(
        `full_name.ilike.${like},phone_e164.ilike.${like},email_normalized.ilike.${like}`,
      );
    }
    return unwrapList(await q);
  }

  async findByPhoneOrEmail(
    tenantId: string,
    phoneE164: string | null,
    emailNormalized: string | null,
  ): Promise<PersonRow | null> {
    if (!phoneE164 && !emailNormalized) return null;
    let q = this.sb.from("persons").select("*").eq("tenant_id", tenantId).limit(1);
    if (phoneE164 && emailNormalized) {
      q = q.or(`phone_e164.eq.${phoneE164},email_normalized.eq.${emailNormalized}`);
    } else if (phoneE164) {
      q = q.eq("phone_e164", phoneE164);
    } else if (emailNormalized) {
      q = q.eq("email_normalized", emailNormalized);
    }
    const rows = unwrapList(await q);
    return rows[0] ?? null;
  }
}

// =====================================================================
// PATIENT + ROLE REPOSITORIES
// =====================================================================

export type PatientRow = Tables<"patients">;

export class PatientRepository {
  constructor(private readonly sb: SB) {}

  async getByPerson(tenantId: string, personId: string): Promise<PatientRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("patients")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .maybeSingle(),
    );
  }

  async create(row: TablesInsert<"patients">): Promise<PatientRow> {
    return unwrap(await this.sb.from("patients").insert(row).select("*").single());
  }

  async updateStatus(tenantId: string, personId: string, status: string): Promise<PatientRow> {
    return unwrap(
      await this.sb
        .from("patients")
        .update({ status })
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .select("*")
        .single(),
    );
  }

  /**
   * Aggregated summary used by Patient 360 (server-side compose). Returns
   * `null` when the person has no patient extension yet.
   */
  async getSummary(tenantId: string, personId: string) {
    const person = unwrapMaybe(
      await this.sb
        .from("persons")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", personId)
        .maybeSingle(),
    );
    if (!person) return null;

    const [patient, contacts, addresses, alerts, tags, verifications, relationships] = await Promise.all([
      this.getByPerson(tenantId, personId),
      unwrapList(
        await this.sb
          .from("person_contacts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId),
      ),
      unwrapList(
        await this.sb
          .from("person_addresses")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId),
      ),
      unwrapList(
        await this.sb
          .from("person_medical_alerts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .eq("is_active", true),
      ),
      unwrapList(
        await this.sb
          .from("person_tags")
          .select("tag_def_id, assigned_at")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId),
      ),
      unwrapList(
        await this.sb
          .from("person_verifications")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .order("initiated_at", { ascending: false }),
      ),
      unwrapList(
        await this.sb
          .from("person_relationships")
          .select("*")
          .eq("tenant_id", tenantId)
          .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`),
      ),
    ]);

    return { person, patient, contacts, addresses, alerts, tags, verifications, relationships };
  }
}

// ---- Role extension repositories --------------------------------------

type RoleTable =
  | "person_doctors"
  | "person_employees"
  | "person_franchise_owners"
  | "person_academy_students"
  | "person_leads"
  | "person_corporate_contacts"
  | "person_vendor_contacts";

class BaseRoleRepo<T extends RoleTable> {
  constructor(protected readonly sb: SB, protected readonly table: T) {}

  async getByPerson(tenantId: string, personId: string) {
    return unwrapMaybe(
      await this.sb
        .from(this.table)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .maybeSingle(),
    );
  }

  async attach(row: TablesInsert<T>) {
    // biome-ignore lint/suspicious/noExplicitAny: generic upsert over union
    return unwrap(await (this.sb.from(this.table).insert(row as any).select("*").single()));
  }

  async detach(tenantId: string, personId: string): Promise<void> {
    const { error } = await this.sb
      .from(this.table)
      .update({ status: "inactive" })
      .eq("tenant_id", tenantId)
      .eq("person_id", personId);
    if (error) throw new Error(error.message);
  }
}

export class DoctorRepository extends BaseRoleRepo<"person_doctors"> {
  constructor(sb: SB) { super(sb, "person_doctors"); }
}
export class EmployeeRepository extends BaseRoleRepo<"person_employees"> {
  constructor(sb: SB) { super(sb, "person_employees"); }
}
export class FranchiseOwnerRepository extends BaseRoleRepo<"person_franchise_owners"> {
  constructor(sb: SB) { super(sb, "person_franchise_owners"); }
}
export class AcademyStudentRepository extends BaseRoleRepo<"person_academy_students"> {
  constructor(sb: SB) { super(sb, "person_academy_students"); }
}
export class LeadRepository extends BaseRoleRepo<"person_leads"> {
  constructor(sb: SB) { super(sb, "person_leads"); }
}
export class CorporateContactRepository extends BaseRoleRepo<"person_corporate_contacts"> {
  constructor(sb: SB) { super(sb, "person_corporate_contacts"); }
}
export class VendorContactRepository extends BaseRoleRepo<"person_vendor_contacts"> {
  constructor(sb: SB) { super(sb, "person_vendor_contacts"); }
}

// =====================================================================
// CONTACT / ADDRESS / RELATIONSHIP / CONSENT / VERIFICATION
// =====================================================================

export class ContactRepository {
  constructor(private readonly sb: SB) {}

  async upsert(row: TablesInsert<"person_contacts">): Promise<Tables<"person_contacts">> {
    return unwrap(
      await this.sb
        .from("person_contacts")
        .upsert(row, { onConflict: "id" })
        .select("*")
        .single(),
    );
  }

  async listByPerson(tenantId: string, personId: string) {
    return unwrapList(
      await this.sb
        .from("person_contacts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId),
    );
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const { error } = await this.sb
      .from("person_contacts")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class AddressRepository {
  constructor(private readonly sb: SB) {}

  async upsert(row: TablesInsert<"person_addresses">): Promise<Tables<"person_addresses">> {
    return unwrap(
      await this.sb
        .from("person_addresses")
        .upsert(row, { onConflict: "id" })
        .select("*")
        .single(),
    );
  }

  async listByPerson(tenantId: string, personId: string) {
    return unwrapList(
      await this.sb
        .from("person_addresses")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId),
    );
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const { error } = await this.sb
      .from("person_addresses")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class RelationshipRepository {
  constructor(private readonly sb: SB) {}

  async upsert(row: TablesInsert<"person_relationships">): Promise<Tables<"person_relationships">> {
    return unwrap(
      await this.sb
        .from("person_relationships")
        .insert(row)
        .select("*")
        .single(),
    );
  }

  async listForPerson(tenantId: string, personId: string) {
    return unwrapList(
      await this.sb
        .from("person_relationships")
        .select("*")
        .eq("tenant_id", tenantId)
        .or(`from_person_id.eq.${personId},to_person_id.eq.${personId}`),
    );
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const { error } = await this.sb
      .from("person_relationships")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export class ConsentRepository {
  constructor(private readonly sb: SB) {}

  async record(row: TablesInsert<"person_consents">): Promise<Tables<"person_consents">> {
    return unwrap(
      await this.sb.from("person_consents").insert(row).select("*").single(),
    );
  }

  async listByPerson(tenantId: string, personId: string) {
    return unwrapList(
      await this.sb
        .from("person_consents")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .order("created_at", { ascending: false }),
    );
  }

  async revokeLatest(tenantId: string, personId: string, purposeCode: string) {
    const rows = unwrapList(
      await this.sb
        .from("person_consents")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .eq("purpose_code", purposeCode)
        .order("created_at", { ascending: false })
        .limit(1),
    );
    const latest = rows[0];
    if (!latest) return null;
    return unwrap(
      await this.sb
        .from("person_consents")
        .update({ granted: false, revoked_at: new Date().toISOString() })
        .eq("id", latest.id)
        .select("*")
        .single(),
    );
  }
}

export class VerificationRepository {
  constructor(private readonly sb: SB) {}

  async record(row: TablesInsert<"person_verifications">): Promise<Tables<"person_verifications">> {
    return unwrap(
      await this.sb
        .from("person_verifications")
        .insert(row)
        .select("*")
        .single(),
    );
  }

  async listByPerson(tenantId: string, personId: string) {
    return unwrapList(
      await this.sb
        .from("person_verifications")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("person_id", personId)
        .order("initiated_at", { ascending: false }),
    );
  }
}

// =====================================================================
// FACTORY
// =====================================================================

/**
 * Build a per-request bundle of repositories bound to the current
 * (user-scoped) Supabase client. Server functions call this at the top
 * of their handler and pass the specific repos they need into helpers.
 */
export function makeIdentityRepos(sb: SB) {
  return {
    persons: new PersonRepository(sb),
    patients: new PatientRepository(sb),
    doctors: new DoctorRepository(sb),
    employees: new EmployeeRepository(sb),
    franchiseOwners: new FranchiseOwnerRepository(sb),
    academyStudents: new AcademyStudentRepository(sb),
    leads: new LeadRepository(sb),
    corporateContacts: new CorporateContactRepository(sb),
    vendorContacts: new VendorContactRepository(sb),
    contacts: new ContactRepository(sb),
    addresses: new AddressRepository(sb),
    relationships: new RelationshipRepository(sb),
    consents: new ConsentRepository(sb),
    verifications: new VerificationRepository(sb),
  };
}
export type IdentityRepos = ReturnType<typeof makeIdentityRepos>;
