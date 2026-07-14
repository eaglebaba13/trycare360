/**
 * Phase 2.10 Patient Portal — Stage 2 Repositories (server-only).
 *
 * Thin typed wrappers over Stage 1 `patient_*` tables. Repositories contain
 * NO business logic — only reads and writes. All orchestration
 * (delegation checks, wallet math, event emission, timeline, search)
 * lives in the engines under ./engines/*.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import { must, mustList, mustMaybe } from "./helpers.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

// ---------------------------------------------------------------------------
// Profile / preferences / settings
// ---------------------------------------------------------------------------
export class PatientProfileRepository {
  constructor(private readonly sb: SB) {}
  async getByUser(userId: string) {
    return mustMaybe<Tables<"patient_profiles">>(
      await this.sb.from("patient_profiles").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"patient_profiles">) {
    return must<Tables<"patient_profiles">>(
      await this.sb
        .from("patient_profiles")
        .upsert(row, { onConflict: "patient_user_id" })
        .select("*")
        .single(),
    );
  }
  async update(userId: string, patch: TablesUpdate<"patient_profiles">) {
    return must<Tables<"patient_profiles">>(
      await this.sb
        .from("patient_profiles")
        .update(patch)
        .eq("patient_user_id", userId)
        .select("*")
        .single(),
    );
  }
}

export class PatientPreferencesRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_preferences">>(
      await this.sb.from("patient_preferences").select("*").eq("patient_user_id", userId),
    );
  }
  async upsert(row: TablesInsert<"patient_preferences">) {
    return must<Tables<"patient_preferences">>(
      await this.sb
        .from("patient_preferences")
        .upsert(row, { onConflict: "patient_user_id,category,key" })
        .select("*")
        .single(),
    );
  }
}

export class PatientSettingsRepository {
  constructor(private readonly sb: SB) {}
  async get(userId: string) {
    return mustMaybe<Tables<"patient_settings">>(
      await this.sb.from("patient_settings").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"patient_settings">) {
    return must<Tables<"patient_settings">>(
      await this.sb
        .from("patient_settings")
        .upsert(row, { onConflict: "patient_user_id" })
        .select("*")
        .single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Devices / push tokens
// ---------------------------------------------------------------------------
export class PatientDeviceRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_devices">>(
      await this.sb
        .from("patient_devices")
        .select("*")
        .eq("patient_user_id", userId)
        .is("revoked_at", null),
    );
  }
  async upsert(row: TablesInsert<"patient_devices">) {
    return must<Tables<"patient_devices">>(
      await this.sb
        .from("patient_devices")
        .upsert(row, { onConflict: "patient_user_id,device_id" })
        .select("*")
        .single(),
    );
  }
  async revoke(id: string) {
    return must<Tables<"patient_devices">>(
      await this.sb
        .from("patient_devices")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

export class PushTokenRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_push_tokens">>(
      await this.sb
        .from("patient_push_tokens")
        .select("*")
        .eq("patient_user_id", userId)
        .eq("is_active", true),
    );
  }
  async upsert(row: TablesInsert<"patient_push_tokens">) {
    return must<Tables<"patient_push_tokens">>(
      await this.sb
        .from("patient_push_tokens")
        .upsert(row, { onConflict: "patient_user_id,token" })
        .select("*")
        .single(),
    );
  }
  async deactivate(userId: string, token: string) {
    await this.sb
      .from("patient_push_tokens")
      .update({ is_active: false })
      .eq("patient_user_id", userId)
      .eq("token", token);
  }
}

export class NotificationPreferencesRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_notification_preferences">>(
      await this.sb.from("patient_notification_preferences").select("*").eq("patient_user_id", userId),
    );
  }
  async upsert(row: TablesInsert<"patient_notification_preferences">) {
    return must<Tables<"patient_notification_preferences">>(
      await this.sb
        .from("patient_notification_preferences")
        .upsert(row, { onConflict: "patient_user_id,category,channel" })
        .select("*")
        .single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Health goals / metrics
// ---------------------------------------------------------------------------
export class HealthGoalRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_health_goals">>(
      await this.sb
        .from("patient_health_goals")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"patient_health_goals">) {
    return must<Tables<"patient_health_goals">>(
      await this.sb.from("patient_health_goals").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_health_goals">) {
    return must<Tables<"patient_health_goals">>(
      await this.sb.from("patient_health_goals").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export class HealthMetricRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, opts: { metricCode?: string; limit?: number } = {}) {
    let q = this.sb
      .from("patient_health_metrics")
      .select("*")
      .eq("patient_user_id", userId)
      .order("recorded_at", { ascending: false });
    if (opts.metricCode) q = q.eq("metric_code", opts.metricCode);
    q = q.limit(opts.limit ?? 100);
    return mustList<Tables<"patient_health_metrics">>(await q);
  }
  async insert(row: TablesInsert<"patient_health_metrics">) {
    return must<Tables<"patient_health_metrics">>(
      await this.sb.from("patient_health_metrics").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Documents / folders
// ---------------------------------------------------------------------------
export class PatientDocumentRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, opts: { folderId?: string | null; limit?: number } = {}) {
    let q = this.sb
      .from("patient_documents")
      .select("*")
      .eq("patient_user_id", userId)
      .order("created_at", { ascending: false });
    if (opts.folderId !== undefined) {
      q = opts.folderId === null ? q.is("folder_id", null) : q.eq("folder_id", opts.folderId);
    }
    q = q.limit(opts.limit ?? 200);
    return mustList<Tables<"patient_documents">>(await q);
  }
  async getById(id: string) {
    return mustMaybe<Tables<"patient_documents">>(
      await this.sb.from("patient_documents").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"patient_documents">) {
    return must<Tables<"patient_documents">>(
      await this.sb.from("patient_documents").insert(row).select("*").single(),
    );
  }
}

export class PatientDocumentFolderRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_document_folders">>(
      await this.sb
        .from("patient_document_folders")
        .select("*")
        .eq("patient_user_id", userId)
        .order("name", { ascending: true }),
    );
  }
  async insert(row: TablesInsert<"patient_document_folders">) {
    return must<Tables<"patient_document_folders">>(
      await this.sb.from("patient_document_folders").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Family / relationships
// ---------------------------------------------------------------------------
export class FamilyAccountRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_family_accounts">>(
      await this.sb.from("patient_family_accounts").select("*").eq("primary_user_id", userId),
    );
  }
  async insert(row: TablesInsert<"patient_family_accounts">) {
    return must<Tables<"patient_family_accounts">>(
      await this.sb.from("patient_family_accounts").insert(row).select("*").single(),
    );
  }
}

export class FamilyMemberRepository {
  constructor(private readonly sb: SB) {}
  async listForPrimary(userId: string) {
    return mustList<Tables<"patient_family_members">>(
      await this.sb.from("patient_family_members").select("*").eq("primary_user_id", userId),
    );
  }
  async listForMember(userId: string) {
    return mustList<Tables<"patient_family_members">>(
      await this.sb
        .from("patient_family_members")
        .select("*")
        .eq("member_user_id", userId)
        .eq("status", "accepted"),
    );
  }
  async getById(id: string) {
    return mustMaybe<Tables<"patient_family_members">>(
      await this.sb.from("patient_family_members").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"patient_family_members">) {
    return must<Tables<"patient_family_members">>(
      await this.sb.from("patient_family_members").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_family_members">) {
    return must<Tables<"patient_family_members">>(
      await this.sb.from("patient_family_members").update(patch).eq("id", id).select("*").single(),
    );
  }
  async delete(id: string) {
    const res = await this.sb.from("patient_family_members").delete().eq("id", id);
    if (res.error) throw new Error(res.error.message);
  }
}

export class PatientRelationshipRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_relationships">>(
      await this.sb.from("patient_relationships").select("*").eq("patient_user_id", userId),
    );
  }
  async insert(row: TablesInsert<"patient_relationships">) {
    return must<Tables<"patient_relationships">>(
      await this.sb.from("patient_relationships").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Portal sessions / activity
// ---------------------------------------------------------------------------
export class PortalSessionRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 50) {
    return mustList<Tables<"patient_portal_sessions">>(
      await this.sb
        .from("patient_portal_sessions")
        .select("*")
        .eq("patient_user_id", userId)
        .order("started_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_portal_sessions">) {
    return must<Tables<"patient_portal_sessions">>(
      await this.sb.from("patient_portal_sessions").insert(row).select("*").single(),
    );
  }
  async end(id: string, endedAt: string, durationSeconds: number | null) {
    return must<Tables<"patient_portal_sessions">>(
      await this.sb
        .from("patient_portal_sessions")
        .update({ ended_at: endedAt, duration_seconds: durationSeconds })
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

export class PatientActivityRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 100) {
    return mustList<Tables<"patient_activity_log">>(
      await this.sb
        .from("patient_activity_log")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_activity_log">) {
    return must<Tables<"patient_activity_log">>(
      await this.sb.from("patient_activity_log").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Saved items / favourites / bookmarks
// ---------------------------------------------------------------------------
export class SavedReportRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 100) {
    return mustList<Tables<"patient_saved_reports">>(
      await this.sb
        .from("patient_saved_reports")
        .select("*")
        .eq("patient_user_id", userId)
        .order("saved_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_saved_reports">) {
    return must<Tables<"patient_saved_reports">>(
      await this.sb.from("patient_saved_reports").insert(row).select("*").single(),
    );
  }
}

export class SavedPrescriptionRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 100) {
    return mustList<Tables<"patient_saved_prescriptions">>(
      await this.sb
        .from("patient_saved_prescriptions")
        .select("*")
        .eq("patient_user_id", userId)
        .order("saved_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_saved_prescriptions">) {
    return must<Tables<"patient_saved_prescriptions">>(
      await this.sb.from("patient_saved_prescriptions").insert(row).select("*").single(),
    );
  }
}

export class SavedDoctorRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_saved_doctors">>(
      await this.sb
        .from("patient_saved_doctors")
        .select("*")
        .eq("patient_user_id", userId)
        .order("saved_at", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"patient_saved_doctors">) {
    return must<Tables<"patient_saved_doctors">>(
      await this.sb.from("patient_saved_doctors").insert(row).select("*").single(),
    );
  }
}

export class FavouriteRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_favourites">>(
      await this.sb.from("patient_favourites").select("*").eq("patient_user_id", userId),
    );
  }
  async insert(row: TablesInsert<"patient_favourites">) {
    return must<Tables<"patient_favourites">>(
      await this.sb.from("patient_favourites").insert(row).select("*").single(),
    );
  }
}

export class BookmarkRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_bookmarks">>(
      await this.sb.from("patient_bookmarks").select("*").eq("patient_user_id", userId),
    );
  }
  async insert(row: TablesInsert<"patient_bookmarks">) {
    return must<Tables<"patient_bookmarks">>(
      await this.sb.from("patient_bookmarks").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Feedback / support / conversations
// ---------------------------------------------------------------------------
export class FeedbackRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_feedback">>(
      await this.sb
        .from("patient_feedback")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"patient_feedback">) {
    return must<Tables<"patient_feedback">>(
      await this.sb.from("patient_feedback").insert(row).select("*").single(),
    );
  }
}

export class SupportTicketRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_support_tickets">>(
      await this.sb
        .from("patient_support_tickets")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"patient_support_tickets">) {
    return must<Tables<"patient_support_tickets">>(
      await this.sb.from("patient_support_tickets").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_support_tickets">) {
    return must<Tables<"patient_support_tickets">>(
      await this.sb.from("patient_support_tickets").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export class ConversationRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_conversations">>(
      await this.sb
        .from("patient_conversations")
        .select("*")
        .eq("patient_user_id", userId)
        .order("last_message_at", { ascending: false, nullsFirst: false }),
    );
  }
  async getById(id: string) {
    return mustMaybe<Tables<"patient_conversations">>(
      await this.sb.from("patient_conversations").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"patient_conversations">) {
    return must<Tables<"patient_conversations">>(
      await this.sb.from("patient_conversations").insert(row).select("*").single(),
    );
  }
  async touchLastMessage(id: string, at: string) {
    await this.sb.from("patient_conversations").update({ last_message_at: at }).eq("id", id);
  }
}

export class ChatMessageRepository {
  constructor(private readonly sb: SB) {}
  async listForConversation(conversationId: string, limit = 200) {
    return mustList<Tables<"patient_chat_messages">>(
      await this.sb
        .from("patient_chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_chat_messages">) {
    return must<Tables<"patient_chat_messages">>(
      await this.sb.from("patient_chat_messages").insert(row).select("*").single(),
    );
  }
  async markConversationRead(conversationId: string, userId: string, at: string) {
    await this.sb
      .from("patient_chat_messages")
      .update({ read_at: at })
      .eq("conversation_id", conversationId)
      .neq("sender_user_id", userId)
      .is("read_at", null);
  }
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------
export class WalletRepository {
  constructor(private readonly sb: SB) {}
  async getByUser(userId: string) {
    return mustMaybe<Tables<"patient_wallet">>(
      await this.sb.from("patient_wallet").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async ensure(userId: string, tenantId: string | null) {
    const existing = await this.getByUser(userId);
    if (existing) return existing;
    return must<Tables<"patient_wallet">>(
      await this.sb
        .from("patient_wallet")
        .insert({ patient_user_id: userId, tenant_id: tenantId })
        .select("*")
        .single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_wallet">) {
    return must<Tables<"patient_wallet">>(
      await this.sb.from("patient_wallet").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export class WalletTransactionRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 200) {
    return mustList<Tables<"patient_wallet_transactions">>(
      await this.sb
        .from("patient_wallet_transactions")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_wallet_transactions">) {
    return must<Tables<"patient_wallet_transactions">>(
      await this.sb.from("patient_wallet_transactions").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------
export class MembershipRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_memberships">>(
      await this.sb
        .from("patient_memberships")
        .select("*")
        .eq("patient_user_id", userId)
        .order("started_at", { ascending: false }),
    );
  }
  async getById(id: string) {
    return mustMaybe<Tables<"patient_memberships">>(
      await this.sb.from("patient_memberships").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"patient_memberships">) {
    return must<Tables<"patient_memberships">>(
      await this.sb.from("patient_memberships").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_memberships">) {
    return must<Tables<"patient_memberships">>(
      await this.sb.from("patient_memberships").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export class MembershipHistoryRepository {
  constructor(private readonly sb: SB) {}
  async list(membershipId: string) {
    return mustList<Tables<"patient_membership_history">>(
      await this.sb
        .from("patient_membership_history")
        .select("*")
        .eq("membership_id", membershipId)
        .order("created_at", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"patient_membership_history">) {
    return must<Tables<"patient_membership_history">>(
      await this.sb.from("patient_membership_history").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Loyalty / rewards
// ---------------------------------------------------------------------------
export class LoyaltyAccountRepository {
  constructor(private readonly sb: SB) {}
  async getByUser(userId: string) {
    return mustMaybe<Tables<"patient_loyalty_accounts">>(
      await this.sb
        .from("patient_loyalty_accounts")
        .select("*")
        .eq("patient_user_id", userId)
        .maybeSingle(),
    );
  }
  async ensure(userId: string, tenantId: string | null) {
    const existing = await this.getByUser(userId);
    if (existing) return existing;
    return must<Tables<"patient_loyalty_accounts">>(
      await this.sb
        .from("patient_loyalty_accounts")
        .insert({ patient_user_id: userId, tenant_id: tenantId })
        .select("*")
        .single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_loyalty_accounts">) {
    return must<Tables<"patient_loyalty_accounts">>(
      await this.sb.from("patient_loyalty_accounts").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export class LoyaltyTransactionRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 200) {
    return mustList<Tables<"patient_loyalty_transactions">>(
      await this.sb
        .from("patient_loyalty_transactions")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_loyalty_transactions">) {
    return must<Tables<"patient_loyalty_transactions">>(
      await this.sb.from("patient_loyalty_transactions").insert(row).select("*").single(),
    );
  }
}

export class RewardRepository {
  constructor(private readonly sb: SB) {}
  async listActive(tenantId: string | null, limit = 100) {
    let q = this.sb
      .from("patient_rewards")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (tenantId) q = q.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    return mustList<Tables<"patient_rewards">>(await q);
  }
  async getById(id: string) {
    return mustMaybe<Tables<"patient_rewards">>(
      await this.sb.from("patient_rewards").select("*").eq("id", id).maybeSingle(),
    );
  }
}

export class RewardRedemptionRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 100) {
    return mustList<Tables<"patient_reward_redemptions">>(
      await this.sb
        .from("patient_reward_redemptions")
        .select("*")
        .eq("patient_user_id", userId)
        .order("redeemed_at", { ascending: false })
        .limit(limit),
    );
  }
  async insert(row: TablesInsert<"patient_reward_redemptions">) {
    return must<Tables<"patient_reward_redemptions">>(
      await this.sb.from("patient_reward_redemptions").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Health passport / consents
// ---------------------------------------------------------------------------
export class HealthPassportRepository {
  constructor(private readonly sb: SB) {}
  async getByUser(userId: string) {
    return mustMaybe<Tables<"patient_health_passport">>(
      await this.sb
        .from("patient_health_passport")
        .select("*")
        .eq("patient_user_id", userId)
        .maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"patient_health_passport">) {
    return must<Tables<"patient_health_passport">>(
      await this.sb
        .from("patient_health_passport")
        .upsert(row, { onConflict: "patient_user_id" })
        .select("*")
        .single(),
    );
  }
}

export class DigitalConsentRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string) {
    return mustList<Tables<"patient_digital_consents">>(
      await this.sb
        .from("patient_digital_consents")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"patient_digital_consents">) {
    return must<Tables<"patient_digital_consents">>(
      await this.sb.from("patient_digital_consents").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"patient_digital_consents">) {
    return must<Tables<"patient_digital_consents">>(
      await this.sb.from("patient_digital_consents").update(patch).eq("id", id).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Notification history / channel preferences
// ---------------------------------------------------------------------------
export class NotificationHistoryRepository {
  constructor(private readonly sb: SB) {}
  async list(userId: string, limit = 100) {
    return mustList<Tables<"patient_notification_history">>(
      await this.sb
        .from("patient_notification_history")
        .select("*")
        .eq("patient_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit),
    );
  }
  async markRead(id: string) {
    return must<Tables<"patient_notification_history">>(
      await this.sb
        .from("patient_notification_history")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

export class ChannelPreferenceRepository {
  constructor(private readonly sb: SB) {}
  async getEmail(userId: string) {
    return mustMaybe<Tables<"patient_email_preferences">>(
      await this.sb.from("patient_email_preferences").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async getSms(userId: string) {
    return mustMaybe<Tables<"patient_sms_preferences">>(
      await this.sb.from("patient_sms_preferences").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async getWhatsapp(userId: string) {
    return mustMaybe<Tables<"patient_whatsapp_preferences">>(
      await this.sb.from("patient_whatsapp_preferences").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
}

// ---------------------------------------------------------------------------
// App / theme / dashboard preferences
// ---------------------------------------------------------------------------
export class AppPreferenceRepository {
  constructor(private readonly sb: SB) {}
  async get(userId: string) {
    return mustMaybe<Tables<"patient_app_preferences">>(
      await this.sb.from("patient_app_preferences").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"patient_app_preferences">) {
    return must<Tables<"patient_app_preferences">>(
      await this.sb
        .from("patient_app_preferences")
        .upsert(row, { onConflict: "patient_user_id" })
        .select("*")
        .single(),
    );
  }
}

export class ThemePreferenceRepository {
  constructor(private readonly sb: SB) {}
  async get(userId: string) {
    return mustMaybe<Tables<"patient_theme_preferences">>(
      await this.sb.from("patient_theme_preferences").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"patient_theme_preferences">) {
    return must<Tables<"patient_theme_preferences">>(
      await this.sb
        .from("patient_theme_preferences")
        .upsert(row, { onConflict: "patient_user_id" })
        .select("*")
        .single(),
    );
  }
}

export class DashboardPreferenceRepository {
  constructor(private readonly sb: SB) {}
  async get(userId: string) {
    return mustMaybe<Tables<"patient_dashboard_preferences">>(
      await this.sb.from("patient_dashboard_preferences").select("*").eq("patient_user_id", userId).maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"patient_dashboard_preferences">) {
    return must<Tables<"patient_dashboard_preferences">>(
      await this.sb
        .from("patient_dashboard_preferences")
        .upsert(row, { onConflict: "patient_user_id" })
        .select("*")
        .single(),
    );
  }
}
