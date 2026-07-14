import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  LoyaltyAccountRepository,
  LoyaltyTransactionRepository,
} from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export type LoyaltyDirection = "earn" | "redeem" | "expire" | "reverse" | "adjust";

export interface LoyaltyPostInput {
  userId: string;
  points: number;
  direction: LoyaltyDirection;
  source: string;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Loyalty engine — append-only ledger over patient_loyalty_accounts +
 * patient_loyalty_transactions. Configurable earn/expire rules are
 * expected to be provided by platform Automation Rules and Masters —
 * this engine only records the resulting deltas.
 */
export class LoyaltyEngine {
  constructor(private readonly sb: SB) {}

  async getAccount(userId: string) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    return new LoyaltyAccountRepository(this.sb).ensure(userId, identity.tenantId);
  }
  async listTransactions(userId: string, limit = 200) {
    return new LoyaltyTransactionRepository(this.sb).list(userId, limit);
  }

  async post(input: LoyaltyPostInput) {
    if (input.points <= 0) throw new Error("Points must be positive");
    const accountRepo = new LoyaltyAccountRepository(this.sb);
    const txRepo = new LoyaltyTransactionRepository(this.sb);
    const identity = await resolvePatientIdentity(this.sb, input.userId);
    const account = await accountRepo.ensure(input.userId, identity.tenantId);

    const sign = input.direction === "earn" || input.direction === "reverse" ? 1 : -1;
    const delta = sign * input.points;
    const newBalance = Number(account.points_balance) + delta;
    if (newBalance < 0) throw new Error("Insufficient loyalty points");

    const tx = await txRepo.insert({
      account_id: account.id,
      patient_user_id: input.userId,
      direction: input.direction,
      points: input.points,
      balance_after: newBalance,
      source: input.source,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      note: input.note ?? null,
      meta: (input.meta ?? {}) as never,
    });

    await accountRepo.update(account.id, {
      points_balance: newBalance,
      lifetime_earned:
        input.direction === "earn" ? Number(account.lifetime_earned) + input.points : Number(account.lifetime_earned),
      lifetime_redeemed:
        input.direction === "redeem" ? Number(account.lifetime_redeemed) + input.points : Number(account.lifetime_redeemed),
    });

    const eventCode =
      input.direction === "earn"
        ? PATIENT_EVENTS.LoyaltyEarned
        : PATIENT_EVENTS.LoyaltyAdjusted;
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: eventCode,
      payload: {
        patient_user_id: input.userId,
        account_id: account.id,
        direction: input.direction,
        points: input.points,
      },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_loyalty_account",
      entityId: account.id,
      eventType: eventCode,
      title: `Loyalty ${input.direction} ${input.points}`,
    });
    return tx;
  }
}
