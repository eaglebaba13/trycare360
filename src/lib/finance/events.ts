/**
 * Phase 2.9 Finance & Accounting — Workflow event constants.
 *
 * Emitted through the platform Workflow / Automation Engine
 * (`emit_automation_event` RPC). Finance NEVER runs its own bus — every
 * event listed here flows through the same engine used by Automation
 * Triggers, Notification Rules, Timeline and Analytics.
 *
 * Stage 1 delivers constants only. Emission is wired in Stage 2 (engines).
 */

export const FINANCE_EVENTS = {
  // Fiscal calendar
  FiscalYearOpened:     "finance.fiscal_year.opened",
  FiscalYearClosed:     "finance.fiscal_year.closed",
  PeriodOpened:         "finance.period.opened",
  PeriodClosed:         "finance.period.closed",

  // Chart of accounts
  AccountCreated:       "finance.account.created",
  AccountUpdated:       "finance.account.updated",
  AccountDeactivated:   "finance.account.deactivated",

  // Journals
  JournalDrafted:       "finance.journal.drafted",
  JournalPosted:        "finance.journal.posted",
  JournalReversed:      "finance.journal.reversed",
  JournalVoided:        "finance.journal.voided",
  JournalUnbalanced:    "finance.journal.unbalanced",

  // Cash & bank
  ReceiptRecorded:      "finance.receipt.recorded",
  ReceiptPosted:        "finance.receipt.posted",
  PaymentRecorded:      "finance.payment.recorded",
  PaymentPosted:        "finance.payment.posted",
  PettyCashRecorded:    "finance.petty_cash.recorded",
  BankReconciled:       "finance.bank.reconciled",
  BankReconMismatch:    "finance.bank.recon_mismatch",

  // Expenses
  ExpenseSubmitted:     "finance.expense.submitted",
  ExpenseApproved:      "finance.expense.approved",
  ExpenseRejected:      "finance.expense.rejected",
  ExpensePosted:        "finance.expense.posted",

  // Revenue recognition
  RevenueScheduled:     "finance.revenue.scheduled",
  RevenueRecognized:    "finance.revenue.recognized",
  RevenueDeferred:      "finance.revenue.deferred",
  RevenueReversed:      "finance.revenue.reversed",

  // Fixed assets
  AssetAcquired:        "finance.asset.acquired",
  AssetDepreciated:     "finance.asset.depreciated",
  AssetDisposed:        "finance.asset.disposed",

  // Budgets & forecasts
  BudgetCreated:        "finance.budget.created",
  BudgetApproved:       "finance.budget.approved",
  BudgetVarianceAlert:  "finance.budget.variance_alert",
  ForecastGenerated:    "finance.forecast.generated",

  // Royalty
  RoyaltyAccrued:       "finance.royalty.accrued",
  RoyaltyAdjusted:      "finance.royalty.adjusted",
  RoyaltySettled:       "finance.royalty.settled",
  RoyaltyOverdue:       "finance.royalty.overdue",

  // Vendor bills / AP
  VendorBillReceived:   "finance.vendor_bill.received",
  VendorBillApproved:   "finance.vendor_bill.approved",
  VendorBillPosted:     "finance.vendor_bill.posted",
  VendorBillPaid:       "finance.vendor_bill.paid",

  // AR / AP ledger
  ArEntryPosted:        "finance.ar.entry_posted",
  ArEntrySettled:       "finance.ar.entry_settled",
  ApEntryPosted:        "finance.ap.entry_posted",
  ApEntrySettled:       "finance.ap.entry_settled",

  // Tax
  TaxAccrued:           "finance.tax.accrued",
  TaxPaid:              "finance.tax.paid",
  GstReturnGenerated:   "finance.tax.gst_return_generated",
  TdsCertificateIssued: "finance.tax.tds_certificate_issued",

  // Period-end
  MonthEndStarted:      "finance.period_end.month_started",
  MonthEndCompleted:    "finance.period_end.month_completed",
  YearEndStarted:       "finance.period_end.year_started",
  YearEndCompleted:     "finance.period_end.year_completed",

  // P&L snapshots
  BranchPnlComputed:    "finance.pnl.branch_computed",
  FranchisePnlComputed: "finance.pnl.franchise_computed",
} as const;

export type FinanceEvent = (typeof FINANCE_EVENTS)[keyof typeof FINANCE_EVENTS];
