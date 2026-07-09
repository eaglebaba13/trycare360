/**
 * Master Person Registry — Server Functions (Stage B).
 *
 * All identity mutations enter through this module. Each function:
 *
 *   1. Validates input with a Zod schema from `validators.ts`.
 *   2. Requires an authenticated Supabase session (RLS applies).
 *   3. Delegates database work to a repository from `repositories.server.ts`.
 *   4. Emits a domain event via `emitIdentityEvent()`.
 *
 * The `AttachRole` and `DetachRole` functions dispatch across all role
 * extension tables via a single wire schema; role-specific fields are
 * accepted as a free-form `fields` map and narrowed per role.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  addressUpsertSchema,
  archivePersonSchema,
  attachRoleSchema,
  consentRecordSchema,
  contactUpsertSchema,
  createPatientFromPersonSchema,
  detachRoleSchema,
  normalizeEmail,
  normalizePhone,
  personCreateSchema,
  personIdSchema,
  personSearchSchema,
  personUpdateSchema,
  relationshipUpsertSchema,
  verifyPersonSchema,
  type AttachRoleInput,
  type RoleCode,
} from "./validators";

// -----------------------------------------------------------------------
// PERSON — CRUD + search
// -----------------------------------------------------------------------

export const createPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const { emitIdentityEvent, hashNationalId } = await import("./events.server");
    const repos = makeIdentityRepos(context.supabase);

    const phone = normalizePhone(data.phone, { defaultDial: data.default_dial });
    const email = normalizeEmail(data.email);

    // Best-effort duplicate short-circuit: return the existing row when a
    // strong identifier already matches. The full dedup engine (Stage C)
    // will replace this with candidate scoring.
    if (phone || email) {
      const existing = await repos.persons.findByPhoneOrEmail(data.tenant_id, phone, email);
      if (existing) return { person: existing, deduped: true as const };
    }

    const row = await repos.persons.insert({
      tenant_id: data.tenant_id,
      full_name: data.full_name,
      first_name: data.first_name ?? null,
      middle_name: data.middle_name ?? null,
      last_name: data.last_name ?? null,
      display_name: data.display_name ?? null,
      salutation: data.salutation ?? null,
      gender: data.gender ?? null,
      dob: data.dob ?? null,
      photo_url: data.photo_url ?? null,
      phone_e164: phone,
      email_normalized: email,
      national_id_hash: hashNationalId(data.national_id ?? null),
      preferred_language: data.preferred_language ?? null,
      preferred_channel_code: data.preferred_channel_code ?? null,
      timezone: data.timezone ?? null,
      marketing_opt_in: data.marketing_opt_in ?? false,
      service_opt_in: data.service_opt_in ?? true,
      transactional_opt_in: data.transactional_opt_in ?? true,
      vip_flag: data.vip_flag ?? false,
    });

    await emitIdentityEvent(context.supabase, {
      tenantId: data.tenant_id,
      eventType: "person.created",
      payload: { person_id: row.id },
      entityRef: { type: "person", id: row.id },
    });

    return { person: row, deduped: false as const };
  });

export const updatePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const { emitIdentityEvent, hashNationalId } = await import("./events.server");
    const repos = makeIdentityRepos(context.supabase);

    const { id, tenant_id, phone, email, national_id, default_dial, ...rest } = data;
    const patch: Record<string, unknown> = { ...rest };
    if (phone !== undefined) patch.phone_e164 = normalizePhone(phone, { defaultDial: default_dial });
    if (email !== undefined) patch.email_normalized = normalizeEmail(email);
    if (national_id !== undefined) patch.national_id_hash = hashNationalId(national_id);

    const row = await repos.persons.update(tenant_id, id, patch);
    await emitIdentityEvent(context.supabase, {
      tenantId: tenant_id,
      eventType: "person.updated",
      payload: { person_id: id, fields: Object.keys(patch) },
      entityRef: { type: "person", id },
    });
    return { person: row };
  });

export const getPerson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const person = await repos.persons.getById(data.tenant_id, data.id);
    return { person };
  });

export const searchPerson = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personSearchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const rows = await repos.persons.search({
      tenantId: data.tenant_id,
      query: data.query,
      identityStatus: data.identity_status,
      vipOnly: data.vip_only,
      limit: data.limit,
      offset: data.offset,
    });
    return { rows, limit: data.limit, offset: data.offset };
  });

export const archivePerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => archivePersonSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const { emitIdentityEvent } = await import("./events.server");
    const repos = makeIdentityRepos(context.supabase);
    const row = await repos.persons.archive(data.tenant_id, data.id);
    await emitIdentityEvent(context.supabase, {
      tenantId: data.tenant_id,
      eventType: "person.archived",
      payload: { person_id: data.id, reason: data.reason ?? null },
      entityRef: { type: "person", id: data.id },
    });
    return { person: row };
  });

// -----------------------------------------------------------------------
// VERIFICATION
// -----------------------------------------------------------------------

export const verifyPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => verifyPersonSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const { hashNationalId } = await import("./events.server");
    const repos = makeIdentityRepos(context.supabase);
    const row = await repos.verifications.record({
      tenant_id: data.tenant_id,
      person_id: data.person_id,
      method: data.method,
      status: data.status,
      document_type: data.document_type ?? null,
      document_number_hash: hashNationalId(data.document_number ?? null),
      document_url: data.document_url ?? null,
      provider: data.provider ?? null,
      provider_ref: data.provider_ref ?? null,
      expires_at: data.expires_at ?? null,
      metadata: (data.metadata ?? {}) as never,
      initiated_at: new Date().toISOString(),
      verified_at: data.status === "verified" ? new Date().toISOString() : null,
      verifier_id: context.userId,
    });
    return { verification: row };
  });

// -----------------------------------------------------------------------
// ROLE ATTACH / DETACH
// -----------------------------------------------------------------------

function pickString(fields: Record<string, unknown> | undefined, key: string): string | null {
  const v = fields?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}
function pickUuid(fields: Record<string, unknown> | undefined, key: string): string | null {
  const v = fields?.[key];
  return typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

/** Build the role-specific insert payload for a given role. */
function buildRolePayload(role: RoleCode, input: AttachRoleInput) {
  const base = {
    tenant_id: input.tenant_id,
    person_id: input.person_id,
    status: pickString(input.fields, "status") ?? "active",
  };
  const f = input.fields ?? {};
  switch (role) {
    case "patient":
      return { table: "patients" as const, row: {
        ...base,
        mrn: pickString(f, "mrn"),
        blood_group: pickString(f, "blood_group"),
        primary_doctor_id: pickUuid(f, "primary_doctor_id"),
        home_branch_id: pickUuid(f, "home_branch_id"),
      } };
    case "doctor":
      return { table: "person_doctors" as const, row: {
        ...base,
        registration_number: pickString(f, "registration_number"),
        specialty: pickString(f, "specialty"),
        primary_branch_id: pickUuid(f, "primary_branch_id"),
      } };
    case "employee":
      return { table: "person_employees" as const, row: {
        ...base,
        employee_code: pickString(f, "employee_code"),
        department_id: pickUuid(f, "department_id"),
        designation: pickString(f, "designation"),
      } };
    case "franchise_owner":
      return { table: "person_franchise_owners" as const, row: {
        ...base,
        franchise_tier: pickString(f, "franchise_tier"),
        primary_branch_id: pickUuid(f, "primary_branch_id"),
      } };
    case "academy_student":
      return { table: "person_academy_students" as const, row: {
        ...base,
        enrollment_code: pickString(f, "enrollment_code"),
      } };
    case "lead":
      return { table: "person_leads" as const, row: {
        ...base,
        source: pickString(f, "source"),
        owner_id: pickUuid(f, "owner_id"),
      } };
    case "corporate_contact":
      return { table: "person_corporate_contacts" as const, row: {
        ...base,
        company_id: pickUuid(f, "company_id"),
        role_at_company: pickString(f, "role_at_company"),
      } };
    case "vendor_contact":
      return { table: "person_vendor_contacts" as const, row: {
        ...base,
        vendor_company_id: pickUuid(f, "vendor_company_id"),
        role_at_vendor: pickString(f, "role_at_vendor"),
      } };
  }
}

export const attachRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attachRoleSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { emitIdentityEvent } = await import("./events.server");
    const spec = buildRolePayload(data.role, data);

    const { data: row, error } = await context.supabase
      .from(spec.table)
      // biome-ignore lint/suspicious/noExplicitAny: dispatch over role union
      .upsert(spec.row as any, { onConflict: "tenant_id,person_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await emitIdentityEvent(context.supabase, {
      tenantId: data.tenant_id,
      eventType: data.role === "patient" ? "patient.created" : "role.attached",
      payload: { person_id: data.person_id, role: data.role },
      entityRef: { type: data.role, id: data.person_id },
    });
    return { attached: true, role: data.role, row };
  });

export const detachRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => detachRoleSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { emitIdentityEvent } = await import("./events.server");
    const tableByRole: Record<RoleCode, string> = {
      patient: "patients",
      doctor: "person_doctors",
      employee: "person_employees",
      franchise_owner: "person_franchise_owners",
      academy_student: "person_academy_students",
      lead: "person_leads",
      corporate_contact: "person_corporate_contacts",
      vendor_contact: "person_vendor_contacts",
    };
    const table = tableByRole[data.role];
    // biome-ignore lint/suspicious/noExplicitAny: dynamic table dispatch
    const { error } = await (context.supabase.from(table as any) as any)
      .update({ status: "inactive" })
      .eq("tenant_id", data.tenant_id)
      .eq("person_id", data.person_id);
    if (error) throw new Error(error.message);

    await emitIdentityEvent(context.supabase, {
      tenantId: data.tenant_id,
      eventType: "role.detached",
      payload: { person_id: data.person_id, role: data.role, reason: data.reason ?? null },
      entityRef: { type: data.role, id: data.person_id },
    });
    return { detached: true, role: data.role };
  });

// -----------------------------------------------------------------------
// PATIENT
// -----------------------------------------------------------------------

export const createPatientFromPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPatientFromPersonSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const { emitIdentityEvent } = await import("./events.server");
    const repos = makeIdentityRepos(context.supabase);

    const existing = await repos.patients.getByPerson(data.tenant_id, data.person_id);
    if (existing) return { patient: existing, created: false as const };

    const row = await repos.patients.create({
      tenant_id: data.tenant_id,
      person_id: data.person_id,
      mrn: data.mrn ?? null,
      blood_group: data.blood_group ?? null,
      primary_doctor_id: data.primary_doctor_id ?? null,
      home_branch_id: data.home_branch_id ?? null,
      status: "active",
    });

    await emitIdentityEvent(context.supabase, {
      tenantId: data.tenant_id,
      eventType: "patient.created",
      payload: { person_id: data.person_id, patient_id: row.id },
      entityRef: { type: "patient", id: row.id },
    });
    return { patient: row, created: true as const };
  });

export const getPatientSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const summary = await repos.patients.getSummary(data.tenant_id, data.id);
    return { summary };
  });

// -----------------------------------------------------------------------
// CONTACT / ADDRESS / RELATIONSHIP / CONSENT — thin passthroughs
// (No dedicated events; person.updated fires from the trigger-driven
//  primary-projection path if you also update `persons` after these.)
// -----------------------------------------------------------------------

export const upsertContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contactUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const normalized = data.channel === "email"
      ? (normalizeEmail(data.value_raw) ?? data.value_raw)
      : (normalizePhone(data.value_raw, { defaultDial: data.country_code }) ?? data.value_raw);
    const row = await repos.contacts.upsert({
      id: data.id,
      tenant_id: data.tenant_id,
      person_id: data.person_id,
      channel: data.channel,
      value_raw: data.value_raw,
      value_normalized: normalized,
      country_code: data.country_code ?? null,
      label: data.label ?? null,
      is_primary: data.is_primary ?? false,
      is_verified: data.is_verified ?? false,
      opt_in: data.opt_in ?? true,
      do_not_contact: data.do_not_contact ?? false,
    });
    return { contact: row };
  });

export const upsertAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addressUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const row = await repos.addresses.upsert({
      id: data.id,
      tenant_id: data.tenant_id,
      person_id: data.person_id,
      address_type: data.address_type,
      line1: data.line1,
      line2: data.line2 ?? null,
      area: data.area ?? null,
      city: data.city ?? null,
      district: data.district ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      pincode: data.pincode ?? null,
      landmark: data.landmark ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      is_primary: data.is_primary ?? false,
    });
    return { address: row };
  });

export const upsertRelationship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => relationshipUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const row = await repos.relationships.upsert({
      tenant_id: data.tenant_id,
      from_person_id: data.from_person_id,
      to_person_id: data.to_person_id,
      relationship_code: data.relationship_code,
      is_primary: data.is_primary ?? false,
      is_emergency: data.is_emergency ?? false,
      notes: data.notes ?? null,
      valid_from: data.valid_from ?? null,
      valid_to: data.valid_to ?? null,
    });
    return { relationship: row };
  });

export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => consentRecordSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { makeIdentityRepos } = await import("./repositories.server");
    const repos = makeIdentityRepos(context.supabase);
    const row = await repos.consents.record({
      tenant_id: data.tenant_id,
      person_id: data.person_id,
      purpose_code: data.purpose_code,
      consent_version: data.consent_version,
      granted: data.granted,
      granted_at: data.granted ? new Date().toISOString() : null,
      revoked_at: data.granted ? null : new Date().toISOString(),
      source: data.source ?? null,
      evidence_url: data.evidence_url ?? null,
    });
    return { consent: row };
  });
