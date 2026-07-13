/**
 * Phase 2.9 Stage 6 — Finance Analytics server functions (READ-ONLY).
 *
 * All functions:
 *   - guarded by requireSupabaseAuth
 *   - Zod-validated via analyticsWindowSchema
 *   - delegate to FinanceAnalyticsService, which reads Stage 2 repositories.
 *
 * No writes. No engine calls. No accounting formulas.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyticsWindowSchema } from "./validators";
import { FinanceAnalyticsService } from "./analytics.server";

const win = (d: unknown) => analyticsWindowSchema.parse(d);

export const getFinanceExecutiveKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getExecutiveKpis(data),
  );

export const getGeneralLedgerAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getGeneralLedger(data),
  );

export const getRevenueAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getRevenue(data),
  );

export const getExpenseAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getExpenses(data),
  );

export const getProfitabilityAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getProfitability(data),
  );

export const getCashFlowAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getCashFlow(data),
  );

export const getAccountsReceivableAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getAR(data),
  );

export const getAccountsPayableAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getAP(data),
  );

export const getAssetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getAssets(data),
  );

export const getDepreciationAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getDepreciation(data),
  );

export const getBudgetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getBudgets(data),
  );

export const getForecastAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getForecasts(data),
  );

export const getRoyaltyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getRoyalty(data),
  );

export const getTaxAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getTax(data),
  );

export const getFranchiseAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getFranchise(data),
  );

export const getComplianceAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getCompliance(data),
  );

export const getAuditAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getAudit(data),
  );

export const getBankingAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getBanking(data),
  );

export const getTreasuryAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getTreasury(data),
  );

export const getFinanceReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(win)
  .handler(async ({ context, data }) =>
    new FinanceAnalyticsService(context.supabase).getFinanceReport(data),
  );
