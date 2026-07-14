/**
 * Wallet engine — append-only ledger over patient_wallet + patient_wallet_transactions.
 *
 * Business invariants:
 *   1. Balance = lifetime_credit - lifetime_debit
 *   2. Transactions are never mutated. Corrections use compensating rows.
 *   3. Every debit checks `balance >= amount`.
 *   4. Idempotency keys stored in meta.idempotency_key prevent double posting.
 *   5. Wallet activity emits PATIENT_EVENTS.Wallet* through the platform bus.
 *
 * Wallet does NOT compute prices, invoice totals, or refund policy — that
 * remains inside Billing/Payments. This engine only records inflow/outflow.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import { WalletRepository, WalletTransactionRepository } from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

export type WalletDirection = "credit" | "debit";

export interface WalletPostInput {
  userId: string;
  amount: number;
  direction: WalletDirection;
  source: string;
  referenceType?: string | null;
  referenceId?: string | null;
  note?: string | null;
  idempotencyKey?: string | null;
  meta?: Record<string, unknown>;
}

export class WalletEngine {
  constructor(private readonly sb: SB) {}

  async getWallet(userId: string) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    return new WalletRepository(this.sb).ensure(userId, identity.tenantId);
  }

  async listTransactions(userId: string, limit = 200) {
    return new WalletTransactionRepository(this.sb).list(userId, limit);
  }

  async post(input: WalletPostInput): Promise<Tables<"patient_wallet_transactions">> {
    if (input.amount <= 0) throw new Error("Amount must be positive");
    const walletRepo = new WalletRepository(this.sb);
    const txRepo = new WalletTransactionRepository(this.sb);
    const identity = await resolvePatientIdentity(this.sb, input.userId);
    const wallet = await walletRepo.ensure(input.userId, identity.tenantId);

    if (wallet.status === "blocked") throw new Error("Wallet is blocked");

    // Idempotency
    if (input.idempotencyKey) {
      const existing = await txRepo.list(input.userId, 100);
      const hit = existing.find(
        (t) => (t.meta as { idempotency_key?: string } | null)?.idempotency_key === input.idempotencyKey,
      );
      if (hit) return hit;
    }

    if (input.direction === "debit" && Number(wallet.balance) < input.amount) {
      throw new Error("Insufficient wallet balance");
    }

    const newBalance =
      input.direction === "credit"
        ? Number(wallet.balance) + input.amount
        : Number(wallet.balance) - input.amount;

    const meta: Record<string, unknown> = {
      ...(input.meta ?? {}),
      ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
    };

    const tx = await txRepo.insert({
      wallet_id: wallet.id,
      patient_user_id: input.userId,
      amount: input.amount,
      direction: input.direction,
      source: input.source,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      note: input.note ?? null,
      balance_after: newBalance,
      meta: meta as never,
    });

    await walletRepo.update(wallet.id, {
      balance: newBalance,
      lifetime_credit:
        input.direction === "credit"
          ? Number(wallet.lifetime_credit) + input.amount
          : Number(wallet.lifetime_credit),
      lifetime_debit:
        input.direction === "debit"
          ? Number(wallet.lifetime_debit) + input.amount
          : Number(wallet.lifetime_debit),
    });

    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: input.direction === "credit" ? PATIENT_EVENTS.WalletCredited : PATIENT_EVENTS.WalletDebited,
      payload: {
        patient_user_id: input.userId,
        wallet_id: wallet.id,
        amount: input.amount,
        source: input.source,
      },
      entityRef: { type: "patient_wallet_transaction", id: tx.id },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_wallet",
      entityId: wallet.id,
      eventType: input.direction === "credit" ? PATIENT_EVENTS.WalletCredited : PATIENT_EVENTS.WalletDebited,
      title: `Wallet ${input.direction} ${input.amount}`,
      body: input.note ?? undefined,
      meta: { source: input.source },
    });
    return tx;
  }

  async requestPayment(input: {
    userId: string;
    amount: number;
    currency?: string;
    referenceType: string;
    referenceId: string;
    note?: string | null;
    idempotencyKey?: string;
  }) {
    return this.post({
      userId: input.userId,
      amount: input.amount,
      direction: "debit",
      source: "payment_request",
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      note: input.note ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      meta: { currency: input.currency ?? "INR" },
    });
  }
}
