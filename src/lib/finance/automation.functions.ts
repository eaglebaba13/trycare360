/**
 * Phase 2.9 Stage 4 — Automation server functions.
 *
 * All entry points are auth-gated and delegate to the AutomationEngine,
 * PeriodCloseEngine and BankReconEngine composed over Stage 2 primitives.
 * No new tables — every side-effect flows through JournalEngine,
 * AccountingEngine, AssetEngine, CashEngine and the shared platform
 * Workflow / Timeline / Search RPCs.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bankAutoMatchSchema,
  depreciationBatchSchema,
  monthEndSchema,
  sourcePostSchema,
  yearEndSchema,
} from "./validators";
import { AutomationEngine } from "./engines/automation.engine.server";
import { BankReconEngine } from "./engines/bank-recon.engine.server";
import { PeriodCloseEngine } from "./engines/period-close.engine.server";

export const postSourceRevenue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sourcePostSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AutomationEngine(context.supabase);
    return {
      result: await engine.postRevenueEvent(
        {
          tenantId: data.tenantId,
          orgUnitId: data.orgUnitId ?? null,
          branchId: data.branchId ?? null,
          entryDate: data.entryDate,
          amount: data.amount,
          currency: data.currency,
          sourceModule: data.sourceModule,
          referenceId: data.referenceId,
          referenceType: data.referenceType,
          description: data.description ?? null,
          partnerType: data.partnerType ?? null,
          partnerId: data.partnerId ?? null,
          metadata: data.metadata,
        },
        context.userId,
      ),
    };
  });

export const runMonthEnd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => monthEndSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PeriodCloseEngine(context.supabase);
    return await engine.runMonthEnd(data, context.userId);
  });

export const runYearEnd = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => yearEndSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PeriodCloseEngine(context.supabase);
    return await engine.runYearEnd(data, context.userId);
  });

export const runDepreciationBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => depreciationBatchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PeriodCloseEngine(context.supabase);
    return await engine.runDepreciationBatch({
      tenantId: data.tenantId,
      orgUnitId: data.orgUnitId ?? null,
      scheduleDate: data.scheduleDate,
      periodId: data.periodId ?? null,
      actorId: context.userId,
    });
  });

export const autoMatchBankStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bankAutoMatchSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new BankReconEngine(context.supabase);
    return await engine.autoMatchAndPersist(
      {
        tenantId: data.tenantId,
        orgUnitId: data.orgUnitId ?? null,
        bankAccountId: data.bankAccountId,
        statementDate: data.statementDate,
        openingBalance: data.openingBalance,
        closingBalance: data.closingBalance,
        statementLines: data.statementLines,
      },
      context.userId,
    );
  });
