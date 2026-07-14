import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  MembershipHistoryRepository,
  MembershipRepository,
} from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export class MembershipEngine {
  constructor(private readonly sb: SB) {}

  private async record(
    userId: string,
    membershipId: string,
    event: string,
    fromStatus: string | null,
    toStatus: string | null,
    note?: string | null,
  ) {
    await new MembershipHistoryRepository(this.sb).insert({
      membership_id: membershipId,
      patient_user_id: userId,
      event,
      from_status: fromStatus,
      to_status: toStatus,
      note: note ?? null,
    });
  }

  async list(userId: string) {
    return new MembershipRepository(this.sb).list(userId);
  }

  async activate(userId: string, input: {
    planCode: string;
    planName: string;
    tier?: string | null;
    price: number;
    currency: string;
    autoRenew?: boolean;
    startsAt?: string;
    expiresAt?: string;
    meta?: Record<string, unknown>;
  }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const repo = new MembershipRepository(this.sb);
    const row = await repo.insert({
      patient_user_id: userId,
      tenant_id: identity.tenantId,
      plan_code: input.planCode,
      plan_name: input.planName,
      tier: input.tier ?? null,
      price: input.price,
      currency: input.currency,
      auto_renew: input.autoRenew ?? false,
      started_at: input.startsAt ?? new Date().toISOString(),
      expires_at: input.expiresAt ?? null,
      status: "active",
      meta: (input.meta ?? {}) as never,
    });
    await this.record(userId, row.id, "activated", null, "active");
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.MembershipStarted,
      payload: { membership_id: row.id, plan_code: input.planCode },
      entityRef: { type: "patient_membership", id: row.id },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_membership",
      entityId: row.id,
      eventType: PATIENT_EVENTS.MembershipStarted,
      title: `Membership activated: ${input.planName}`,
    });
    return row;
  }

  async renew(userId: string, input: { membershipId: string; expiresAt: string; meta?: Record<string, unknown> }) {
    const repo = new MembershipRepository(this.sb);
    const existing = await repo.getById(input.membershipId);
    if (!existing || existing.patient_user_id !== userId) throw new Error("Not found");
    const identity = await resolvePatientIdentity(this.sb, userId);
    const updated = await repo.update(input.membershipId, {
      expires_at: input.expiresAt,
      status: "active",
      meta: { ...(existing.meta as Record<string, unknown>), ...(input.meta ?? {}), last_renewed_at: new Date().toISOString() } as never,
    });
    await this.record(userId, input.membershipId, "renewed", existing.status, updated.status);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.MembershipRenewed,
      payload: { membership_id: input.membershipId },
    });
    return updated;
  }

  async pause(userId: string, membershipId: string) {
    return this.transition(userId, membershipId, "paused");
  }
  async cancel(userId: string, membershipId: string, reason?: string | null) {
    const updated = await this.transition(userId, membershipId, "cancelled", reason);
    const identity = await resolvePatientIdentity(this.sb, userId);
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.MembershipCancelled,
      payload: { membership_id: membershipId, reason },
    });
    return updated;
  }

  private async transition(userId: string, membershipId: string, toStatus: string, note?: string | null) {
    const repo = new MembershipRepository(this.sb);
    const existing = await repo.getById(membershipId);
    if (!existing || existing.patient_user_id !== userId) throw new Error("Not found");
    const updated = await repo.update(membershipId, { status: toStatus });
    await this.record(userId, membershipId, toStatus, existing.status, toStatus, note);
    return updated;
  }
}
