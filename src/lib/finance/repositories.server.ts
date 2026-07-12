/**
 * Phase 2.9 Finance & Accounting — Stage 2 Repositories (server-only).
 *
 * Thin typed wrappers over Stage 1 `fin_*` tables. Repositories contain
 * NO business logic — only reads and writes. All orchestration
 * (numbering, posting, workflow events, timeline, search, approvals,
 * royalty math, depreciation, tax posting, period locking) lives in
 * the engines under ./engines/*.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import type {
  PostgrestMaybeSingleResponse,
  PostgrestResponse,
  PostgrestSingleResponse,
} from "@supabase/supabase-js";

type SB = SupabaseClient<Database>;

type AnyRes =
  | PostgrestSingleResponse<unknown>
  | PostgrestMaybeSingleResponse<unknown>
  | PostgrestResponse<unknown>;

// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
function unwrap<T = any>(res: AnyRes): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("Row not found");
  return res.data as T;
}
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
function unwrapMaybe<T = any>(res: AnyRes): T | null {
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? null) as T | null);
}
// biome-ignore lint/suspicious/noExplicitAny: PostgREST generic depth
function unwrapList<T = any>(res: AnyRes): T[] {
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as T[]);
}

// ---------------------------------------------------------------------------
// Chart of accounts / dimensions
// ---------------------------------------------------------------------------
export type ChartOfAccountRow = Tables<"fin_chart_of_accounts">;
export class ChartOfAccountsRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<ChartOfAccountRow>(
      await this.sb.from("fin_chart_of_accounts").select("*").eq("id", id).maybeSingle(),
    );
  }
  async getByCode(tenantId: string, code: string) {
    return unwrapMaybe<ChartOfAccountRow>(
      await this.sb
        .from("fin_chart_of_accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("code", code)
        .maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_chart_of_accounts">) {
    return unwrap<ChartOfAccountRow>(
      await this.sb.from("fin_chart_of_accounts").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_chart_of_accounts">) {
    return unwrap<ChartOfAccountRow>(
      await this.sb
        .from("fin_chart_of_accounts")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async list(args: {
    tenantId: string;
    accountType?: string | null;
    isActive?: boolean | null;
    search?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("fin_chart_of_accounts")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("code", { ascending: true })
      .limit(args.limit ?? 500);
    if (args.accountType) q = q.eq("account_type", args.accountType);
    if (args.isActive !== undefined && args.isActive !== null)
      q = q.eq("is_active", args.isActive);
    if (args.search) q = q.or(`code.ilike.%${args.search}%,name.ilike.%${args.search}%`);
    return unwrapList<ChartOfAccountRow>(await q);
  }
}

export type CostCenterRow = Tables<"fin_cost_centers">;
export class CostCenterRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_cost_centers">) {
    return unwrap<CostCenterRow>(
      await this.sb.from("fin_cost_centers").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_cost_centers">) {
    return unwrap<CostCenterRow>(
      await this.sb.from("fin_cost_centers").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<CostCenterRow>(
      await this.sb
        .from("fin_cost_centers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("code", { ascending: true }),
    );
  }
}

export type ProfitCenterRow = Tables<"fin_profit_centers">;
export class ProfitCenterRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_profit_centers">) {
    return unwrap<ProfitCenterRow>(
      await this.sb.from("fin_profit_centers").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_profit_centers">) {
    return unwrap<ProfitCenterRow>(
      await this.sb.from("fin_profit_centers").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<ProfitCenterRow>(
      await this.sb
        .from("fin_profit_centers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("code", { ascending: true }),
    );
  }
}

// ---------------------------------------------------------------------------
// Fiscal calendar
// ---------------------------------------------------------------------------
export type FiscalYearRow = Tables<"fin_fiscal_years">;
export class FiscalYearRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<FiscalYearRow>(
      await this.sb.from("fin_fiscal_years").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_fiscal_years">) {
    return unwrap<FiscalYearRow>(
      await this.sb.from("fin_fiscal_years").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_fiscal_years">) {
    return unwrap<FiscalYearRow>(
      await this.sb.from("fin_fiscal_years").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: { tenantId: string; status?: string | null }) {
    let q = this.sb
      .from("fin_fiscal_years")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("start_date", { ascending: false });
    if (args.status) q = q.eq("status", args.status);
    return unwrapList<FiscalYearRow>(await q);
  }
}

export type AccountingPeriodRow = Tables<"fin_accounting_periods">;
export class AccountingPeriodRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<AccountingPeriodRow>(
      await this.sb.from("fin_accounting_periods").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_accounting_periods">) {
    return unwrap<AccountingPeriodRow>(
      await this.sb.from("fin_accounting_periods").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_accounting_periods">) {
    return unwrap<AccountingPeriodRow>(
      await this.sb
        .from("fin_accounting_periods")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async listByYear(fiscalYearId: string) {
    return unwrapList<AccountingPeriodRow>(
      await this.sb
        .from("fin_accounting_periods")
        .select("*")
        .eq("fiscal_year_id", fiscalYearId)
        .order("period_number", { ascending: true }),
    );
  }
  async findByDate(tenantId: string, date: string) {
    return unwrapMaybe<AccountingPeriodRow>(
      await this.sb
        .from("fin_accounting_periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .lte("start_date", date)
        .gte("end_date", date)
        .maybeSingle(),
    );
  }
}

// ---------------------------------------------------------------------------
// Journals
// ---------------------------------------------------------------------------
export type JournalEntryRow = Tables<"fin_journal_entries">;
export type JournalLineRow = Tables<"fin_journal_lines">;

export class JournalRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<JournalEntryRow>(
      await this.sb.from("fin_journal_entries").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_journal_entries">) {
    return unwrap<JournalEntryRow>(
      await this.sb.from("fin_journal_entries").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_journal_entries">) {
    return unwrap<JournalEntryRow>(
      await this.sb
        .from("fin_journal_entries")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async list(args: {
    tenantId: string;
    status?: string | null;
    periodId?: string | null;
    branchId?: string | null;
    sourceModule?: string | null;
    from?: string | null;
    to?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("fin_journal_entries")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("entry_date", { ascending: false })
      .limit(args.limit ?? 100);
    if (args.status) q = q.eq("status", args.status);
    if (args.periodId) q = q.eq("period_id", args.periodId);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    if (args.sourceModule) q = q.eq("source_module", args.sourceModule);
    if (args.from) q = q.gte("entry_date", args.from);
    if (args.to) q = q.lte("entry_date", args.to);
    return unwrapList<JournalEntryRow>(await q);
  }
}

export class JournalLineRepository {
  constructor(private readonly sb: SB) {}
  async insertMany(rows: TablesInsert<"fin_journal_lines">[]) {
    if (rows.length === 0) return [];
    return unwrapList<JournalLineRow>(
      await this.sb.from("fin_journal_lines").insert(rows).select("*"),
    );
  }
  async listByEntry(entryId: string) {
    return unwrapList<JournalLineRow>(
      await this.sb
        .from("fin_journal_lines")
        .select("*")
        .eq("journal_entry_id", entryId)
        .order("line_number", { ascending: true }),
    );
  }
  async deleteByEntry(entryId: string) {
    const { error } = await this.sb
      .from("fin_journal_lines")
      .delete()
      .eq("journal_entry_id", entryId);
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Cash / bank
// ---------------------------------------------------------------------------
export type BankAccountRow = Tables<"fin_bank_accounts">;
export class BankAccountRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<BankAccountRow>(
      await this.sb.from("fin_bank_accounts").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<BankAccountRow>(
      await this.sb
        .from("fin_bank_accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true }),
    );
  }
}

export type CashBookRow = Tables<"fin_cash_books">;
export class CashBookRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<CashBookRow>(
      await this.sb.from("fin_cash_books").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<CashBookRow>(
      await this.sb
        .from("fin_cash_books")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true }),
    );
  }
}

export type ReceiptRow = Tables<"fin_receipts">;
export class ReceiptRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<ReceiptRow>(
      await this.sb.from("fin_receipts").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_receipts">) {
    return unwrap<ReceiptRow>(
      await this.sb.from("fin_receipts").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_receipts">) {
    return unwrap<ReceiptRow>(
      await this.sb.from("fin_receipts").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string, limit = 100) {
    return unwrapList<ReceiptRow>(
      await this.sb
        .from("fin_receipts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("receipt_date", { ascending: false })
        .limit(limit),
    );
  }
}

export type PaymentRow = Tables<"fin_payments">;
export class PaymentRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<PaymentRow>(
      await this.sb.from("fin_payments").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_payments">) {
    return unwrap<PaymentRow>(
      await this.sb.from("fin_payments").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_payments">) {
    return unwrap<PaymentRow>(
      await this.sb.from("fin_payments").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string, limit = 100) {
    return unwrapList<PaymentRow>(
      await this.sb
        .from("fin_payments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false })
        .limit(limit),
    );
  }
}

export type PettyCashRow = Tables<"fin_petty_cash">;
export class PettyCashRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_petty_cash">) {
    return unwrap<PettyCashRow>(
      await this.sb.from("fin_petty_cash").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_petty_cash">) {
    return unwrap<PettyCashRow>(
      await this.sb.from("fin_petty_cash").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string, limit = 200) {
    return unwrapList<PettyCashRow>(
      await this.sb
        .from("fin_petty_cash")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("voucher_date", { ascending: false })
        .limit(limit),
    );
  }
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export type ExpenseRow = Tables<"fin_expenses">;
export class ExpenseRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<ExpenseRow>(
      await this.sb.from("fin_expenses").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_expenses">) {
    return unwrap<ExpenseRow>(
      await this.sb.from("fin_expenses").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_expenses">) {
    return unwrap<ExpenseRow>(
      await this.sb.from("fin_expenses").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string, status?: string | null, limit = 200) {
    let q = this.sb
      .from("fin_expenses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("expense_date", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    return unwrapList<ExpenseRow>(await q);
  }
}

// ---------------------------------------------------------------------------
// Revenue recognition
// ---------------------------------------------------------------------------
export type RevenueRecognitionRow = Tables<"fin_revenue_recognition">;
export class RevenueRecognitionRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_revenue_recognition">) {
    return unwrap<RevenueRecognitionRow>(
      await this.sb.from("fin_revenue_recognition").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_revenue_recognition">) {
    return unwrap<RevenueRecognitionRow>(
      await this.sb
        .from("fin_revenue_recognition")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async list(tenantId: string, status?: string | null, limit = 200) {
    let q = this.sb
      .from("fin_revenue_recognition")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("recognition_date", { ascending: false })
      .limit(limit);
    if (status) q = q.eq("status", status);
    return unwrapList<RevenueRecognitionRow>(await q);
  }
}

// ---------------------------------------------------------------------------
// Fixed assets
// ---------------------------------------------------------------------------
export type FixedAssetRow = Tables<"fin_fixed_assets">;
export class FixedAssetRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<FixedAssetRow>(
      await this.sb.from("fin_fixed_assets").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_fixed_assets">) {
    return unwrap<FixedAssetRow>(
      await this.sb.from("fin_fixed_assets").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_fixed_assets">) {
    return unwrap<FixedAssetRow>(
      await this.sb.from("fin_fixed_assets").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    status?: string | null;
    branchId?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("fin_fixed_assets")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("acquisition_date", { ascending: false })
      .limit(args.limit ?? 200);
    if (args.status) q = q.eq("status", args.status);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    return unwrapList<FixedAssetRow>(await q);
  }
}

export type DepreciationScheduleRow = Tables<"fin_depreciation_schedule">;
export class DepreciationRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_depreciation_schedule">) {
    return unwrap<DepreciationScheduleRow>(
      await this.sb.from("fin_depreciation_schedule").insert(row).select("*").single(),
    );
  }
  async listByAsset(assetId: string) {
    return unwrapList<DepreciationScheduleRow>(
      await this.sb
        .from("fin_depreciation_schedule")
        .select("*")
        .eq("asset_id", assetId)
        .order("schedule_date", { ascending: true }),
    );
  }
  async latestForAsset(assetId: string) {
    return unwrapMaybe<DepreciationScheduleRow>(
      await this.sb
        .from("fin_depreciation_schedule")
        .select("*")
        .eq("asset_id", assetId)
        .order("schedule_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
  }
}

// ---------------------------------------------------------------------------
// Budgets / forecasts
// ---------------------------------------------------------------------------
export type BudgetRow = Tables<"fin_budgets">;
export type BudgetLineRow = Tables<"fin_budget_lines">;

export class BudgetRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<BudgetRow>(
      await this.sb.from("fin_budgets").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_budgets">) {
    return unwrap<BudgetRow>(
      await this.sb.from("fin_budgets").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_budgets">) {
    return unwrap<BudgetRow>(
      await this.sb.from("fin_budgets").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<BudgetRow>(
      await this.sb
        .from("fin_budgets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    );
  }
  async insertLines(rows: TablesInsert<"fin_budget_lines">[]) {
    if (rows.length === 0) return [];
    return unwrapList<BudgetLineRow>(
      await this.sb.from("fin_budget_lines").insert(rows).select("*"),
    );
  }
  async listLines(budgetId: string) {
    return unwrapList<BudgetLineRow>(
      await this.sb.from("fin_budget_lines").select("*").eq("budget_id", budgetId),
    );
  }
  async deleteLines(budgetId: string) {
    const { error } = await this.sb.from("fin_budget_lines").delete().eq("budget_id", budgetId);
    if (error) throw new Error(error.message);
  }
}

export type ForecastRow = Tables<"fin_forecasts">;
export class ForecastRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_forecasts">) {
    return unwrap<ForecastRow>(
      await this.sb.from("fin_forecasts").insert(row).select("*").single(),
    );
  }
  async list(args: { tenantId: string; scenario?: string | null; branchId?: string | null }) {
    let q = this.sb
      .from("fin_forecasts")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("created_at", { ascending: false });
    if (args.scenario) q = q.eq("scenario", args.scenario);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    return unwrapList<ForecastRow>(await q);
  }
}

// ---------------------------------------------------------------------------
// Royalty
// ---------------------------------------------------------------------------
export type RoyaltyRuleRow = Tables<"fin_royalty_rules">;
export class RoyaltyRuleRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<RoyaltyRuleRow>(
      await this.sb.from("fin_royalty_rules").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_royalty_rules">) {
    return unwrap<RoyaltyRuleRow>(
      await this.sb.from("fin_royalty_rules").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_royalty_rules">) {
    return unwrap<RoyaltyRuleRow>(
      await this.sb.from("fin_royalty_rules").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<RoyaltyRuleRow>(
      await this.sb
        .from("fin_royalty_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("effective_from", { ascending: false }),
    );
  }
  async activeForFranchise(tenantId: string, franchiseOrgUnitId: string, onDate: string) {
    return unwrapList<RoyaltyRuleRow>(
      await this.sb
        .from("fin_royalty_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("franchise_org_unit_id", franchiseOrgUnitId)
        .eq("is_active", true)
        .lte("effective_from", onDate),
    );
  }
}

export type RoyaltyLedgerRow = Tables<"fin_royalty_ledger">;
export class RoyaltyLedgerRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_royalty_ledger">) {
    return unwrap<RoyaltyLedgerRow>(
      await this.sb.from("fin_royalty_ledger").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_royalty_ledger">) {
    return unwrap<RoyaltyLedgerRow>(
      await this.sb.from("fin_royalty_ledger").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listOpenForFranchise(tenantId: string, franchiseOrgUnitId: string) {
    return unwrapList<RoyaltyLedgerRow>(
      await this.sb
        .from("fin_royalty_ledger")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("franchise_org_unit_id", franchiseOrgUnitId)
        .eq("status", "accrued"),
    );
  }
}

export type RoyaltySettlementRow = Tables<"fin_royalty_settlements">;
export class RoyaltySettlementRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_royalty_settlements">) {
    return unwrap<RoyaltySettlementRow>(
      await this.sb.from("fin_royalty_settlements").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_royalty_settlements">) {
    return unwrap<RoyaltySettlementRow>(
      await this.sb
        .from("fin_royalty_settlements")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async list(tenantId: string) {
    return unwrapList<RoyaltySettlementRow>(
      await this.sb
        .from("fin_royalty_settlements")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("settlement_date", { ascending: false }),
    );
  }
}

// ---------------------------------------------------------------------------
// Vendor / AP / AR / Tax / Audit
// ---------------------------------------------------------------------------
export type VendorBillRow = Tables<"fin_vendor_bills">;
export type VendorBillItemRow = Tables<"fin_vendor_bill_items">;
export class VendorBillRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe<VendorBillRow>(
      await this.sb.from("fin_vendor_bills").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"fin_vendor_bills">) {
    return unwrap<VendorBillRow>(
      await this.sb.from("fin_vendor_bills").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_vendor_bills">) {
    return unwrap<VendorBillRow>(
      await this.sb.from("fin_vendor_bills").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    status?: string | null;
    vendorId?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("fin_vendor_bills")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("bill_date", { ascending: false })
      .limit(args.limit ?? 100);
    if (args.status) q = q.eq("status", args.status);
    if (args.vendorId) q = q.eq("vendor_id", args.vendorId);
    return unwrapList<VendorBillRow>(await q);
  }
  async insertItems(rows: TablesInsert<"fin_vendor_bill_items">[]) {
    if (rows.length === 0) return [];
    return unwrapList<VendorBillItemRow>(
      await this.sb.from("fin_vendor_bill_items").insert(rows).select("*"),
    );
  }
  async listItems(billId: string) {
    return unwrapList<VendorBillItemRow>(
      await this.sb
        .from("fin_vendor_bill_items")
        .select("*")
        .eq("bill_id", billId)
        .order("line_number", { ascending: true }),
    );
  }
}

export type ArLedgerRow = Tables<"fin_ar_ledger">;
export class AccountsReceivableRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_ar_ledger">) {
    return unwrap<ArLedgerRow>(
      await this.sb.from("fin_ar_ledger").insert(row).select("*").single(),
    );
  }
  async list(tenantId: string, limit = 500) {
    return unwrapList<ArLedgerRow>(
      await this.sb
        .from("fin_ar_ledger")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("entry_date", { ascending: false })
        .limit(limit),
    );
  }
}

export type ApLedgerRow = Tables<"fin_ap_ledger">;
export class AccountsPayableRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_ap_ledger">) {
    return unwrap<ApLedgerRow>(
      await this.sb.from("fin_ap_ledger").insert(row).select("*").single(),
    );
  }
  async list(tenantId: string, limit = 500) {
    return unwrapList<ApLedgerRow>(
      await this.sb
        .from("fin_ap_ledger")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("entry_date", { ascending: false })
        .limit(limit),
    );
  }
}

export type TaxLedgerRow = Tables<"fin_tax_ledger">;
export class TaxRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"fin_tax_ledger">) {
    return unwrap<TaxLedgerRow>(
      await this.sb.from("fin_tax_ledger").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"fin_tax_ledger">) {
    return unwrap<TaxLedgerRow>(
      await this.sb.from("fin_tax_ledger").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    taxType?: string | null;
    periodId?: string | null;
    from?: string | null;
    to?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("fin_tax_ledger")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("entry_date", { ascending: false })
      .limit(args.limit ?? 200);
    if (args.taxType) q = q.eq("tax_type", args.taxType);
    if (args.periodId) q = q.eq("period_id", args.periodId);
    if (args.from) q = q.gte("entry_date", args.from);
    if (args.to) q = q.lte("entry_date", args.to);
    return unwrapList<TaxLedgerRow>(await q);
  }
}

export type FinanceAuditRow = Tables<"fin_audit_log">;
export class AuditRepository {
  constructor(private readonly sb: SB) {}
  async list(args: { tenantId: string; entityType?: string; entityId?: string; limit?: number }) {
    let q = this.sb
      .from("fin_audit_log")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("occurred_at", { ascending: false })
      .limit(args.limit ?? 200);
    if (args.entityType) q = q.eq("entity_type", args.entityType);
    if (args.entityId) q = q.eq("entity_id", args.entityId);
    return unwrapList<FinanceAuditRow>(await q);
  }
}
