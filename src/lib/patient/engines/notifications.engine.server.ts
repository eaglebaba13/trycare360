import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  NotificationHistoryRepository,
  NotificationPreferencesRepository,
  PushTokenRepository,
} from "../repositories.server";
import { emitPatientEvent, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Notification engine — patient-facing surface. All actual channel
 * delivery (SMS, WhatsApp, email, push) is done by the platform
 * Notification Engine. This module only manages patient preferences,
 * push-token registration and history reads.
 */
export class NotificationEngine {
  constructor(private readonly sb: SB) {}

  async getPreferences(userId: string) {
    return new NotificationPreferencesRepository(this.sb).list(userId);
  }

  async updatePreference(userId: string, input: {
    category: string;
    channel: string;
    enabled: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
  }) {
    return new NotificationPreferencesRepository(this.sb).upsert({
      patient_user_id: userId,
      category: input.category,
      channel: input.channel,
      enabled: input.enabled,
      quiet_hours_start: input.quietHoursStart ?? null,
      quiet_hours_end: input.quietHoursEnd ?? null,
    });
  }

  async registerPushToken(userId: string, input: { provider: string; token: string; deviceId?: string | null }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new PushTokenRepository(this.sb).upsert({
      patient_user_id: userId,
      provider: input.provider,
      token: input.token,
      device_id: input.deviceId ?? null,
      is_active: true,
      last_used_at: new Date().toISOString(),
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.PushTokenRegistered,
      payload: { provider: input.provider, device_id: input.deviceId },
    });
    return row;
  }

  async removePushToken(userId: string, token: string) {
    await new PushTokenRepository(this.sb).deactivate(userId, token);
  }

  async listHistory(userId: string, limit = 100) {
    return new NotificationHistoryRepository(this.sb).list(userId, limit);
  }

  async markRead(userId: string, notificationId: string) {
    const repo = new NotificationHistoryRepository(this.sb);
    const updated = await repo.markRead(notificationId);
    if (updated.patient_user_id !== userId) throw new Error("Not found");
    const identity = await resolvePatientIdentity(this.sb, userId);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.NotificationRead,
      payload: { notification_id: notificationId },
    });
    return updated;
  }
}
