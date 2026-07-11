/**
 * Clinical Context Loader (server-only).
 *
 * Assembles the full 360° clinical context for a consultation in ONE call.
 * Every future workspace (Doctor, Therapist, AI Assistant, Patient Portal)
 * must consume this service instead of firing independent queries — this is
 * the stable integration point for cross-domain reads.
 *
 * Reuses existing primitives only — no duplicate business logic:
 *   - Person Registry (persons, patients)
 *   - Clinical repositories (encounters, problems, allergies, vitals, histories)
 *   - Scheduling appointments
 *   - Revenue events (billing summary)
 *   - Consent records
 *   - Session permissions (has_role / has_clinical_permission)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import {
  AllergyRepository,
  EncounterRepository,
  FamilyHistoryRepository,
  LifestyleRepository,
  MedicalHistoryRepository,
  ProblemRepository,
  VitalsRepository,
} from "./repositories.server";

type SB = SupabaseClient<Database>;

export interface ClinicalContext {
  person: Tables<"persons"> | null;
  patient: Tables<"patients"> | null;
  encounter: Tables<"clinical_encounters"> | null;
  allergies: Tables<"clinical_allergies">[];
  problems: Tables<"clinical_problems">[];
  vitals: Tables<"clinical_vitals">[];
  medicalHistory: Tables<"clinical_medical_history">[];
  familyHistory: Tables<"clinical_family_history">[];
  lifestyleHistory: Tables<"clinical_lifestyle_history"> | null;
  treatmentProtocols: Array<{ id: string; code: string; name: string }>;
  consentStatus: Tables<"person_consents">[];
  previousConsultations: Tables<"clinical_encounters">[];
  scheduling: {
    upcoming: Array<
      Pick<
        Tables<"appointments">,
        "id" | "starts_at" | "ends_at" | "status_code" | "appointment_type_id"
      >
    >;
  };
  billingSummary: {
    total: number;
    outstanding: number;
    recent: Array<
      Pick<Tables<"revenue_events">, "id" | "amount" | "occurred_at" | "category" | "source_module">
    >;
  };
  permissions: {
    canReadClinical: boolean;
    canWriteClinical: boolean;
    canManageKnowledge: boolean;
  };
}

export class ClinicalContextLoader {
  constructor(private readonly sb: SB) {}

  async getClinicalContext(args: {
    tenantId: string;
    personId: string;
    encounterId?: string | null;
    historyLimit?: number;
  }): Promise<ClinicalContext> {
    const historyLimit = args.historyLimit ?? 10;
    const encounters = new EncounterRepository(this.sb);
    const problems = new ProblemRepository(this.sb);
    const allergies = new AllergyRepository(this.sb);
    const vitals = new VitalsRepository(this.sb);
    const medical = new MedicalHistoryRepository(this.sb);
    const family = new FamilyHistoryRepository(this.sb);
    const lifestyle = new LifestyleRepository(this.sb);

    const [
      personRes,
      patientRes,
      encounterRes,
      problemsList,
      allergiesList,
      vitalsList,
      medicalList,
      familyList,
      lifestyleLatest,
      protocolsRes,
      consentRes,
      previousList,
      apptRes,
      revenueRes,
      canRead,
      canWrite,
      canManage,
    ] = await Promise.all([
      this.sb.from("persons").select("*").eq("id", args.personId).maybeSingle(),
      this.sb
        .from("patients")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .eq("person_id", args.personId)
        .maybeSingle(),
      args.encounterId
        ? this.sb.from("clinical_encounters").select("*").eq("id", args.encounterId).maybeSingle()
        : Promise.resolve({ data: null, error: null } as const),
      problems.listActive(args.tenantId, args.personId),
      allergies.listActive(args.tenantId, args.personId),
      vitals.listRecent(args.tenantId, args.personId, historyLimit),
      medical.list(args.tenantId, args.personId),
      family.list(args.tenantId, args.personId),
      lifestyle.latest(args.tenantId, args.personId),
      this.sb
        .from("clinical_treatment_protocols")
        .select("id, code, name")
        .or(`tenant_id.is.null,tenant_id.eq.${args.tenantId}`)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(50),
      this.sb
        .from("person_consents")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .eq("person_id", args.personId),
      encounters.listForPatient(args.tenantId, args.personId, historyLimit),
      this.sb
        .from("appointments")
        .select("id, starts_at, ends_at, status_code, appointment_type_id")
        .eq("tenant_id", args.tenantId)
        .eq("person_id", args.personId)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5),
      this.sb
        .from("revenue_events")
        .select("id, amount, occurred_at, category, source_module")
        .eq("tenant_id", args.tenantId)
        .eq("person_id", args.personId)
        .order("occurred_at", { ascending: false })
        .limit(20),
      this.sb.rpc("can_read_clinical", { _tenant: args.tenantId, _user: "" }),
      this.sb.rpc("can_write_clinical", { _tenant: args.tenantId, _user: "" }),
      this.sb.rpc("can_manage_clinical_knowledge", { _tenant: args.tenantId, _user: "" }),
    ]);

    const revenueRows = (revenueRes.data ?? []) as Array<
      Pick<Tables<"revenue_events">, "id" | "amount" | "occurred_at" | "category" | "source_module">
    >;
    const total = revenueRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

    return {
      person: (personRes.data ?? null) as Tables<"persons"> | null,
      patient: (patientRes.data ?? null) as Tables<"patients"> | null,
      encounter: (encounterRes.data ?? null) as Tables<"clinical_encounters"> | null,
      allergies: allergiesList,
      problems: problemsList,
      vitals: vitalsList,
      medicalHistory: medicalList,
      familyHistory: familyList,
      lifestyleHistory: lifestyleLatest,
      treatmentProtocols: (protocolsRes.data ?? []) as Array<{ id: string; code: string; name: string }>,
      consentStatus: (consentRes.data ?? []) as Tables<"person_consents">[],
      previousConsultations: previousList,
      scheduling: {
        upcoming: (apptRes.data ?? []) as ClinicalContext["scheduling"]["upcoming"],
      },
      billingSummary: {
        total,
        outstanding: 0, // no outstanding-balance primitive yet; reserved for AR module
        recent: revenueRows,
      },
      permissions: {
        canReadClinical: Boolean(canRead.data),
        canWriteClinical: Boolean(canWrite.data),
        canManageKnowledge: Boolean(canManage.data),
      },
    };
  }
}
