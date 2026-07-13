/**
 * Phase 2.9 Stage 6 — Finance Analytics Service (READ-ONLY).
 *
 * Server-side aggregation over Stage 2 repositories only. No engine calls,
 * no writes, no accounting formulas beyond simple tallies (count / sum /
 * group-by). Every business formula referenced here lives in the KPI
 * Dictionary and is implemented in the Stage 2/4 engines.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  ChartOfAccountsRepository,
  JournalRepository,
  ReceiptRepository,
  PaymentRepository,
  PettyCashRepository,
  BankAccountRepository,
  ExpenseRepository,
  VendorBillRepository,
  FixedAssetRepository,
  DepreciationRepository,
  BudgetRepository,
  ForecastRepository,
  RoyaltyRuleRepository,
  RoyaltyLedgerRepository,
  RoyaltySettlementRepository,
  TaxRepository,
  AuditRepository,
  AccountsReceivableRepository,
  AccountsPayableRepository,
  AccountingPeriodRepository,
} from "./repositories.server";
import type { AnalyticsWindow } from "./validators";

type SB = SupabaseClient<Database>;

const num = (v: unknown) => (v == null ? 0 : Number(v));
const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + f(r), 0);
function tallyBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = String(r[key] ?? "unknown");
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}
function sumBy<T extends Record<string, unknown>>(rows: T[], key: keyof T, valueKey: keyof T): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = String(r[key] ?? "unknown");
    acc[k] = (acc[k] ?? 0) + num(r[valueKey]);
    return acc;
  }, {});
}
function inWindow(dateStr: string | null | undefined, w: AnalyticsWindow): boolean {
  if (!dateStr) return true;
  const d = String(dateStr).slice(0, 10);
  if (w.from && d < w.from) return false;
  if (w.to && d > w.to) return false;
  return true;
}

export class FinanceAnalyticsService {
  private readonly accounts: ChartOfAccountsRepository;
  private readonly journals: JournalRepository;
  private readonly receipts: ReceiptRepository;
  private readonly payments: PaymentRepository;
  private readonly petty: PettyCashRepository;
  private readonly banks: BankAccountRepository;
  private readonly expenses: ExpenseRepository;
  private readonly bills: VendorBillRepository;
  private readonly assets: FixedAssetRepository;
  private readonly dep: DepreciationRepository;
  private readonly budgets: BudgetRepository;
  private readonly forecasts: ForecastRepository;
  private readonly royaltyRules: RoyaltyRuleRepository;
  private readonly royaltyLedger: RoyaltyLedgerRepository;
  private readonly royaltySettle: RoyaltySettlementRepository;
  private readonly taxes: TaxRepository;
  private readonly audit: AuditRepository;
  private readonly ar: AccountsReceivableRepository;
  private readonly ap: AccountsPayableRepository;
  private readonly periods: AccountingPeriodRepository;

  constructor(sb: SB) {
    this.accounts = new ChartOfAccountsRepository(sb);
    this.journals = new JournalRepository(sb);
    this.receipts = new ReceiptRepository(sb);
    this.payments = new PaymentRepository(sb);
    this.petty = new PettyCashRepository(sb);
    this.banks = new BankAccountRepository(sb);
    this.expenses = new ExpenseRepository(sb);
    this.bills = new VendorBillRepository(sb);
    this.assets = new FixedAssetRepository(sb);
    this.dep = new DepreciationRepository(sb);
    this.budgets = new BudgetRepository(sb);
    this.forecasts = new ForecastRepository(sb);
    this.royaltyRules = new RoyaltyRuleRepository(sb);
    this.royaltyLedger = new RoyaltyLedgerRepository(sb);
    this.royaltySettle = new RoyaltySettlementRepository(sb);
    this.taxes = new TaxRepository(sb);
    this.audit = new AuditRepository(sb);
    this.ar = new AccountsReceivableRepository(sb);
    this.ap = new AccountsPayableRepository(sb);
    this.periods = new AccountingPeriodRepository(sb);
  }

  async getExecutiveKpis(w: AnalyticsWindow) {
    const [journals, receipts, payments, banks, bills, expenses, assets, budgets, forecasts, taxes] = await Promise.all([
      this.journals.list({ tenantId: w.tenantId, from: w.from, to: w.to, limit: 1000 }),
      this.receipts.list(w.tenantId, 1000),
      this.payments.list(w.tenantId, 1000),
      this.banks.list(w.tenantId),
      this.bills.list({ tenantId: w.tenantId, limit: 1000 }),
      this.expenses.list(w.tenantId, null, 1000),
      this.assets.list({ tenantId: w.tenantId, limit: 1000 }),
      this.budgets.list(w.tenantId),
      this.forecasts.list({ tenantId: w.tenantId }),
      this.taxes.list({ tenantId: w.tenantId, from: w.from, to: w.to, limit: 1000 }),
    ]);
    const cashInflow = sum(receipts.filter((r) => inWindow(r.receipt_date, w)), (r) => num(r.amount));
    const cashOutflow = sum(payments.filter((r) => inWindow(r.payment_date, w)), (r) => num(r.amount));
    const bankBalance = sum(banks, (r) => num(r.opening_balance));
    const openBills = bills.filter((b) => b.status !== "paid" && b.status !== "voided");
    const openExpenses = expenses.filter((e) => e.status === "submitted" || e.status === "pending_approval");
    return {
      window: w,
      journals: journals.length,
      cashInflow,
      cashOutflow,
      netCash: cashInflow - cashOutflow,
      bankBalance,
      openBillsCount: openBills.length,
      openBillsAmount: sum(openBills, (b) => num(b.balance_amount ?? b.total_amount)),
      openExpensesCount: openExpenses.length,
      openExpensesAmount: sum(openExpenses, (e) => num(e.amount)),
      assets: assets.length,
      budgets: budgets.length,
      forecasts: forecasts.length,
      taxTotal: sum(taxes, (t) => num(t.cgst) + num(t.sgst) + num(t.igst) + num(t.cess)),
    };
  }

  async getGeneralLedger(w: AnalyticsWindow) {
    const [journals, accounts] = await Promise.all([
      this.journals.list({ tenantId: w.tenantId, from: w.from, to: w.to, limit: 2000 }),
      this.accounts.list({ tenantId: w.tenantId, limit: 1000 }),
    ]);
    return {
      totalJournals: journals.length,
      postedJournals: journals.filter((j) => j.status === "posted").length,
      draftJournals: journals.filter((j) => j.status === "draft").length,
      reversedJournals: journals.filter((j) => j.status === "reversed").length,
      voidedJournals: journals.filter((j) => j.status === "voided").length,
      accounts: accounts.length,
      byStatus: tallyBy(journals as unknown as Record<string, unknown>[], "status"),
    };
  }

  async getRevenue(w: AnalyticsWindow) {
    const receipts = await this.receipts.list(w.tenantId, 2000);
    const scoped = receipts.filter((r) => inWindow(r.receipt_date, w));
    return {
      total: sum(scoped, (r) => num(r.amount)),
      count: scoped.length,
      byMethod: sumBy(scoped as unknown as Record<string, unknown>[], "payment_mode", "amount"),
      byBranch: sumBy(scoped as unknown as Record<string, unknown>[], "branch_id", "amount"),
    };
  }

  async getExpenses(w: AnalyticsWindow) {
    const expenses = await this.expenses.list(w.tenantId, null, 2000);
    const scoped = expenses.filter((e) => inWindow(e.voucher_date, w));
    return {
      total: sum(scoped, (e) => num(e.amount)),
      count: scoped.length,
      byStatus: tallyBy(scoped as unknown as Record<string, unknown>[], "status"),
      byCategory: sumBy(scoped as unknown as Record<string, unknown>[], "category", "amount"),
    };
  }

  async getProfitability(w: AnalyticsWindow) {
    const rev = await this.getRevenue(w);
    const exp = await this.getExpenses(w);
    const gross = rev.total - exp.total;
    return {
      revenue: rev.total,
      expense: exp.total,
      grossProfit: gross,
      operatingMargin: rev.total > 0 ? gross / rev.total : 0,
    };
  }

  async getCashFlow(w: AnalyticsWindow) {
    const [receipts, payments, petty] = await Promise.all([
      this.receipts.list(w.tenantId, 2000),
      this.payments.list(w.tenantId, 2000),
      this.petty.list(w.tenantId, 2000),
    ]);
    const rs = receipts.filter((r) => inWindow(r.receipt_date, w));
    const ps = payments.filter((r) => inWindow(r.payment_date, w));
    const pc = petty.filter((r) => inWindow(r.expense_date, w));
    return {
      inflow: sum(rs, (r) => num(r.amount)),
      outflow: sum(ps, (r) => num(r.amount)) + sum(pc, (r) => num(r.amount)),
      byDayInflow: sumBy(rs as unknown as Record<string, unknown>[], "receipt_date", "amount"),
      byDayOutflow: sumBy(ps as unknown as Record<string, unknown>[], "payment_date", "amount"),
    };
  }

  async getAR(w: AnalyticsWindow) {
    const rows = await this.ar.list(w.tenantId, 2000);
    const scoped = rows.filter((r) => inWindow(r.entry_date, w));
    const balance = sum(scoped, (r) => num(r.debit) - num(r.credit));
    return {
      count: scoped.length,
      balance,
      byBranch: sumBy(scoped as unknown as Record<string, unknown>[], "branch_id", "debit"),
    };
  }

  async getAP(w: AnalyticsWindow) {
    const rows = await this.ap.list(w.tenantId, 2000);
    const scoped = rows.filter((r) => inWindow(r.entry_date, w));
    const balance = sum(scoped, (r) => num(r.credit) - num(r.debit));
    return {
      count: scoped.length,
      balance,
      byBranch: sumBy(scoped as unknown as Record<string, unknown>[], "branch_id", "credit"),
    };
  }

  async getAssets(w: AnalyticsWindow) {
    const rows = await this.assets.list({ tenantId: w.tenantId, limit: 2000 });
    return {
      count: rows.length,
      gross: sum(rows, (r) => num(r.acquisition_cost)),
      nbv: sum(rows, (r) => num(r.acquisition_cost)),
      byStatus: tallyBy(rows as unknown as Record<string, unknown>[], "status"),
    };
  }

  async getDepreciation(w: AnalyticsWindow) {
    // depreciation is scheduled per asset; give an aggregated recent view
    const assets = await this.assets.list({ tenantId: w.tenantId, limit: 500 });
    const schedules = await Promise.all(assets.map((a) => this.dep.latestForAsset(a.id)));
    const accrued = schedules.reduce((s, sc) => s + num(sc?.accumulated_depreciation), 0);
    return {
      assets: assets.length,
      accumulated: accrued,
      periodExpense: schedules.reduce((s, sc) => s + num(sc?.depreciation_amount), 0),
    };
  }

  async getBudgets(w: AnalyticsWindow) {
    const rows = await this.budgets.list(w.tenantId);
    return {
      count: rows.length,
      byStatus: tallyBy(rows as unknown as Record<string, unknown>[], "status"),
      byType: tallyBy(rows as unknown as Record<string, unknown>[], "budget_type"),
    };
  }

  async getForecasts(w: AnalyticsWindow) {
    const rows = await this.forecasts.list({ tenantId: w.tenantId });
    return {
      count: rows.length,
      byType: tallyBy(rows as unknown as Record<string, unknown>[], "forecast_type"),
    };
  }

  async getRoyalty(w: AnalyticsWindow) {
    const [rules, settlements] = await Promise.all([
      this.royaltyRules.list(w.tenantId),
      this.royaltySettle.list(w.tenantId),
    ]);
    return {
      rules: rules.length,
      settlements: settlements.length,
      grossAmount: sum(settlements, (r) => num(r.gross_amount)),
      netAmount: sum(settlements, (r) => num(r.net_amount)),
      byStatus: tallyBy(settlements as unknown as Record<string, unknown>[], "status"),
    };
  }

  async getTax(w: AnalyticsWindow) {
    const rows = await this.taxes.list({ tenantId: w.tenantId, from: w.from, to: w.to, limit: 2000 });
    const totals = rows.reduce(
      (acc, r) => {
        acc.cgst += num(r.cgst); acc.sgst += num(r.sgst);
        acc.igst += num(r.igst); acc.cess += num(r.cess);
        return acc;
      },
      { cgst: 0, sgst: 0, igst: 0, cess: 0 },
    );
    return {
      count: rows.length,
      totals,
      byType: tallyBy(rows as unknown as Record<string, unknown>[], "tax_type"),
    };
  }

  async getFranchise(w: AnalyticsWindow) {
    const settlements = await this.royaltySettle.list(w.tenantId);
    return {
      franchises: new Set(settlements.map((s) => s.franchise_org_unit_id)).size,
      settled: sum(settlements.filter((s) => s.status === "settled"), (s) => num(s.net_amount)),
      pending: sum(settlements.filter((s) => s.status !== "settled"), (s) => num(s.net_amount)),
      byFranchise: sumBy(settlements as unknown as Record<string, unknown>[], "franchise_org_unit_id", "net_amount"),
    };
  }

  async getCompliance(w: AnalyticsWindow) {
    const [taxes, periods] = await Promise.all([
      this.taxes.list({ tenantId: w.tenantId, from: w.from, to: w.to, limit: 500 }),
      this.periods.list({ tenantId: w.tenantId, status: null } as never).catch(async () => []),
    ]);
    return {
      taxEntries: taxes.length,
      taxByStatus: tallyBy(taxes as unknown as Record<string, unknown>[], "status"),
      periods: Array.isArray(periods) ? periods.length : 0,
    };
  }

  async getAudit(w: AnalyticsWindow) {
    const rows = await this.audit.list({ tenantId: w.tenantId, limit: 500 });
    return {
      events: rows.length,
      byEntity: tallyBy(rows as unknown as Record<string, unknown>[], "entity_type"),
      byAction: tallyBy(rows as unknown as Record<string, unknown>[], "action"),
    };
  }

  async getBanking(w: AnalyticsWindow) {
    const [banks, receipts, payments] = await Promise.all([
      this.banks.list(w.tenantId),
      this.receipts.list(w.tenantId, 500),
      this.payments.list(w.tenantId, 500),
    ]);
    return {
      accounts: banks.length,
      balance: sum(banks, (r) => num(r.opening_balance)),
      recentInflow: sum(receipts.filter((r) => inWindow(r.receipt_date, w)), (r) => num(r.amount)),
      recentOutflow: sum(payments.filter((r) => inWindow(r.payment_date, w)), (r) => num(r.amount)),
      byBank: banks.map((b) => ({ id: b.id, name: b.bank_name, balance: num(b.opening_balance) })),
    };
  }

  async getTreasury(w: AnalyticsWindow) {
    const banking = await this.getBanking(w);
    const [bills, receipts] = await Promise.all([
      this.bills.list({ tenantId: w.tenantId, limit: 1000 }),
      this.receipts.list(w.tenantId, 1000),
    ]);
    const openAP = bills.filter((b) => b.status !== "paid" && b.status !== "voided");
    return {
      liquidity: banking.balance,
      commitments: sum(openAP, (b) => num(b.balance_amount ?? b.total_amount)),
      expectedInflows: sum(receipts.filter((r) => inWindow(r.receipt_date, w)), (r) => num(r.amount)),
      accounts: banking.accounts,
    };
  }

  async getFinanceReport(w: AnalyticsWindow) {
    const [exec, gl, revenue, expenses, cashflow, ar, ap] = await Promise.all([
      this.getExecutiveKpis(w),
      this.getGeneralLedger(w),
      this.getRevenue(w),
      this.getExpenses(w),
      this.getCashFlow(w),
      this.getAR(w),
      this.getAP(w),
    ]);
    return { window: w, executive: exec, generalLedger: gl, revenue, expenses, cashflow, ar, ap };
  }
}
