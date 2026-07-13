/**
 * Phase 2.9 Stage 4 — BankReconEngine.
 *
 * Automatic and manual reconciliation between imported bank-statement
 * lines and recorded receipts/payments. Matching is by amount + date
 * proximity (±3 days) with optional reference-string equality. Writes
 * results into `fin_bank_reconciliations` via CashEngine.reconcileBank.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CashEngine } from "./cash.engine.server";
import { emitFinanceEvent } from "../helpers.server";
import { FINANCE_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export interface StatementLine {
  date: string;
  amount: number; // positive credit, negative debit
  reference?: string | null;
  description?: string | null;
}

export interface MatchResult {
  matched: Array<StatementLine & { entryId: string; entryType: "receipt" | "payment" }>;
  unmatched: StatementLine[];
  differenceCount: number;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

export class BankReconEngine {
  private readonly cash: CashEngine;
  constructor(private readonly sb: SB) {
    this.cash = new CashEngine(sb);
  }

  /** Match statement lines against un-reconciled receipts/payments for the bank account. */
  async autoMatch(args: {
    tenantId: string;
    bankAccountId: string;
    statementDate: string;
    statementLines: StatementLine[];
  }): Promise<MatchResult> {
    const from = new Date(args.statementDate);
    from.setUTCDate(from.getUTCDate() - 30);
    const fromIso = from.toISOString().slice(0, 10);

    const [{ data: receipts, error: rErr }, { data: payments, error: pErr }] =
      await Promise.all([
        this.sb
          .from("fin_receipts")
          .select("id,amount,receipt_date,reference")
          .eq("tenant_id", args.tenantId)
          .eq("bank_account_id", args.bankAccountId)
          .gte("receipt_date", fromIso)
          .lte("receipt_date", args.statementDate)
          .limit(500),
        this.sb
          .from("fin_payments")
          .select("id,amount,payment_date,reference")
          .eq("tenant_id", args.tenantId)
          .eq("bank_account_id", args.bankAccountId)
          .gte("payment_date", fromIso)
          .lte("payment_date", args.statementDate)
          .limit(500),
      ]);
    if (rErr) throw new Error(rErr.message);
    if (pErr) throw new Error(pErr.message);

    type Candidate = { id: string; amount: number; date: string; ref: string | null; type: "receipt" | "payment"; used: boolean };
    const pool: Candidate[] = [
      ...((receipts ?? []) as Array<{ id: string; amount: number; receipt_date: string; reference: string | null }>).map(
        (r) => ({ id: r.id, amount: Number(r.amount), date: r.receipt_date, ref: r.reference, type: "receipt" as const, used: false }),
      ),
      ...((payments ?? []) as Array<{ id: string; amount: number; payment_date: string; reference: string | null }>).map(
        (p) => ({ id: p.id, amount: Number(p.amount), date: p.payment_date, ref: p.reference, type: "payment" as const, used: false }),
      ),
    ];

    const matched: MatchResult["matched"] = [];
    const unmatched: StatementLine[] = [];
    for (const line of args.statementLines) {
      const wanted = Math.abs(Number(line.amount));
      const expectType: Candidate["type"] = Number(line.amount) >= 0 ? "receipt" : "payment";
      const idx = pool.findIndex(
        (c) =>
          !c.used &&
          c.type === expectType &&
          Math.abs(c.amount - wanted) < 0.01 &&
          daysBetween(c.date, line.date) <= 3 &&
          (!line.reference || !c.ref || c.ref.trim() === line.reference.trim()),
      );
      if (idx >= 0) {
        pool[idx].used = true;
        matched.push({ ...line, entryId: pool[idx].id, entryType: pool[idx].type });
      } else {
        unmatched.push(line);
      }
    }
    return { matched, unmatched, differenceCount: unmatched.length };
  }

  /** Auto-match and persist a reconciliation record. */
  async autoMatchAndPersist(
    args: {
      tenantId: string;
      orgUnitId?: string | null;
      bankAccountId: string;
      statementDate: string;
      openingBalance: number;
      closingBalance: number;
      statementLines: StatementLine[];
    },
    actorId: string,
  ) {
    const result = await this.autoMatch({
      tenantId: args.tenantId,
      bankAccountId: args.bankAccountId,
      statementDate: args.statementDate,
      statementLines: args.statementLines,
    });
    const reconciliation = await this.cash.reconcileBank(
      {
        tenantId: args.tenantId,
        orgUnitId: args.orgUnitId ?? null,
        bankAccountId: args.bankAccountId,
        statementDate: args.statementDate,
        openingBalance: args.openingBalance,
        closingBalance: args.closingBalance,
        matchedLines: result.matched.map((m) => ({
          amount: m.amount,
          entryId: m.entryId,
          entryType: m.entryType,
          date: m.date,
          reference: m.reference ?? null,
        })),
        unmatchedLines: result.unmatched.map((u) => ({
          amount: u.amount,
          date: u.date,
          reference: u.reference ?? null,
          description: u.description ?? null,
        })),
      },
      actorId,
    );
    if (result.unmatched.length > 0) {
      await emitFinanceEvent(this.sb, args.tenantId, FINANCE_EVENTS.BankReconMismatch, {
        bankAccountId: args.bankAccountId,
        unmatched: result.unmatched.length,
      });
    }
    return { reconciliation, ...result };
  }
}
