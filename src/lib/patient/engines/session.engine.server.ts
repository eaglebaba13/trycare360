import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PatientActivityRepository,
  PortalSessionRepository,
} from "../repositories.server";
import { emitPatientEvent, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Session engine — records portal login/logout and per-device
 * sessions. Suspicious-session detection is delegated to the
 * platform Security module; this engine only emits the events.
 */
export class SessionEngine {
  constructor(private readonly sb: SB) {}

  async startSession(userId: string, input: { deviceId?: string | null; ipAddress?: string | null; userAgent?: string | null }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new PortalSessionRepository(this.sb).insert({
      patient_user_id: userId,
      device_id: input.deviceId ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      started_at: new Date().toISOString(),
    });
    await new PatientActivityRepository(this.sb).insert({
      patient_user_id: userId,
      action: PATIENT_EVENTS.Login,
      entity_type: "patient_portal_session",
      entity_id: row.id,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.Login,
      payload: { session_id: row.id },
    });
    return row;
  }

  async list(userId: string, limit = 50) {
    return new PortalSessionRepository(this.sb).list(userId, limit);
  }

  async revoke(userId: string, sessionId: string) {
    const repo = new PortalSessionRepository(this.sb);
    const sessions = await repo.list(userId, 200);
    const s = sessions.find((x) => x.id === sessionId);
    if (!s) throw new Error("Session not found");
    const endedAt = new Date().toISOString();
    const duration = s.started_at ? Math.round((Date.parse(endedAt) - Date.parse(s.started_at)) / 1000) : null;
    const updated = await repo.end(sessionId, endedAt, duration);
    const identity = await resolvePatientIdentity(this.sb, userId);
    await new PatientActivityRepository(this.sb).insert({
      patient_user_id: userId,
      action: PATIENT_EVENTS.Logout,
      entity_type: "patient_portal_session",
      entity_id: sessionId,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.Logout,
      payload: { session_id: sessionId },
    });
    return updated;
  }
}
