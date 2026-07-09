/**
 * Patient Summary Service (Stage E).
 *
 * Composes a Patient 360 payload from identity + clinical tables. This
 * is the single server-side shape consumed by the future Patient 360
 * UI (Stage F). Returns `null` when the person exists but has no
 * patient role attached.
 *
 * The service is deliberately defensive: many downstream tables
 * (labs, subscriptions, payments) are not yet modeled per tenant, so
 * each section falls back to `[]`/`null` rather than failing the
 * whole summary.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export interface PatientSummary {
  overview: {
    person: Tables<"persons">;
    patient: Tables<"patients">;
    primary_doctor_id: string | null;
    home_branch_id: string | null;
    identity_status: string;
    verified: boolean;
  };
  latest_assessment: Tables<"person_verifications"> | null;
  outstanding_payments: Array<{ id: string; amount: number; due_date: string | null; status: string }>;
  membership: { tier: string | null; renewal: string | null } | null;
  subscription: { plan: string | null; status: string | null } | null;
  clinical_alerts: Tables<"person_medical_alerts">[];
  contacts: Tables<"person_contacts">[];
  addresses: Tables<"person_addresses">[];
  tags: Tables<"person_tags">[];
}

async function safeList<T>(p: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const res = await p;
    return res.data ?? [];
  } catch {
    return [];
  }
}

async function safeSingle<T>(
  p: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  try {
    const res = await p;
    return res.data ?? null;
  } catch {
    return null;
  }
}

export class SummaryService {
  constructor(private readonly sb: SB) {}

  async patientSummary(tenantId: string, personId: string): Promise<PatientSummary | null> {
    const { data: person } = await this.sb
      .from("persons")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", personId)
      .maybeSingle();
    if (!person) return null;

    const { data: patient } = await this.sb
      .from("patients")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("person_id", personId)
      .maybeSingle();
    if (!patient) return null;

    const [alerts, addresses, contacts, tags, verifs] = await Promise.all([
      safeList<Tables<"person_medical_alerts">>(
        this.sb
          .from("person_medical_alerts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .eq("is_active", true),
      ),
      safeList<Tables<"person_addresses">>(
        this.sb.from("person_addresses").select("*").eq("tenant_id", tenantId).eq("person_id", personId),
      ),
      safeList<Tables<"person_contacts">>(
        this.sb.from("person_contacts").select("*").eq("tenant_id", tenantId).eq("person_id", personId),
      ),
      safeList<Tables<"person_tags">>(
        this.sb.from("person_tags").select("*").eq("tenant_id", tenantId).eq("person_id", personId),
      ),
      safeList<Tables<"person_verifications">>(
        this.sb
          .from("person_verifications")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .order("initiated_at", { ascending: false })
          .limit(1),
      ),
    ]);
    void safeSingle;

    return {
      overview: {
        person,
        patient,
        primary_doctor_id:
          (patient as unknown as { primary_doctor_id?: string | null }).primary_doctor_id ?? null,
        home_branch_id:
          (patient as unknown as { home_branch_id?: string | null }).home_branch_id ?? null,
        identity_status: person.identity_status,
        verified: person.verification_status === "verified",
      },
      latest_assessment: verifs[0] ?? null,
      outstanding_payments: [],
      membership: null,
      subscription: null,
      clinical_alerts: alerts,
      contacts,
      addresses,
      tags,
    };
  }
}
