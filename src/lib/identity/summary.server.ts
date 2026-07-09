/**
 * Patient Summary Service (Stage E).
 *
 * Composes a Patient 360 payload from identity + clinical + finance
 * tables. This is the single server-side shape consumed by the future
 * Patient 360 UI (Stage F). It returns `null` when the person exists
 * but has no patient role attached.
 *
 * The service is deliberately defensive: many downstream tables (labs,
 * appointments, subscriptions) may be empty or not-yet-modeled per
 * tenant, so each section falls back to `[]` on any error rather than
 * failing the whole summary.
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
    membership_tier: string | null;
    identity_status: string;
    verified: boolean;
  };
  latest_assessment: Tables<"person_verifications"> | null;
  appointments: Tables<"cms_appointment_requests">[];
  outstanding_payments: Array<{ id: string; amount: number; due_date: string | null; status: string }>;
  membership: { tier: string | null; renewal: string | null } | null;
  subscription: { plan: string | null; status: string | null } | null;
  clinical_alerts: Tables<"person_medical_alerts">[];
  emergency_contacts: Tables<"person_contacts">[];
  addresses: Tables<"person_addresses">[];
  tags: Tables<"person_tags">[];
}

async function safeList<T>(fn: () => Promise<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  try {
    const res = await fn();
    return res.data ?? [];
  } catch {
    return [];
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

    const [alerts, addresses, contacts, tags, verifs, appts] = await Promise.all([
      safeList<Tables<"person_medical_alerts">>(() =>
        this.sb
          .from("person_medical_alerts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .eq("is_active", true),
      ),
      safeList<Tables<"person_addresses">>(() =>
        this.sb.from("person_addresses").select("*").eq("tenant_id", tenantId).eq("person_id", personId),
      ),
      safeList<Tables<"person_contacts">>(() =>
        this.sb
          .from("person_contacts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .eq("is_emergency", true),
      ),
      safeList<Tables<"person_tags">>(() =>
        this.sb.from("person_tags").select("*").eq("tenant_id", tenantId).eq("person_id", personId),
      ),
      safeList<Tables<"person_verifications">>(() =>
        this.sb
          .from("person_verifications")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .order("initiated_at", { ascending: false })
          .limit(1),
      ),
      safeList<Tables<"cms_appointment_requests">>(() =>
        this.sb
          .from("cms_appointment_requests")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("person_id", personId)
          .order("preferred_date", { ascending: false })
          .limit(10),
      ),
    ]);

    return {
      overview: {
        person,
        patient,
        primary_doctor_id: (patient as { primary_doctor_id?: string | null }).primary_doctor_id ?? null,
        home_branch_id: (patient as { home_branch_id?: string | null }).home_branch_id ?? null,
        membership_tier:
          (person as { membership_tier?: string | null }).membership_tier ?? null,
        identity_status: person.identity_status,
        verified: verifs.length > 0 && verifs[0].status === "verified",
      },
      latest_assessment: verifs[0] ?? null,
      appointments: appts,
      outstanding_payments: [],
      membership: {
        tier: (person as { membership_tier?: string | null }).membership_tier ?? null,
        renewal: null,
      },
      subscription: null,
      clinical_alerts: alerts,
      emergency_contacts: contacts,
      addresses,
      tags,
    };
  }
}
