/**
 * CashEngine — receipts, payments, petty cash and bank reconciliation.
 * Delegates journal posting to JournalEngine when configured.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  PaymentRepository,
  PettyCashRepository,
  ReceiptRepository,
} from "../repositories.server";
import {
  emitFinanceEvent,
  indexFinanceSearch,
  logFinanceTimeline,
  nextFinanceNumber,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type {
  bankReconSchema,
  paymentRecordSchema,
  pettyCashSchema,
  receiptRecordSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class CashEngine {
  private readonly receipts: ReceiptRepository;
  private readonly payments: PaymentRepository;
  private readonly petty: PettyCashRepository;
  constructor(private readonly sb: SB) {
    this.receipts = new ReceiptRepository(sb);
    this.payments = new PaymentRepository(sb);
    this.petty = new PettyCashRepository(sb);
  }

  async recordReceipt(input: z.infer<typeof receiptRecordSchema>, actorId: string) {
    const number = await nextFinanceNumber(this.sb, input.tenantId, "receipt", "RCP");
    const receipt = await this.receipts.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      receipt_number: number,
      receipt_date: input.receiptDate,
      bank_account_id: input.bankAccountId ?? null,
      cash_book_id: input.cashBookId ?? null,
      partner_type: input.partnerType,
      partner_id: input.partnerId ?? null,
      method: input.method,
      reference: input.reference ?? null,
      amount: input.amount,
      currency: input.currency,
      status: "recorded",
      source_module: input.sourceModule ?? null,
      source_reference_id: input.sourceReferenceId ?? null,
      notes: input.notes ?? null,
      created_by: actorId,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "receipt",
      entityId: receipt.id,
      action: "record",
      eventType: FINANCE_EVENTS.ReceiptRecorded,
      actorId,
      after: receipt as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.ReceiptRecorded, {
      receiptId: receipt.id,
      amount: input.amount,
    });
    await logFinanceTimeline(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_receipt",
      entityId: receipt.id,
      eventType: FINANCE_EVENTS.ReceiptRecorded,
      title: `Receipt ${number} — ${input.amount} ${input.currency}`,
    });
    await indexFinanceSearch(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_receipt",
      entityId: receipt.id,
      title: `Receipt ${number}`,
      subtitle: `${input.partnerType} · ${input.method}`,
      keywords: `receipt ${number} ${input.method}`,
    });
    return receipt;
  }

  async recordPayment(input: z.infer<typeof paymentRecordSchema>, actorId: string) {
    const number = await nextFinanceNumber(this.sb, input.tenantId, "payment", "PAY");
    const payment = await this.payments.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      payment_number: number,
      payment_date: input.paymentDate,
      bank_account_id: input.bankAccountId ?? null,
      cash_book_id: input.cashBookId ?? null,
      partner_type: input.partnerType,
      partner_id: input.partnerId ?? null,
      method: input.method,
      reference: input.reference ?? null,
      amount: input.amount,
      currency: input.currency,
      status: "recorded",
      source_module: input.sourceModule ?? null,
      source_reference_id: input.sourceReferenceId ?? null,
      notes: input.notes ?? null,
      created_by: actorId,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "payment",
      entityId: payment.id,
      action: "record",
      eventType: FINANCE_EVENTS.PaymentRecorded,
      actorId,
      after: payment as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.PaymentRecorded, {
      paymentId: payment.id,
      amount: input.amount,
    });
    return payment;
  }

  async recordPettyCash(input: z.infer<typeof pettyCashSchema>, actorId: string) {
    const number = await nextFinanceNumber(this.sb, input.tenantId, "petty_cash", "PC");
    const row = await this.petty.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      cash_book_id: input.cashBookId ?? null,
      voucher_number: number,
      voucher_date: input.voucherDate,
      category: input.category ?? null,
      purpose: input.purpose ?? null,
      amount: input.amount,
      status: "recorded",
      created_by: actorId,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.PettyCashRecorded, {
      voucherId: row.id,
    });
    return row;
  }

  async reconcileBank(input: z.infer<typeof bankReconSchema>, actorId: string) {
    const diff =
      Number(input.closingBalance) - Number(input.openingBalance);
    const reconciled = input.matchedLines.reduce(
      (s, r) => s + Number((r as { amount?: number }).amount ?? 0),
      0,
    );
    const status = Math.abs(diff - reconciled) < 0.01 ? "completed" : "in_progress";
    const { data, error } = await this.sb
      .from("fin_bank_reconciliations")
      .insert({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId ?? null,
        bank_account_id: input.bankAccountId,
        statement_date: input.statementDate,
        opening_balance: input.openingBalance,
        closing_balance: input.closingBalance,
        reconciled_balance: reconciled,
        status,
        matched_lines: input.matchedLines as never,
        unmatched_lines: input.unmatchedLines as never,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        completed_by: status === "completed" ? actorId : null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await emitFinanceEvent(
      this.sb,
      input.tenantId,
      status === "completed" ? FINANCE_EVENTS.BankReconciled : FINANCE_EVENTS.BankReconMismatch,
      { bankAccountId: input.bankAccountId, statementDate: input.statementDate },
    );
    return data;
  }
}
