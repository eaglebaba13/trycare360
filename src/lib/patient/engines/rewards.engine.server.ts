import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { RewardRedemptionRepository, RewardRepository } from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";
import { LoyaltyEngine } from "./loyalty.engine.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Rewards engine — read reward catalogue, enforce eligibility, and
 * record redemptions. Point spending flows through LoyaltyEngine so
 * the loyalty ledger stays the single source of truth.
 */
export class RewardsEngine {
  constructor(private readonly sb: SB) {}

  async listAvailable(userId: string, limit = 100) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    return new RewardRepository(this.sb).listActive(identity.tenantId, limit);
  }

  async redeem(userId: string, input: { rewardId: string; meta?: Record<string, unknown> }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const reward = await new RewardRepository(this.sb).getById(input.rewardId);
    if (!reward || !reward.is_active) throw new Error("Reward not available");
    if (reward.tenant_id && identity.tenantId && reward.tenant_id !== identity.tenantId) {
      throw new Error("Reward not available for this tenant");
    }
    if (reward.stock !== null && Number(reward.stock) <= 0) throw new Error("Reward out of stock");

    const loyalty = new LoyaltyEngine(this.sb);
    const account = await loyalty.getAccount(userId);

    if (Number(reward.cost_points ?? 0) > 0) {
      await loyalty.post({
        userId,
        points: Number(reward.cost_points),
        direction: "redeem",
        source: "reward_redemption",
        referenceType: "patient_reward",
        referenceId: reward.id,
      });
    }

    const redemption = await new RewardRedemptionRepository(this.sb).insert({
      patient_user_id: userId,
      reward_id: reward.id,
      loyalty_account_id: account.id,
      points_used: Number(reward.cost_points ?? 0),
      amount_used: Number(reward.cost_amount ?? 0),
      status: "pending",
      meta: (input.meta ?? {}) as never,
    });

    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.RewardRedeemed,
      payload: { reward_id: reward.id, redemption_id: redemption.id },
      entityRef: { type: "patient_reward_redemption", id: redemption.id },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_reward_redemption",
      entityId: redemption.id,
      eventType: PATIENT_EVENTS.RewardRedeemed,
      title: `Redeemed reward: ${reward.name}`,
    });
    return redemption;
  }
}
