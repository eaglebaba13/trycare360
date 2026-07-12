/**
 * FinancialReportEngine — projections for Trial Balance, P&L, Balance
 * Sheet and Cash Flow. Reads from posted `fin_journal_lines` joined to
 * `fin_chart_of_accounts` and aggregates by account_type.
 *
 * The engine is read-only. It reuses the platform Reports module for
 * delivery — this only prepares the payload.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { LedgerEngine } from "./ledger.engine.server";
import { ChartOfAccountsRepository } from "../repositories.server";
import type { reportWindowSchema } from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;
type Window = z.infer<typeof reportWindowSchema>;

export class FinancialReportEngine {
  private readonly ledger: LedgerEngine;
  private readonly accounts: ChartOfAccountsRepository;
  constructor(private readonly sb: SB) {
    this.ledger = new LedgerEngine(sb);
    this.accounts = new ChartOfAccountsRepository(sb);
  }

  private async trialBalanceWithAccounts(window: Window) {
    const [tb, coa] = await Promise.all([
      this.ledger.trialBalance({
        tenantId: window.tenantId,
        from: window.from,
        to: window.to,
      }),
      this.accounts.list({ tenantId: window.tenantId, limit: 1000 }),
    ]);
    const byId = new Map(coa.map((a) => [a.id, a]));
    return tb.map((row) => ({
      ...row,
      account: byId.get(row.accountId) ?? null,
    }));
  }

  async trialBalance(window: Window) {
    return { rows: await this.trialBalanceWithAccounts(window) };
  }

  async profitLoss(window: Window) {
    const rows = await this.trialBalanceWithAccounts(window);
    let income = 0;
    let expense = 0;
    const breakdown: Array<{ accountType: string; code: string; name: string; amount: number }> = [];
    for (const r of rows) {
      if (!r.account) continue;
      const isIncome = r.account.account_type === "income";
      const isExpense = r.account.account_type === "expense";
      if (!isIncome && !isExpense) continue;
      const amount = isIncome ? r.credit - r.debit : r.debit - r.credit;
      if (isIncome) income += amount;
      else expense += amount;
      breakdown.push({
        accountType: r.account.account_type,
        code: r.account.code,
        name: r.account.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    return {
      window,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      netProfit: Math.round((income - expense) * 100) / 100,
      breakdown,
    };
  }

  async balanceSheet(window: Window) {
    const rows = await this.trialBalanceWithAccounts(window);
    const buckets: Record<string, number> = { asset: 0, liability: 0, equity: 0 };
    const breakdown: Array<{ accountType: string; code: string; name: string; amount: number }> = [];
    for (const r of rows) {
      if (!r.account) continue;
      const t = r.account.account_type;
      if (!(t in buckets)) continue;
      const amount = t === "asset" ? r.debit - r.credit : r.credit - r.debit;
      buckets[t] += amount;
      breakdown.push({
        accountType: t,
        code: r.account.code,
        name: r.account.name,
        amount: Math.round(amount * 100) / 100,
      });
    }
    return {
      window,
      totals: {
        assets: Math.round(buckets.asset * 100) / 100,
        liabilities: Math.round(buckets.liability * 100) / 100,
        equity: Math.round(buckets.equity * 100) / 100,
      },
      breakdown,
    };
  }

  async cashFlow(window: Window) {
    const { data, error } = await this.sb
      .from("fin_journal_lines")
      .select(
        "debit,credit,fin_chart_of_accounts!inner(account_subtype,account_type),fin_journal_entries!inner(entry_date,tenant_id,status)",
      )
      .eq("tenant_id", window.tenantId)
      .eq("fin_journal_entries.tenant_id", window.tenantId)
      .eq("fin_journal_entries.status", "posted")
      .gte("fin_journal_entries.entry_date", window.from)
      .lte("fin_journal_entries.entry_date", window.to);
    if (error) throw new Error(error.message);
    type Row = { debit: number; credit: number; fin_chart_of_accounts: { account_subtype: string | null; account_type: string } };
    const rows = ((data ?? []) as unknown) as Row[];
    const cashSubtypes = new Set(["cash", "bank"]);
    let inflow = 0;
    let outflow = 0;
    for (const r of rows) {
      const st = r.fin_chart_of_accounts.account_subtype ?? "";
      if (!cashSubtypes.has(st)) continue;
      inflow += Number(r.debit ?? 0);
      outflow += Number(r.credit ?? 0);
    }
    return {
      window,
      inflow: Math.round(inflow * 100) / 100,
      outflow: Math.round(outflow * 100) / 100,
      net: Math.round((inflow - outflow) * 100) / 100,
    };
  }
}
