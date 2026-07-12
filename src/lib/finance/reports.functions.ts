/**
 * Financial report server functions — Trial Balance, P&L, Balance Sheet,
 * Cash Flow. Reuses the platform Reports module for delivery; these
 * endpoints only compute the projected payload.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportWindowSchema } from "./validators";
import { FinancialReportEngine } from "./engines/financial-report.engine.server";

export const trialBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportWindowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FinancialReportEngine(context.supabase);
    return await engine.trialBalance(data);
  });

export const profitLoss = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportWindowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FinancialReportEngine(context.supabase);
    return await engine.profitLoss(data);
  });

export const balanceSheet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportWindowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FinancialReportEngine(context.supabase);
    return await engine.balanceSheet(data);
  });

export const cashFlow = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reportWindowSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new FinancialReportEngine(context.supabase);
    return await engine.cashFlow(data);
  });
