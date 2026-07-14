import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  PatientProfileRepository,
  PatientPreferencesRepository,
  PatientSettingsRepository,
  SavedDoctorRepository,
  FavouriteRepository,
  BookmarkRepository,
} from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export class PatientProfileEngine {
  constructor(private readonly sb: SB) {}

  async getProfile(userId: string) {
    const repo = new PatientProfileRepository(this.sb);
    const existing = await repo.getByUser(userId);
    if (existing) return existing;
    return repo.upsert({ patient_user_id: userId });
  }

  async updateProfile(
    userId: string,
    patch: {
      displayName?: string | null;
      avatarUrl?: string | null;
      coverUrl?: string | null;
      bio?: string | null;
      locale?: string | null;
      timezone?: string | null;
      meta?: Record<string, unknown>;
    },
  ) {
    const repo = new PatientProfileRepository(this.sb);
    await this.getProfile(userId); // ensure row
    const identity = await resolvePatientIdentity(this.sb, userId);
    const updated = await repo.update(userId, {
      display_name: patch.displayName ?? undefined,
      avatar_url: patch.avatarUrl ?? undefined,
      cover_url: patch.coverUrl ?? undefined,
      bio: patch.bio ?? undefined,
      locale: patch.locale ?? undefined,
      timezone: patch.timezone ?? undefined,
      meta: (patch.meta as never) ?? undefined,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.ProfileUpdated,
      payload: { patient_user_id: userId, changes: Object.keys(patch) },
      entityRef: { type: "patient_profile", id: updated.id },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_profile",
      entityId: updated.id,
      eventType: PATIENT_EVENTS.ProfileUpdated,
      title: "Patient profile updated",
      meta: { fields: Object.keys(patch) },
    });
    return updated;
  }

  async getPreferences(userId: string) {
    return new PatientPreferencesRepository(this.sb).list(userId);
  }
  async upsertPreference(userId: string, input: { category: string; key: string; value: unknown }) {
    const row = await new PatientPreferencesRepository(this.sb).upsert({
      patient_user_id: userId,
      category: input.category,
      key: input.key,
      value: input.value as never,
    } as TablesInsert<"patient_preferences">);
    const identity = await resolvePatientIdentity(this.sb, userId);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.PreferenceUpdated,
      payload: { category: input.category, key: input.key },
    });
    return row;
  }

  async getSettings(userId: string) {
    const row = await new PatientSettingsRepository(this.sb).get(userId);
    return row ?? { patient_user_id: userId, settings: {} };
  }
  async updateSettings(userId: string, settings: Record<string, unknown>) {
    return new PatientSettingsRepository(this.sb).upsert({
      patient_user_id: userId,
      settings: settings as never,
    });
  }

  async listSavedDoctors(userId: string) {
    return new SavedDoctorRepository(this.sb).list(userId);
  }
  async listFavourites(userId: string) {
    return new FavouriteRepository(this.sb).list(userId);
  }
  async listBookmarks(userId: string) {
    return new BookmarkRepository(this.sb).list(userId);
  }
}
