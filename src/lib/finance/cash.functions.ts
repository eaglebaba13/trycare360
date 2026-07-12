/**
 * Cash — receipts, payments, petty cash, bank reconciliation.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bankReconSchema,
  paymentRecordSchema,
  pettyCashSchema,
  receiptRecordSchema,
} from "./validators";
import { CashEngine } from "./engines/cash.engine.server";
import {
  BankAccountRepository,
  CashBookRepository,
  PaymentRepository,
  PettyCashRepository,
  ReceiptRepository,
} from "./repositories.server";
import { z } from "zod";

const tenantIdOnly = z.object({ tenantId: z.string().uuid() });

export const recordReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => receiptRecordSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CashEngine(context.supabase);
    return { receipt: await engine.recordReceipt(data, context.userId) };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentRecordSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CashEngine(context.supabase);
    return { payment: await engine.recordPayment(data, context.userId) };
  });

export const recordPettyCash = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pettyCashSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CashEngine(context.supabase);
    return { voucher: await engine.recordPettyCash(data, context.userId) };
  });

export const reconcileBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bankReconSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CashEngine(context.supabase);
    return { reconciliation: await engine.reconcileBank(data, context.userId) };
  });

export const listReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ReceiptRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PaymentRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const listPettyCash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PettyCashRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const listBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new BankAccountRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const listCashBooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new CashBookRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });
