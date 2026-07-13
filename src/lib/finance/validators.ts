/**
 * Phase 2.9 Finance & Accounting — Zod validators for Stage 2 server functions.
 * Every createServerFn().inputValidator(...) in this module parses through
 * one of these schemas. Engines assume already-validated data.
 */
import { z } from "zod";

const uuid = z.string().uuid();
const optionalUuid = uuid.nullish();
const iso = z.string().min(1);
const dateStr = z.string().min(1);
const jsonRecord = z.record(z.string(), z.unknown());

// ---------------------------------------------------------------------------
// Chart of accounts / masters
// ---------------------------------------------------------------------------
export const accountUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  orgUnitId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
  accountSubtype: z.string().nullish(),
  parentId: optionalUuid,
  currency: z.string().default("INR"),
  isGroup: z.boolean().optional(),
  isActive: z.boolean().optional(),
  gstApplicable: z.boolean().optional(),
  tdsApplicable: z.boolean().optional(),
  metadata: jsonRecord.optional(),
});
export const accountListSchema = z.object({
  tenantId: uuid,
  accountType: z.string().optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(500),
});

export const costCenterUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  orgUnitId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  parentId: optionalUuid,
  branchId: optionalUuid,
  departmentId: optionalUuid,
  isActive: z.boolean().optional(),
});
export const profitCenterUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  orgUnitId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  branchId: optionalUuid,
  isActive: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Fiscal calendar
// ---------------------------------------------------------------------------
export const fiscalYearUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  orgUnitId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  startDate: dateStr,
  endDate: dateStr,
  status: z.enum(["open", "closing", "closed"]).optional(),
});
export const fiscalYearListSchema = z.object({
  tenantId: uuid,
  status: z.string().optional(),
});

export const periodOpenSchema = z.object({
  tenantId: uuid,
  fiscalYearId: uuid,
  code: z.string().min(1),
  periodNumber: z.number().int().min(1).max(24),
  startDate: dateStr,
  endDate: dateStr,
  orgUnitId: optionalUuid,
});
export const periodCloseSchema = z.object({
  tenantId: uuid,
  periodId: uuid,
});

// ---------------------------------------------------------------------------
// Journals
// ---------------------------------------------------------------------------
export const journalLineInputSchema = z
  .object({
    accountId: uuid,
    lineNumber: z.number().int().min(1),
    debit: z.number().nonnegative().default(0),
    credit: z.number().nonnegative().default(0),
    description: z.string().nullish(),
    costCenterId: optionalUuid,
    profitCenterId: optionalUuid,
    branchId: optionalUuid,
    partnerType: z.string().nullish(),
    partnerId: optionalUuid,
    taxCode: z.string().nullish(),
    metadata: jsonRecord.optional(),
  })
  .refine((v) => v.debit > 0 || v.credit > 0, "Line must have debit or credit")
  .refine((v) => !(v.debit > 0 && v.credit > 0), "Line cannot be both debit and credit");

export const journalCreateSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  periodId: optionalUuid,
  entryDate: dateStr,
  referenceType: z.string().nullish(),
  referenceId: optionalUuid,
  sourceModule: z.string().default("manual"),
  description: z.string().nullish(),
  currency: z.string().default("INR"),
  fxRate: z.number().positive().default(1),
  metadata: jsonRecord.optional(),
  lines: z.array(journalLineInputSchema).min(2),
});

export const journalIdSchema = z.object({ tenantId: uuid, journalId: uuid });
export const journalReverseSchema = journalIdSchema.extend({
  entryDate: dateStr,
  reason: z.string().min(1),
});
export const journalListSchema = z.object({
  tenantId: uuid,
  status: z.string().optional(),
  periodId: optionalUuid,
  branchId: optionalUuid,
  sourceModule: z.string().optional(),
  from: iso.optional(),
  to: iso.optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

// ---------------------------------------------------------------------------
// Cash: receipts / payments / petty cash / bank
// ---------------------------------------------------------------------------
export const receiptRecordSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  receiptDate: dateStr,
  bankAccountId: optionalUuid,
  cashBookId: optionalUuid,
  partnerType: z.enum(["patient", "customer", "franchise", "other"]),
  partnerId: optionalUuid,
  method: z.enum(["cash", "card", "upi", "neft", "rtgs", "cheque", "other"]),
  reference: z.string().nullish(),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  sourceModule: z.string().nullish(),
  sourceReferenceId: optionalUuid,
  notes: z.string().nullish(),
});
export const paymentRecordSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  paymentDate: dateStr,
  bankAccountId: optionalUuid,
  cashBookId: optionalUuid,
  partnerType: z.enum(["vendor", "employee", "franchise", "tax_authority", "other"]),
  partnerId: optionalUuid,
  method: z.enum(["cash", "card", "upi", "neft", "rtgs", "cheque", "other"]),
  reference: z.string().nullish(),
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  sourceModule: z.string().nullish(),
  sourceReferenceId: optionalUuid,
  notes: z.string().nullish(),
});
export const pettyCashSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  cashBookId: optionalUuid,
  voucherDate: dateStr,
  category: z.string().nullish(),
  purpose: z.string().nullish(),
  amount: z.number().positive(),
});
export const bankReconSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  bankAccountId: uuid,
  statementDate: dateStr,
  openingBalance: z.number(),
  closingBalance: z.number(),
  matchedLines: z.array(jsonRecord).default([]),
  unmatchedLines: z.array(jsonRecord).default([]),
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export const expenseSubmitSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  costCenterId: optionalUuid,
  expenseDate: dateStr,
  category: z.string().nullish(),
  vendorId: optionalUuid,
  employeeId: optionalUuid,
  accountId: optionalUuid,
  amount: z.number().positive(),
  taxAmount: z.number().nonnegative().default(0),
  currency: z.string().default("INR"),
  notes: z.string().nullish(),
  attachments: z.array(jsonRecord).default([]),
});
export const expenseIdSchema = z.object({ tenantId: uuid, expenseId: uuid });
export const expenseDecisionSchema = expenseIdSchema.extend({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().nullish(),
});

// ---------------------------------------------------------------------------
// Fixed Assets
// ---------------------------------------------------------------------------
export const assetRegisterSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  assetCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().nullish(),
  assetAccountId: optionalUuid,
  depreciationAccountId: optionalUuid,
  accumulatedDepAccountId: optionalUuid,
  acquisitionDate: dateStr,
  acquisitionCost: z.number().positive(),
  salvageValue: z.number().nonnegative().default(0),
  usefulLifeMonths: z.number().int().positive(),
  depreciationMethod: z.enum(["straight_line", "declining_balance", "wdv"]).default("straight_line"),
});
export const assetIdSchema = z.object({ tenantId: uuid, assetId: uuid });
export const assetDepreciationSchema = assetIdSchema.extend({
  scheduleDate: dateStr,
  periodId: optionalUuid,
});
export const assetDisposeSchema = assetIdSchema.extend({
  disposedAt: dateStr,
  disposalValue: z.number().nonnegative(),
});
export const assetListSchema = z.object({
  tenantId: uuid,
  status: z.string().optional(),
  branchId: optionalUuid,
  limit: z.number().int().min(1).max(500).default(200),
});

// ---------------------------------------------------------------------------
// Budgets / Forecasts
// ---------------------------------------------------------------------------
export const budgetLineInputSchema = z.object({
  accountId: optionalUuid,
  periodId: optionalUuid,
  amount: z.number(),
  notes: z.string().nullish(),
});
export const budgetCreateSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  fiscalYearId: optionalUuid,
  branchId: optionalUuid,
  costCenterId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  budgetType: z.string().default("annual"),
  currency: z.string().default("INR"),
  lines: z.array(budgetLineInputSchema).default([]),
});
export const budgetUpdateSchema = z.object({
  tenantId: uuid,
  budgetId: uuid,
  status: z.enum(["draft", "submitted", "approved", "closed"]).optional(),
  lines: z.array(budgetLineInputSchema).optional(),
});

export const forecastCreateSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  fiscalYearId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  forecastType: z.string().default("revenue"),
  horizonMonths: z.number().int().min(1).max(60).default(12),
  scenario: z.string().default("baseline"),
  dataPoints: z.array(jsonRecord).default([]),
  assumptions: jsonRecord.optional(),
});
export const forecastListSchema = z.object({
  tenantId: uuid,
  scenario: z.string().optional(),
  branchId: optionalUuid,
});

// ---------------------------------------------------------------------------
// Royalty
// ---------------------------------------------------------------------------
export const royaltyRuleUpsertSchema = z.object({
  tenantId: uuid,
  id: uuid.optional(),
  orgUnitId: optionalUuid,
  franchiseOrgUnitId: optionalUuid,
  code: z.string().min(1),
  name: z.string().min(1),
  basis: z.enum(["revenue", "gross_margin", "fixed"]).default("revenue"),
  ratePct: z.number().nonnegative().default(0),
  fixedAmount: z.number().nonnegative().default(0),
  minimumAmount: z.number().nonnegative().default(0),
  frequency: z.enum(["monthly", "quarterly", "yearly"]).default("monthly"),
  effectiveFrom: dateStr,
  effectiveTo: dateStr.nullish(),
});
export const royaltyCalculateSchema = z.object({
  tenantId: uuid,
  franchiseOrgUnitId: uuid,
  periodId: uuid,
  revenueBasis: z.number().nonnegative(),
  adjustments: z.number().default(0),
});
export const royaltySettleSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  franchiseOrgUnitId: uuid,
  settlementDate: dateStr,
  periodFrom: dateStr,
  periodTo: dateStr,
  ledgerIds: z.array(uuid).default([]),
  adjustments: z.number().default(0),
  notes: z.string().nullish(),
});

// ---------------------------------------------------------------------------
// Vendor bills / AP
// ---------------------------------------------------------------------------
export const vendorBillItemInputSchema = z.object({
  accountId: optionalUuid,
  costCenterId: optionalUuid,
  description: z.string().nullish(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative(),
  taxCode: z.string().nullish(),
  taxAmount: z.number().nonnegative().default(0),
});
export const vendorBillCreateSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  vendorId: optionalUuid,
  vendorInvoiceRef: z.string().nullish(),
  billDate: dateStr,
  dueDate: dateStr.nullish(),
  currency: z.string().default("INR"),
  discountAmount: z.number().nonnegative().default(0),
  sourceModule: z.string().nullish(),
  sourceReferenceId: optionalUuid,
  notes: z.string().nullish(),
  items: z.array(vendorBillItemInputSchema).min(1),
});
export const vendorBillIdSchema = z.object({ tenantId: uuid, billId: uuid });
export const vendorPaymentSchema = vendorBillIdSchema.extend({
  paymentDate: dateStr,
  method: z.enum(["cash", "card", "upi", "neft", "rtgs", "cheque", "other"]),
  amount: z.number().positive(),
  bankAccountId: optionalUuid,
  reference: z.string().nullish(),
});
export const vendorBillListSchema = z.object({
  tenantId: uuid,
  status: z.string().optional(),
  vendorId: optionalUuid,
  limit: z.number().int().min(1).max(500).default(100),
});

// ---------------------------------------------------------------------------
// Tax
// ---------------------------------------------------------------------------
export const taxPostSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  entryDate: dateStr,
  taxType: z.enum(["gst_output", "gst_input", "tds", "tcs", "other"]),
  taxCode: z.string().nullish(),
  gstin: z.string().nullish(),
  periodId: optionalUuid,
  taxableAmount: z.number().nonnegative(),
  ratePct: z.number().nonnegative().default(0),
  cgst: z.number().nonnegative().default(0),
  sgst: z.number().nonnegative().default(0),
  igst: z.number().nonnegative().default(0),
  cess: z.number().nonnegative().default(0),
  tdsAmount: z.number().nonnegative().default(0),
  tcsAmount: z.number().nonnegative().default(0),
  sourceModule: z.string().nullish(),
  sourceReferenceId: optionalUuid,
});
export const taxListSchema = z.object({
  tenantId: uuid,
  taxType: z.string().optional(),
  periodId: optionalUuid,
  from: iso.optional(),
  to: iso.optional(),
  limit: z.number().int().min(1).max(1000).default(200),
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export const reportWindowSchema = z.object({
  tenantId: uuid,
  branchId: optionalUuid,
  periodId: optionalUuid,
  from: dateStr,
  to: dateStr,
});

// ---------------------------------------------------------------------------
// Stage 4 — Automation
// ---------------------------------------------------------------------------
export const sourcePostSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  branchId: optionalUuid,
  entryDate: dateStr,
  amount: z.number().positive(),
  currency: z.string().default("INR"),
  sourceModule: z.enum([
    "clinical", "laboratory", "radiology", "pharmacy", "scheduling",
    "consultation", "membership", "package", "product", "insurance",
  ]),
  referenceId: uuid,
  referenceType: z.string().min(1).optional(),
  description: z.string().nullish(),
  partnerType: z.string().nullish(),
  partnerId: optionalUuid,
  metadata: jsonRecord.optional(),
});

export const monthEndSchema = z.object({
  tenantId: uuid,
  periodId: uuid,
  closePeriod: z.boolean().default(false),
  runDepreciation: z.boolean().default(true),
});
export const yearEndSchema = z.object({
  tenantId: uuid,
  fiscalYearId: uuid,
  closeYear: z.boolean().default(false),
});
export const depreciationBatchSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  scheduleDate: dateStr,
  periodId: optionalUuid,
});
export const bankAutoMatchSchema = z.object({
  tenantId: uuid,
  orgUnitId: optionalUuid,
  bankAccountId: uuid,
  statementDate: dateStr,
  openingBalance: z.number(),
  closingBalance: z.number(),
  statementLines: z
    .array(
      z.object({
        date: dateStr,
        amount: z.number(),
        reference: z.string().nullish(),
        description: z.string().nullish(),
      }),
    )
    .default([]),
});

export type JournalCreateInput = z.infer<typeof journalCreateSchema>;
export type ReceiptRecordInput = z.infer<typeof receiptRecordSchema>;
export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;
export type ExpenseSubmitInput = z.infer<typeof expenseSubmitSchema>;
export type AssetRegisterInput = z.infer<typeof assetRegisterSchema>;
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;
export type ForecastCreateInput = z.infer<typeof forecastCreateSchema>;
export type RoyaltyCalculateInput = z.infer<typeof royaltyCalculateSchema>;
export type RoyaltySettleInput = z.infer<typeof royaltySettleSchema>;
export type VendorBillCreateInput = z.infer<typeof vendorBillCreateSchema>;
export type VendorPaymentInput = z.infer<typeof vendorPaymentSchema>;
export type TaxPostInput = z.infer<typeof taxPostSchema>;
export type ReportWindowInput = z.infer<typeof reportWindowSchema>;
export type SourcePostInput = z.infer<typeof sourcePostSchema>;
export type MonthEndInput = z.infer<typeof monthEndSchema>;
export type YearEndInput = z.infer<typeof yearEndSchema>;
export type DepreciationBatchInput = z.infer<typeof depreciationBatchSchema>;
export type BankAutoMatchInput = z.infer<typeof bankAutoMatchSchema>;
