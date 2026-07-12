/**
 * Royalty server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  royaltyCalculateSchema,
  royaltyRuleUpsertSchema,
  royaltySettleSchema,
} from "./validators";
import { RoyaltyEngine } from "./engines/royalty.engine.server";
import {
  RoyaltyRuleRepository,
  RoyaltySettlementRepository,
} from "./repositories.server";
import { z } from "zod";

const tenantIdOnly = z.object({ tenantId: z.string().uuid() });

export const upsertRoyaltyRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => royaltyRuleUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RoyaltyEngine(context.supabase);
    return { rule: await engine.upsertRule(data, context.userId) };
  });

export const calculateRoyalty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => royaltyCalculateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RoyaltyEngine(context.supabase);
    return { entry: await engine.calculate(data, context.userId) };
  });

export const settleRoyalty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => royaltySettleSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RoyaltyEngine(context.supabase);
    return { settlement: await engine.settle(data, context.userId) };
  });

export const listRoyaltyRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new RoyaltyRuleRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const listRoyaltySettlements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new RoyaltySettlementRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });
