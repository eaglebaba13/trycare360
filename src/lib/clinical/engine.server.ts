/**
 * Clinical Encounter Engine (server-only).
 *
 * Single orchestration pipeline for creating and mutating encounters.
 * Every write path composes the same primitives — no duplicate logic:
 *
 *   Create Encounter
 *     ↓ Load Patient
 *     ↓ Load Clinical Knowledge (templates for encounterType)
 *     ↓ Load History (problems, medical, family, lifestyle)
 *     ↓ Load Allergies
 *     ↓ Load Contraindications (from knowledge layer)
 *     ↓ Load Vitals (latest)
 *     ↓ INSERT clinical_encounters
 *     ↓ Timeline (log_timeline_event)
 *     ↓ Workflow Event (emit_automation_event)
 *     ↓ Search Index (index_search_entity)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { CLINICAL_EVENTS, type ClinicalEvent } from "./events";
import {
  AllergyRepository,
  EncounterRepository,
  FamilyHistoryRepository,
  LifestyleRepository,
  MedicalHistoryRepository,
  ProblemRepository,
  VitalsRepository,
  type EncounterRow,
} from "./repositories.server";

type SB = SupabaseClient<Database>;

async function emitEvent(
  sb: SB,
  tenantId: string,
  event: ClinicalEvent,
  payload: Record<string, unknown>,
  entityRef?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await sb.rpc("emit_automation_event", {
      _tenant_id: tenantId,
      _event_type: event,
      _payload: payload as never,
      _entity_ref: (entityRef ?? null) as never,
    });
  } catch (err) {
    console.warn("[clinical] emit event failed", event, err);
  }
}

async function logTimeline(
  sb: SB,
  args: {
    tenantId: string;
    entityType: "person" | "encounter" | "patient";
    entityId: string;
    eventType: string;
    title: string;
    body?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.rpc("log_timeline_event", {
      _tenant_id: args.tenantId,
      _entity_type: args.entityType,
      _entity_id: args.entityId,
      _event_type: args.eventType,
      _title: args.title,
      _body: args.body ?? undefined,
      _meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[clinical] timeline log failed", args.eventType, err);
  }
}

async function indexSearch(
  sb: SB,
  args: {
    tenantId: string;
    entityType: string;
    entityId: string;
    title: string;
    subtitle?: string | null;
    body?: string | null;
    keywords?: string | null;
    url?: string | null;
    meta?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await sb.rpc("index_search_entity", {
      _tenant_id: args.tenantId,
      _entity_type: args.entityType,
      _entity_id: args.entityId,
      _title: args.title,
      _subtitle: args.subtitle ?? undefined,
      _body: args.body ?? undefined,
      _keywords: args.keywords ?? undefined,
      _url: args.url ?? undefined,
      _meta: (args.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[clinical] search index failed", args.entityId, err);
  }
}

// ---------------------------------------------------------------------------

export interface CreateEncounterInput {
  tenantId: string;
  patientId: string;
  encounterType: string;
  appointmentId?: string | null;
  branchId?: string | null;
  primaryDoctorId?: string | null;
  packageId?: string | null;
  chiefComplaint?: string | null;
  room?: string | null;
  source?: string | null;
  startedAt?: string | null;
  meta?: Record<string, unknown>;
  createdBy?: string | null;
}

export interface EncounterContext {
  patient: { id: string; full_name: string | null } | null;
  templates: Array<{ id: string; code: string; name: string }>;
  problems: Array<{ id: string; display: string; status: string }>;
  allergies: Array<{ id: string; substance: string; severity: string | null }>;
  contraindications: Array<{ id: string; name: string; code: string }>;
  vitalsLatest: { measured_at: string } | null;
  medicalHistoryCount: number;
  familyHistoryCount: number;
  lifestyleLatest: { recorded_at: string } | null;
}

export class EncounterEngine {
  private readonly encounters: EncounterRepository;
  private readonly problems: ProblemRepository;
  private readonly allergies: AllergyRepository;
  private readonly vitals: VitalsRepository;
  private readonly medical: MedicalHistoryRepository;
  private readonly family: FamilyHistoryRepository;
  private readonly lifestyle: LifestyleRepository;

  constructor(private readonly sb: SB) {
    this.encounters = new EncounterRepository(sb);
    this.problems = new ProblemRepository(sb);
    this.allergies = new AllergyRepository(sb);
    this.vitals = new VitalsRepository(sb);
    this.medical = new MedicalHistoryRepository(sb);
    this.family = new FamilyHistoryRepository(sb);
    this.lifestyle = new LifestyleRepository(sb);
  }

  /**
   * Load the pre-encounter context. Pure reads (RLS-scoped).
   */
  async loadContext(tenantId: string, patientId: string, encounterType: string): Promise<EncounterContext> {
    const [
      patient,
      templates,
      problems,
      allergies,
      contraindications,
      vitalsLatest,
      medicalList,
      familyList,
      lifestyleLatest,
    ] = await Promise.all([
      this.sb.from("persons").select("id, full_name").eq("id", patientId).maybeSingle(),
      this.sb
        .from("clinical_soap_templates")
        .select("id, code, name, specialty")
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .eq("is_active", true)
        .or(`specialty.is.null,specialty.eq.${encounterType}`),
      this.problems.listActive(tenantId, patientId),
      this.allergies.listActive(tenantId, patientId),
      this.sb
        .from("clinical_contraindication_rules")
        .select("id, name, code")
        .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
        .eq("is_active", true),
      this.vitals.latest(tenantId, patientId),
      this.medical.list(tenantId, patientId),
      this.family.list(tenantId, patientId),
      this.lifestyle.latest(tenantId, patientId),
    ]);

    return {
      patient: (patient.data ?? null) as EncounterContext["patient"],
      templates: (templates.data ?? []) as EncounterContext["templates"],
      problems: problems.map((p) => ({ id: p.id, display: p.display, status: p.status })),
      allergies: allergies.map((a) => ({ id: a.id, substance: a.substance, severity: a.severity })),
      contraindications: (contraindications.data ?? []) as EncounterContext["contraindications"],
      vitalsLatest: vitalsLatest ? { measured_at: vitalsLatest.measured_at } : null,
      medicalHistoryCount: medicalList.length,
      familyHistoryCount: familyList.length,
      lifestyleLatest: lifestyleLatest ? { recorded_at: lifestyleLatest.recorded_at } : null,
    };
  }

  /**
   * Full orchestration: create the encounter, then emit timeline + event + search.
   */
  async createEncounter(input: CreateEncounterInput): Promise<{ encounter: EncounterRow; context: EncounterContext }> {
    const context = await this.loadContext(input.tenantId, input.patientId, input.encounterType);

    const encounter = await this.encounters.insert({
      tenant_id: input.tenantId,
      patient_id: input.patientId,
      encounter_type: input.encounterType,
      appointment_id: input.appointmentId ?? null,
      branch_id: input.branchId ?? null,
      primary_doctor_id: input.primaryDoctorId ?? null,
      package_id: input.packageId ?? null,
      chief_complaint: input.chiefComplaint ?? null,
      room: input.room ?? null,
      source: input.source ?? null,
      started_at: input.startedAt ?? new Date().toISOString(),
      status: "in_progress",
      meta: (input.meta ?? {}) as Json,
      created_by: input.createdBy ?? null,
    });

    await Promise.all([
      logTimeline(this.sb, {
        tenantId: input.tenantId,
        entityType: "person",
        entityId: input.patientId,
        eventType: "clinical.encounter.created",
        title: `Encounter started (${input.encounterType})`,
        body: input.chiefComplaint ?? null,
        meta: { encounter_id: encounter.id, doctor_id: input.primaryDoctorId ?? null },
      }),
      emitEvent(
        this.sb,
        input.tenantId,
        CLINICAL_EVENTS.ENCOUNTER_CREATED,
        {
          encounter_id: encounter.id,
          patient_id: input.patientId,
          encounter_type: input.encounterType,
          primary_doctor_id: input.primaryDoctorId ?? null,
          appointment_id: input.appointmentId ?? null,
          allergy_count: context.allergies.length,
          active_problem_count: context.problems.length,
        },
        { entity: "clinical_encounter", id: encounter.id },
      ),
      indexSearch(this.sb, {
        tenantId: input.tenantId,
        entityType: "clinical_encounter",
        entityId: encounter.id,
        title: `Encounter (${input.encounterType})`,
        subtitle: context.patient?.full_name ?? null,
        body: input.chiefComplaint ?? null,
        keywords: input.encounterType,
        meta: { patient_id: input.patientId },
      }),
    ]);

    return { encounter, context };
  }

  async updateEncounter(
    tenantId: string,
    id: string,
    patch: Record<string, unknown>,
    changedBy?: string | null,
  ): Promise<EncounterRow> {
    const encounter = await this.encounters.update(id, patch);
    const closing = patch.status === "closed" || patch.ended_at != null;

    await Promise.all([
      logTimeline(this.sb, {
        tenantId,
        entityType: "person",
        entityId: encounter.patient_id,
        eventType: closing ? "clinical.encounter.closed" : "clinical.encounter.updated",
        title: closing ? "Encounter closed" : "Encounter updated",
        meta: { encounter_id: id, changed_by: changedBy ?? null },
      }),
      emitEvent(
        this.sb,
        tenantId,
        closing ? CLINICAL_EVENTS.ENCOUNTER_CLOSED : CLINICAL_EVENTS.ENCOUNTER_UPDATED,
        { encounter_id: id, patient_id: encounter.patient_id, patch: patch as Record<string, unknown> },
        { entity: "clinical_encounter", id },
      ),
    ]);
    return encounter;
  }
}

export const clinicalHelpers = { emitEvent, logTimeline, indexSearch };
