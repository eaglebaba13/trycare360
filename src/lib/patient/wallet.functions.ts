/**
 * Patient Portal — Wallet server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WalletEngine } from "./engines/wallet.engine.server";
import { emptySchema, walletPaymentRequestSchema, walletTxListSchema } from "./validators";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new WalletEngine(context.supabase);
    return { wallet: await engine.getWallet(context.userId) };
  });

export const listWalletTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => walletTxListSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new WalletEngine(context.supabase);
    return { rows: await engine.listTransactions(context.userId, data.limit) };
  });

export const requestWalletPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => walletPaymentRequestSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WalletEngine(context.supabase);
    return {
      tx: await engine.requestPayment({
        userId: context.userId,
        amount: data.amount,
        currency: data.currency,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        note: data.note,
        idempotencyKey: data.idempotencyKey,
      }),
    };
  });
