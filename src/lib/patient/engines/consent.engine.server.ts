import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DigitalConsentRepository } from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Consent engine — records versioned digital consents. Reuses the
 * platform Clinical / Data Foundation consent contract. Withdrawn
 * consents are never hard-deleted — they carry a revoked_at
 * timestamp so the audit trail remains complete.
 */
export class ConsentEngine {
  constructor(private readonly sb: SB) {}

  async list(userId: string) {
    return new DigitalConsentRepository(this.sb).list(userId);
  }

  async record(userId: string, input: { consentType: string; version: string; signature?: string | null; meta?: Record<string, unknown> }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new DigitalConsentRepository(this.sb).insert({
      patient_user_id: userId,
      tenant_id: identity.tenantId,
      consent_type: input.consentType,
      version: input.version,
      signature: input.signature ?? null,
      status: "granted",
      granted_at: new Date().toISOString(),
      meta: (input.meta ?? {}) as never,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.ConsentGranted,
      payload: { consent_id: row.id, consent_type: input.consentType, version: input.version },
      entityRef: { type: "patient_digital_consent", id: row.id },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_digital_consent",
      entityId: row.id,
      eventType: PATIENT_EVENTS.ConsentGranted,
      title: `Consent granted: ${input.consentType} v${input.version}`,
    });
    return row;
  }

  async withdraw(userId: string, consentId: string) {
    const repo = new DigitalConsentRepository(this.sb);
    const identity = await resolvePatientIdentity(this.sb, userId);
    const updated = await repo.update(consentId, {
      status: "revoked",
      revoked_at: new Date().toISOString(),
    });
    if (updated.patient_user_id !== userId) throw new Error("Not found");
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.ConsentRevoked,
      payload: { consent_id: consentId },
    });
    return updated;
  }
}
