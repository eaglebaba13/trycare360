import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  FamilyAccountRepository,
  FamilyMemberRepository,
} from "../repositories.server";
import {
  assertFamilyPermission,
  emitPatientEvent,
  logPatientTimeline,
  resolvePatientIdentity,
} from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export class FamilyEngine {
  constructor(private readonly sb: SB) {}

  async createAccount(userId: string, input: { name: string; description?: string | null; meta?: Record<string, unknown> }) {
    const row = await new FamilyAccountRepository(this.sb).insert({
      primary_user_id: userId,
      name: input.name,
      description: input.description ?? null,
      meta: (input.meta ?? {}) as never,
    });
    const identity = await resolvePatientIdentity(this.sb, userId);
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_family_account",
      entityId: row.id,
      eventType: PATIENT_EVENTS.FamilyUpdated,
      title: `Created family account: ${input.name}`,
    });
    return row;
  }

  async addMember(
    userId: string,
    input: {
      familyAccountId?: string | null;
      memberUserId?: string | null;
      memberPatientId?: string | null;
      displayName?: string | null;
      relationship: string;
      canView?: boolean;
      canBook?: boolean;
      canPay?: boolean;
      canManage?: boolean;
    },
  ) {
    const row = await new FamilyMemberRepository(this.sb).insert({
      primary_user_id: userId,
      family_account_id: input.familyAccountId ?? null,
      member_user_id: input.memberUserId ?? null,
      member_patient_id: input.memberPatientId ?? null,
      display_name: input.displayName ?? null,
      relationship: input.relationship,
      can_view: input.canView ?? true,
      can_book: input.canBook ?? false,
      can_pay: input.canPay ?? false,
      can_manage: input.canManage ?? false,
      status: "invited",
      invited_at: new Date().toISOString(),
    });
    const identity = await resolvePatientIdentity(this.sb, userId);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.FamilyMemberInvited,
      payload: { member_id: row.id, relationship: input.relationship },
      entityRef: { type: "patient_family_member", id: row.id },
    });
    return row;
  }

  async updatePermissions(
    userId: string,
    input: {
      memberId: string;
      canView?: boolean;
      canBook?: boolean;
      canPay?: boolean;
      canManage?: boolean;
      status?: "invited" | "accepted" | "revoked";
    },
  ) {
    const repo = new FamilyMemberRepository(this.sb);
    const existing = await repo.getById(input.memberId);
    if (!existing || existing.primary_user_id !== userId) throw new Error("Not found");
    const updated = await repo.update(input.memberId, {
      can_view: input.canView ?? undefined,
      can_book: input.canBook ?? undefined,
      can_pay: input.canPay ?? undefined,
      can_manage: input.canManage ?? undefined,
      status: input.status ?? undefined,
      accepted_at: input.status === "accepted" ? new Date().toISOString() : undefined,
    });
    const identity = await resolvePatientIdentity(this.sb, userId);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.FamilyUpdated,
      payload: { member_id: input.memberId, status: input.status },
    });
    return updated;
  }

  async removeMember(userId: string, memberId: string) {
    const repo = new FamilyMemberRepository(this.sb);
    const existing = await repo.getById(memberId);
    if (!existing || existing.primary_user_id !== userId) throw new Error("Not found");
    await repo.delete(memberId);
    const identity = await resolvePatientIdentity(this.sb, userId);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.FamilyMemberRemoved,
      payload: { member_id: memberId },
    });
  }

  async listMembers(userId: string) {
    const repo = new FamilyMemberRepository(this.sb);
    const [primary, delegated] = await Promise.all([
      repo.listForPrimary(userId),
      repo.listForMember(userId),
    ]);
    return { primary, delegated };
  }

  async switchContext(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      return await resolvePatientIdentity(this.sb, userId);
    }
    await assertFamilyPermission(this.sb, {
      viewerUserId: userId,
      targetUserId,
      capability: "view",
    });
    return await resolvePatientIdentity(this.sb, targetUserId);
  }
}
