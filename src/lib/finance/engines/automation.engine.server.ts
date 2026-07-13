/**
 * Phase 2.9 Stage 4 — AutomationEngine.
 *
 * Central auto-posting orchestrator. Every operational module hooks in
 * through one of these methods; the engine resolves account codes via
 * posting-rules and defers to JournalEngine for the actual double-entry
 * post. Idempotency is enforced by (reference_type, reference_id)
 * lookup, so replaying an event never produces duplicate journals.
 *
 * NO accounting math lives here: all posting flows through
 * JournalEngine.create which enforces balance, period lock and numbering.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { JournalEngine } from "./journal.engine.server";
import {
  type AccountPair,
  creditNoteRule,
  debitNoteRule,
  depreciationRule,
  expenseRule,
  findExistingJournalRef,
  paymentRule,
  receiptRule,
  refundRule,
  resolveAccountId,
  revenueRule,
  royaltyAccrualRule,
  royaltySettlementRule,
  taxAccrualRule,
  vendorBillRule,
} from "../posting-rules.server";
import {
  emitFinanceEvent,
  logFinanceTimeline,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export interface AutoPostInput {
  tenantId: string;
  orgUnitId?: string | null;
  branchId?: string | null;
  entryDate: string;
  amount: number;
  currency?: string;
  sourceModule: string;
  referenceType: string;
  referenceId: string;
  description?: string | null;
  rule: AccountPair;
  partnerType?: string | null;
  partnerId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AutoPostResult {
  posted: boolean;
  reason?: string;
  journalId?: string;
  entryNumber?: string;
}

export class AutomationEngine {
  private readonly journals: JournalEngine;
  constructor(private readonly sb: SB) {
    this.journals = new JournalEngine(sb);
  }

  /**
   * Post a double-entry journal from an operational event.
   * - Skips silently when no COA accounts are configured for the rule.
   * - Idempotent by (reference_type, reference_id).
   */
  async autoPost(input: AutoPostInput, actorId: string): Promise<AutoPostResult> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { posted: false, reason: "non_positive_amount" };
    }
    const existing = await findExistingJournalRef(
      this.sb,
      input.tenantId,
      input.referenceType,
      input.referenceId,
    );
    if (existing) return { posted: false, reason: "duplicate", journalId: existing.id, entryNumber: existing.entry_number };

    const [debitId, creditId] = await Promise.all([
      resolveAccountId(this.sb, input.tenantId, input.rule.debit),
      resolveAccountId(this.sb, input.tenantId, input.rule.credit),
    ]);
    if (!debitId || !creditId) {
      await emitFinanceEvent(
        this.sb,
        input.tenantId,
        FINANCE_EVENTS.JournalUnbalanced,
        {
          reason: "missing_account_mapping",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          sourceModule: input.sourceModule,
          triedDebit: input.rule.debit,
          triedCredit: input.rule.credit,
        },
      );
      return { posted: false, reason: "missing_account_mapping" };
    }

    const amount = Math.round(input.amount * 100) / 100;
    const journal = await this.journals.create(
      {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId ?? null,
        branchId: input.branchId ?? null,
        periodId: null,
        entryDate: input.entryDate,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        sourceModule: input.sourceModule,
        description: input.description ?? `${input.sourceModule} · ${input.referenceType}`,
        currency: input.currency ?? "INR",
        fxRate: 1,
        metadata: {
          auto_posted: true,
          rule: input.rule,
          ...(input.metadata ?? {}),
        },
        lines: [
          {
            accountId: debitId,
            lineNumber: 1,
            debit: amount,
            credit: 0,
            branchId: input.branchId ?? null,
            partnerType: input.partnerType ?? null,
            partnerId: input.partnerId ?? null,
            description: input.description ?? null,
          },
          {
            accountId: creditId,
            lineNumber: 2,
            debit: 0,
            credit: amount,
            branchId: input.branchId ?? null,
            partnerType: input.partnerType ?? null,
            partnerId: input.partnerId ?? null,
            description: input.description ?? null,
          },
        ],
      },
      actorId,
      { status: "posted", skipEvents: true },
    );

    await logFinanceTimeline(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_journal",
      entityId: journal.id,
      eventType: FINANCE_EVENTS.JournalPosted,
      title: `Auto-post ${journal.entry_number} · ${input.sourceModule}`,
      meta: { referenceType: input.referenceType, referenceId: input.referenceId },
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.JournalPosted, {
      journalId: journal.id,
      entryNumber: journal.entry_number,
      sourceModule: input.sourceModule,
      auto: true,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "journal_entry",
      entityId: journal.id,
      action: "auto_post",
      eventType: FINANCE_EVENTS.JournalPosted,
      actorId,
      after: journal as never,
      metadata: {
        sourceModule: input.sourceModule,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    });
    return { posted: true, journalId: journal.id, entryNumber: journal.entry_number };
  }

  // -------------------------------------------------------------------------
  // Domain-specific façades. Each one is a thin wrapper around autoPost that
  // picks the right posting rule so callers stay declarative.
  // -------------------------------------------------------------------------

  postRevenueEvent(args: {
    tenantId: string;
    orgUnitId?: string | null;
    branchId?: string | null;
    entryDate: string;
    amount: number;
    currency?: string;
    sourceModule: string; // clinical|laboratory|radiology|pharmacy|...
    referenceId: string;
    referenceType?: string;
    description?: string | null;
    partnerType?: string | null;
    partnerId?: string | null;
    metadata?: Record<string, unknown>;
  }, actorId: string) {
    return this.autoPost(
      {
        ...args,
        referenceType: args.referenceType ?? `${args.sourceModule}_revenue`,
        rule: revenueRule(args.sourceModule),
      },
      actorId,
    );
  }

  postReceipt(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    method: string; receiptId: string; partnerType?: string | null; partnerId?: string | null;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        branchId: args.branchId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_receipt",
        referenceType: "receipt",
        referenceId: args.receiptId,
        rule: receiptRule(args.method),
        partnerType: args.partnerType,
        partnerId: args.partnerId,
      },
      actorId,
    );
  }

  postPayment(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    method: string; paymentId: string; partnerType: string; partnerId?: string | null;
    referenceType?: string;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        branchId: args.branchId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_payment",
        referenceType: args.referenceType ?? "payment",
        referenceId: args.paymentId,
        rule: paymentRule(args.method, args.partnerType),
        partnerType: args.partnerType,
        partnerId: args.partnerId,
      },
      actorId,
    );
  }

  postVendorBill(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    billId: string; vendorId?: string | null;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        branchId: args.branchId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_vendor_bill",
        referenceType: "vendor_bill",
        referenceId: args.billId,
        partnerType: "vendor",
        partnerId: args.vendorId,
        rule: vendorBillRule(),
      },
      actorId,
    );
  }

  postExpense(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    expenseId: string; category?: string | null;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        branchId: args.branchId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_expense",
        referenceType: "expense",
        referenceId: args.expenseId,
        rule: expenseRule(args.category),
      },
      actorId,
    );
  }

  postDepreciation(args: {
    tenantId: string; orgUnitId?: string | null;
    entryDate: string; amount: number; currency?: string;
    scheduleId: string; assetId: string;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_asset",
        referenceType: "depreciation",
        referenceId: args.scheduleId,
        rule: depreciationRule(),
        metadata: { assetId: args.assetId },
      },
      actorId,
    );
  }

  postRoyaltyAccrual(args: {
    tenantId: string; orgUnitId?: string | null;
    entryDate: string; amount: number; currency?: string;
    ledgerId: string; franchiseOrgUnitId: string;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_royalty",
        referenceType: "royalty_accrual",
        referenceId: args.ledgerId,
        rule: royaltyAccrualRule(),
        partnerType: "franchise",
        metadata: { franchiseOrgUnitId: args.franchiseOrgUnitId },
      },
      actorId,
    );
  }

  postRoyaltySettlement(args: {
    tenantId: string; orgUnitId?: string | null;
    entryDate: string; amount: number; currency?: string;
    settlementId: string; franchiseOrgUnitId: string;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_royalty",
        referenceType: "royalty_settlement",
        referenceId: args.settlementId,
        rule: royaltySettlementRule(),
        partnerType: "franchise",
        metadata: { franchiseOrgUnitId: args.franchiseOrgUnitId },
      },
      actorId,
    );
  }

  postTaxAccrual(args: {
    tenantId: string; orgUnitId?: string | null;
    entryDate: string; amount: number; currency?: string;
    ledgerId: string; taxType: string;
  }, actorId: string) {
    return this.autoPost(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId,
        entryDate: args.entryDate,
        amount: args.amount,
        currency: args.currency,
        sourceModule: "finance_tax",
        referenceType: "tax_accrual",
        referenceId: args.ledgerId,
        rule: taxAccrualRule(args.taxType),
        metadata: { taxType: args.taxType },
      },
      actorId,
    );
  }

  postCreditNote(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    creditNoteId: string;
  }, actorId: string) {
    return this.autoPost(
      {
        ...args,
        sourceModule: "billing",
        referenceType: "credit_note",
        referenceId: args.creditNoteId,
        rule: creditNoteRule(),
      },
      actorId,
    );
  }

  postDebitNote(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    debitNoteId: string;
  }, actorId: string) {
    return this.autoPost(
      {
        ...args,
        sourceModule: "billing",
        referenceType: "debit_note",
        referenceId: args.debitNoteId,
        rule: debitNoteRule(),
      },
      actorId,
    );
  }

  postRefund(args: {
    tenantId: string; orgUnitId?: string | null; branchId?: string | null;
    entryDate: string; amount: number; currency?: string;
    refundId: string; method: string;
  }, actorId: string) {
    return this.autoPost(
      {
        ...args,
        sourceModule: "billing",
        referenceType: "refund",
        referenceId: args.refundId,
        rule: refundRule(args.method),
      },
      actorId,
    );
  }
}
