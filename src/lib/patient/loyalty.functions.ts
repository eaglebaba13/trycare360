/**
 * Patient Portal — Loyalty & Rewards server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LoyaltyEngine } from "./engines/loyalty.engine.server";
import { RewardsEngine } from "./engines/rewards.engine.server";
import { emptySchema, listRewardsSchema, loyaltyTxListSchema, redeemRewardSchema } from "./validators";

export const getMyLoyaltyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new LoyaltyEngine(context.supabase);
    return { account: await engine.getAccount(context.userId) };
  });

export const listLoyaltyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => loyaltyTxListSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new LoyaltyEngine(context.supabase);
    return { rows: await engine.listTransactions(context.userId, data.limit) };
  });

export const listAvailableRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listRewardsSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new RewardsEngine(context.supabase);
    return { rows: await engine.listAvailable(context.userId, data.limit) };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => redeemRewardSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RewardsEngine(context.supabase);
    return { redemption: await engine.redeem(context.userId, data) };
  });
