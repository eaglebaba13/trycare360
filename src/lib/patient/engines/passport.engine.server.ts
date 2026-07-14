import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import { HealthPassportRepository } from "../repositories.server";
import { emitPatientEvent, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Health Passport engine — compiles an emergency-safe patient
 * summary. Reads from the Clinical EMR (allergies, active problems,
 * medications) via the shared clinical tables and stores a compact
 * snapshot for offline / QR share. Signed sharing tokens are
 * placeholder-only and expected to be issued by the shareable-link
 * platform service.
 */
export class HealthPassportEngine {
  constructor(private readonly sb: SB) {}

  async build(userId: string): Promise<Tables<"patient_health_passport">> {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const passport = new HealthPassportRepository(this.sb);

    let allergies: string[] = [];
    let currentMeds: string[] = [];
    let chronic: string[] = [];

    if (identity.tenantId && identity.personId) {
      const [aRes, pRes, rxRes] = await Promise.all([
        this.sb
          .from("clinical_allergies")
          .select("substance_text")
          .eq("tenant_id", identity.tenantId)
          .eq("person_id", identity.personId)
          .eq("status", "active"),
        this.sb
          .from("clinical_problems")
          .select("problem_text")
          .eq("tenant_id", identity.tenantId)
          .eq("person_id", identity.personId)
          .eq("status", "active"),
        this.sb
          .from("clinical_prescriptions")
          .select("medication_text")
          .eq("tenant_id", identity.tenantId)
          .eq("person_id", identity.personId)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      allergies = ((aRes.data ?? []) as Array<{ substance_text: string | null }>)
        .map((r) => r.substance_text ?? "")
        .filter(Boolean);
      chronic = ((pRes.data ?? []) as Array<{ problem_text: string | null }>)
        .map((r) => r.problem_text ?? "")
        .filter(Boolean);
      currentMeds = ((rxRes.data ?? []) as Array<{ medication_text: string | null }>)
        .map((r) => r.medication_text ?? "")
        .filter(Boolean);
    }

    const existing = await passport.getByUser(userId);
    const row = await passport.upsert({
      patient_user_id: userId,
      allergies: allergies as never,
      current_medications: currentMeds as never,
      chronic_conditions: chronic as never,
      blood_group: existing?.blood_group ?? null,
      emergency_contact_name: existing?.emergency_contact_name ?? null,
      emergency_contact_phone: existing?.emergency_contact_phone ?? null,
      organ_donor: existing?.organ_donor ?? false,
      is_active: existing?.is_active ?? true,
      passport_code: existing?.passport_code ?? crypto.randomUUID().slice(0, 8).toUpperCase(),
      qr_payload: (existing?.qr_payload as never) ?? null,
      meta: (existing?.meta as never) ?? {},
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.PassportUpdated,
      payload: { passport_id: row.id },
    });
    return row;
  }

  async updateVisibility(userId: string, input: { isActive?: boolean; meta?: Record<string, unknown> }) {
    const passport = new HealthPassportRepository(this.sb);
    const existing = await passport.getByUser(userId);
    if (!existing) return this.build(userId);
    return passport.upsert({
      patient_user_id: userId,
      is_active: input.isActive ?? existing.is_active,
      meta: { ...(existing.meta as Record<string, unknown>), ...(input.meta ?? {}) } as never,
      allergies: existing.allergies as never,
      current_medications: existing.current_medications as never,
      chronic_conditions: existing.chronic_conditions as never,
      blood_group: existing.blood_group,
      emergency_contact_name: existing.emergency_contact_name,
      emergency_contact_phone: existing.emergency_contact_phone,
      organ_donor: existing.organ_donor,
      passport_code: existing.passport_code,
      qr_payload: existing.qr_payload as never,
    });
  }
}
