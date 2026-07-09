/**
 * Identity Service Layer (Stage E).
 *
 * Reusable, composable services that sit BETWEEN server functions and
 * repositories. They add cross-cutting behavior — feature-flag gates,
 * cache invalidation, event emission, and multi-repo coordination —
 * that neither the RPC boundary nor the raw DB layer should own.
 *
 * Server functions in `services.functions.ts` and the pre-existing
 * `persons.functions.ts` / `merge.functions.ts` / `dedup.functions.ts`
 * all call these services rather than talking to repositories directly.
 *
 * Every service accepts a Supabase client in the constructor so the
 * caller controls auth context (user-scoped for RLS, admin for jobs).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "@/integrations/supabase/types";
import { makeIdentityRepos } from "./repositories.server";
import {
  invalidatePerson,
  invalidatePersons,
  PersonCache,
} from "./cache.server";
import { emitIdentityEvent, hashNationalId } from "./events.server";
import { FeatureService } from "./features.server";
import { normalizeEmail, normalizePhone } from "./validators";
import type { PersonCreateInput, PersonUpdateInput } from "./validators";

type SB = SupabaseClient<Database>;

// =====================================================================
// PersonService
// =====================================================================

export class PersonService {
  private repos = makeIdentityRepos(this.sb);
  private cache = new PersonCache(this.sb);
  private features = new FeatureService(this.sb);

  constructor(private readonly sb: SB) {}

  async create(input: PersonCreateInput): Promise<{ person: Tables<"persons">; deduped: boolean }> {
    const phone = normalizePhone(input.phone, { defaultDial: input.default_dial });
    const email = normalizeEmail(input.email);

    if (phone || email) {
      const existing = await this.repos.persons.findByPhoneOrEmail(input.tenant_id, phone, email);
      if (existing) return { person: existing, deduped: true };
    }

    const useNationalId = await this.features.isEnabled(input.tenant_id, "identity.national_id");
    const row = await this.repos.persons.insert({
      tenant_id: input.tenant_id,
      full_name: input.full_name,
      first_name: input.first_name ?? null,
      middle_name: input.middle_name ?? null,
      last_name: input.last_name ?? null,
      display_name: input.display_name ?? null,
      salutation: input.salutation ?? null,
      gender: input.gender ?? null,
      dob: input.dob ?? null,
      photo_url: input.photo_url ?? null,
      phone_e164: phone,
      email_normalized: email,
      national_id_hash: useNationalId ? hashNationalId(input.national_id ?? null) : null,
      preferred_language: input.preferred_language ?? null,
      preferred_channel_code: input.preferred_channel_code ?? null,
      timezone: input.timezone ?? null,
      marketing_opt_in: input.marketing_opt_in ?? false,
      service_opt_in: input.service_opt_in ?? true,
      transactional_opt_in: input.transactional_opt_in ?? true,
      vip_flag: input.vip_flag ?? false,
    });
    await emitIdentityEvent(this.sb, {
      tenantId: input.tenant_id,
      eventType: "person.created",
      payload: { person_id: row.id },
      entityRef: { type: "person", id: row.id },
    });
    invalidatePerson(input.tenant_id, row.id);
    return { person: row, deduped: false };
  }

  async update(input: PersonUpdateInput & { id: string }): Promise<Tables<"persons">> {
    const patch: Record<string, unknown> = { ...input };
    delete patch.id;
    delete patch.tenant_id;
    if ("phone" in input) {
      patch.phone_e164 = normalizePhone(input.phone, { defaultDial: input.default_dial });
      delete patch.phone;
      delete patch.default_dial;
    }
    if ("email" in input) {
      patch.email_normalized = normalizeEmail(input.email);
      delete patch.email;
    }
    if ("national_id" in input) {
      patch.national_id_hash = hashNationalId(input.national_id as string | null);
      delete patch.national_id;
    }
    const row = await this.repos.persons.update(input.tenant_id, input.id, patch);
    await emitIdentityEvent(this.sb, {
      tenantId: input.tenant_id,
      eventType: "person.updated",
      payload: { person_id: input.id },
      entityRef: { type: "person", id: input.id },
    });
    invalidatePerson(input.tenant_id, input.id);
    return row;
  }

  async archive(tenantId: string, id: string, reason: string | null): Promise<Tables<"persons">> {
    const row = await this.repos.persons.archive(tenantId, id);
    await emitIdentityEvent(this.sb, {
      tenantId,
      eventType: "person.archived",
      payload: { person_id: id, reason },
      entityRef: { type: "person", id },
    });
    invalidatePerson(tenantId, id);
    return row;
  }

  get(tenantId: string, id: string) {
    return this.cache.get(tenantId, id);
  }

  getMany(tenantId: string, ids: string[]) {
    return this.cache.getMany(tenantId, ids);
  }
}

// =====================================================================
// PatientService
// =====================================================================

export class PatientService {
  private repos = makeIdentityRepos(this.sb);

  constructor(private readonly sb: SB) {}

  async createFromPerson(input: {
    tenant_id: string;
    person_id: string;
    home_branch_id?: string | null;
    primary_doctor_id?: string | null;
    membership_tier?: string | null;
    status?: string;
  }): Promise<Tables<"patients">> {
    const existing = await this.repos.patients.getByPerson(input.tenant_id, input.person_id);
    if (existing) return existing;
    const row = await this.repos.patients.create({
      tenant_id: input.tenant_id,
      person_id: input.person_id,
      home_branch_id: input.home_branch_id ?? null,
      primary_doctor_id: input.primary_doctor_id ?? null,
      status: input.status ?? "active",
    } as TablesInsert<"patients">);
    await emitIdentityEvent(this.sb, {
      tenantId: input.tenant_id,
      eventType: "patient.created",
      payload: { patient_id: row.id, person_id: input.person_id },
      entityRef: { type: "patient", id: row.id },
    });
    invalidatePerson(input.tenant_id, input.person_id);
    return row;
  }
}

// =====================================================================
// RelationshipService
// =====================================================================

export class RelationshipService {
  private repos = makeIdentityRepos(this.sb);
  private features = new FeatureService(this.sb);

  constructor(private readonly sb: SB) {}

  async link(input: TablesInsert<"person_relationships">): Promise<Tables<"person_relationships">> {
    await this.features.assertEnabled(input.tenant_id, "identity.family_relationships");
    const row = await this.repos.relationships.upsert(input);
    invalidatePersons(input.tenant_id, [input.from_person_id, input.to_person_id]);
    return row;
  }

  list(tenantId: string, personId: string) {
    return this.repos.relationships.listForPerson(tenantId, personId);
  }

  async unlink(tenantId: string, id: string): Promise<void> {
    await this.repos.relationships.delete(tenantId, id);
  }
}

// =====================================================================
// ConsentService
// =====================================================================

export class ConsentService {
  private repos = makeIdentityRepos(this.sb);

  constructor(private readonly sb: SB) {}

  record(input: TablesInsert<"person_consents">) {
    return this.repos.consents.record(input);
  }

  list(tenantId: string, personId: string) {
    return this.repos.consents.listByPerson(tenantId, personId);
  }

  revoke(tenantId: string, personId: string, purposeCode: string) {
    return this.repos.consents.revokeLatest(tenantId, personId, purposeCode);
  }
}

// =====================================================================
// CommunicationPreferenceService
// =====================================================================

export class CommunicationPreferenceService {
  private repos = makeIdentityRepos(this.sb);

  constructor(private readonly sb: SB) {}

  async setPreferences(input: {
    tenant_id: string;
    person_id: string;
    marketing_opt_in?: boolean;
    service_opt_in?: boolean;
    transactional_opt_in?: boolean;
    preferred_channel_code?: string | null;
    preferred_language?: string | null;
  }): Promise<Tables<"persons">> {
    const patch: Record<string, unknown> = {};
    for (const k of [
      "marketing_opt_in",
      "service_opt_in",
      "transactional_opt_in",
      "preferred_channel_code",
      "preferred_language",
    ] as const) {
      if (k in input && input[k] !== undefined) patch[k] = input[k];
    }
    const row = await this.repos.persons.update(input.tenant_id, input.person_id, patch);
    invalidatePerson(input.tenant_id, input.person_id);
    return row;
  }
}

// =====================================================================
// VerificationService
// =====================================================================

export class VerificationService {
  private repos = makeIdentityRepos(this.sb);

  constructor(private readonly sb: SB) {}

  record(input: TablesInsert<"person_verifications">) {
    invalidatePerson(input.tenant_id, input.person_id);
    return this.repos.verifications.record(input);
  }

  list(tenantId: string, personId: string) {
    return this.repos.verifications.listByPerson(tenantId, personId);
  }
}

// =====================================================================
// MergeService — thin façade over the SECURITY DEFINER RPCs.
// The DB owns the transaction, locking, snapshot, and rollback.
// =====================================================================

export class MergeService {
  private features = new FeatureService(this.sb);
  constructor(private readonly sb: SB) {}

  async preview(tenantId: string, sourceId: string, targetId: string) {
    await this.features.assertEnabled(tenantId, "identity.merge");
    const { data, error } = await this.sb.rpc("person_merge_preview", {
      _tenant_id: tenantId,
      _source_person_id: sourceId,
      _target_person_id: targetId,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  async execute(input: {
    tenant_id: string;
    source_person_id: string;
    target_person_id: string;
    reason?: string | null;
  }) {
    await this.features.assertEnabled(input.tenant_id, "identity.merge");
    const { data, error } = await this.sb.rpc("person_merge_execute", {
      _tenant_id: input.tenant_id,
      _source_person_id: input.source_person_id,
      _target_person_id: input.target_person_id,
      _reason: input.reason ?? null,
    });
    if (error) throw new Error(error.message);
    invalidatePersons(input.tenant_id, [input.source_person_id, input.target_person_id]);
    return data;
  }

  async unmerge(tenantId: string, historyId: string) {
    await this.features.assertEnabled(tenantId, "identity.merge");
    const { data, error } = await this.sb.rpc("person_merge_unmerge", {
      _tenant_id: tenantId,
      _history_id: historyId,
    });
    if (error) throw new Error(error.message);
    return data;
  }
}

// =====================================================================
// IdentityService — top-level façade.
// =====================================================================

export class IdentityService {
  readonly persons = new PersonService(this.sb);
  readonly patients = new PatientService(this.sb);
  readonly relationships = new RelationshipService(this.sb);
  readonly consents = new ConsentService(this.sb);
  readonly communication = new CommunicationPreferenceService(this.sb);
  readonly verifications = new VerificationService(this.sb);
  readonly merge = new MergeService(this.sb);
  readonly features = new FeatureService(this.sb);

  constructor(private readonly sb: SB) {}
}

export function makeIdentityServices(sb: SB): IdentityService {
  return new IdentityService(sb);
}
