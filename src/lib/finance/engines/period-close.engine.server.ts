/**
 * Phase 2.9 Stage 4 — PeriodCloseEngine.
 *
 * Month-end and year-end automation. Composes AccountingEngine,
 * AssetEngine, RoyaltyEngine, TaxEngine and FinancialReportEngine to:
 *  - snapshot Trial Balance / P&L / Balance Sheet / Cash Flow
 *  - post batch depreciation for active fixed assets
 *  - close the period (JournalEngine already prevents drafts)
 *  - emit period-end events for downstream automations
 *  - carry retained earnings on year-end
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/integrations/supabase/types";
import { AccountingEngine } from "./accounting.engine.server";
import { AssetEngine } from "./asset.engine.server";
import { AutomationEngine } from "./automation.engine.server";
import { FinancialReportEngine } from "./financial-report.engine.server";
import {
  emitFinanceEvent,
  logFinanceTimeline,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";

type SB = SupabaseClient<Database>;

export interface MonthEndInput {
  tenantId: string;
  periodId: string;
  closePeriod?: boolean;
  runDepreciation?: boolean;
}

export interface YearEndInput {
  tenantId: string;
  fiscalYearId: string;
  closeYear?: boolean;
}

export interface PeriodSnapshot {
  periodId: string;
  trialBalance: Record<string, unknown>;
  profitLoss: Record<string, unknown>;
  balanceSheet: Record<string, unknown>;
  cashFlow: Record<string, unknown>;
}

export class PeriodCloseEngine {
  private readonly accounting: AccountingEngine;
  private readonly assets: AssetEngine;
  private readonly automation: AutomationEngine;
  private readonly reports: FinancialReportEngine;

  constructor(private readonly sb: SB) {
    this.accounting = new AccountingEngine(sb);
    this.assets = new AssetEngine(sb);
    this.automation = new AutomationEngine(sb);
    this.reports = new FinancialReportEngine(sb);
  }

  private async loadPeriod(periodId: string) {
    const { data, error } = await this.sb
      .from("fin_accounting_periods")
      .select("*")
      .eq("id", periodId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Period not found");
    return data as Tables<"fin_accounting_periods">;
  }

  /**
   * Post monthly depreciation for every active asset scoped to the tenant.
   * Idempotency: AutomationEngine.autoPost skips already-posted schedule ids.
   */
  async runDepreciationBatch(args: {
    tenantId: string;
    orgUnitId?: string | null;
    scheduleDate: string;
    periodId?: string | null;
    actorId: string;
  }) {
    const { data, error } = await this.sb
      .from("fin_fixed_assets")
      .select("id,acquisition_cost,salvage_value,useful_life_months")
      .eq("tenant_id", args.tenantId)
      .eq("status", "active")
      .limit(1000);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{
      id: string;
      acquisition_cost: number;
      salvage_value: number;
      useful_life_months: number;
    }>;

    let posted = 0;
    let skipped = 0;
    for (const asset of rows) {
      try {
        const schedule = await this.assets.postDepreciation(
          {
            tenantId: args.tenantId,
            assetId: asset.id,
            scheduleDate: args.scheduleDate,
            periodId: args.periodId ?? null,
          },
          args.actorId,
        );
        const monthly = Math.max(
          0,
          (Number(asset.acquisition_cost) - Number(asset.salvage_value)) /
            Math.max(asset.useful_life_months, 1),
        );
        const result = await this.automation.postDepreciation(
          {
            tenantId: args.tenantId,
            entryDate: args.scheduleDate,
            amount: Math.round(monthly * 100) / 100,
            scheduleId: schedule.id,
            assetId: asset.id,
          },
          args.actorId,
        );
        if (result.posted) posted++;
        else skipped++;
      } catch (err) {
        console.warn("[finance] depreciation batch — asset failed", asset.id, err);
        skipped++;
      }
    }
    return { totalAssets: rows.length, posted, skipped };
  }

  /**
   * Compute month-end snapshots (trial balance, P&L, BS, cash flow) and
   * emit them as workflow events so the platform Reports module can
   * persist deliverables.
   */
  async snapshotFinancials(args: {
    tenantId: string;
    from: string;
    to: string;
  }): Promise<PeriodSnapshot> {
    const window = {
      tenantId: args.tenantId,
      from: args.from,
      to: args.to,
      branchId: null,
      periodId: null,
    };
    const [trialBalance, profitLoss, balanceSheet, cashFlow] = await Promise.all([
      this.reports.trialBalance(window),
      this.reports.profitLoss(window),
      this.reports.balanceSheet(window),
      this.reports.cashFlow(window),
    ]);
    await emitFinanceEvent(this.sb, args.tenantId, FINANCE_EVENTS.BranchPnlComputed, {
      window: { from: args.from, to: args.to },
      profitLoss,
      balanceSheet,
      cashFlow,
    });
    return { periodId: "", trialBalance, profitLoss, balanceSheet, cashFlow };
  }

  async runMonthEnd(input: MonthEndInput, actorId: string) {
    const period = await this.loadPeriod(input.periodId);
    if (period.tenant_id !== input.tenantId) throw new Error("Period not in tenant");

    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.MonthEndStarted, {
      periodId: period.id,
      period: period.code,
    });

    const depreciation =
      input.runDepreciation !== false
        ? await this.runDepreciationBatch({
            tenantId: input.tenantId,
            orgUnitId: period.org_unit_id,
            scheduleDate: period.end_date,
            periodId: period.id,
            actorId,
          })
        : { totalAssets: 0, posted: 0, skipped: 0 };

    const snapshot = await this.snapshotFinancials({
      tenantId: input.tenantId,
      from: period.start_date,
      to: period.end_date,
    });
    snapshot.periodId = period.id;

    let closed: Tables<"fin_accounting_periods"> | null = null;
    if (input.closePeriod) {
      closed = await this.accounting.closePeriod(
        { tenantId: input.tenantId, periodId: period.id },
        actorId,
      );
    }

    await logFinanceTimeline(this.sb, {
      tenantId: input.tenantId,
      entityType: "accounting_period",
      entityId: period.id,
      eventType: FINANCE_EVENTS.MonthEndCompleted,
      title: `Month-end · ${period.code}`,
      meta: { depreciation },
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.MonthEndCompleted, {
      periodId: period.id,
      depreciation,
      snapshot: {
        income: (snapshot.profitLoss as { income?: number } | null)?.income ?? null,
        expense: (snapshot.profitLoss as { expense?: number } | null)?.expense ?? null,
      },
      closed: Boolean(closed),
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "accounting_period",
      entityId: period.id,
      action: "month_end",
      eventType: FINANCE_EVENTS.MonthEndCompleted,
      actorId,
      metadata: { depreciation, closed: Boolean(closed) },
    });
    return { period: closed ?? period, depreciation, snapshot };
  }

  async runYearEnd(input: YearEndInput, actorId: string) {
    const { data: year, error } = await this.sb
      .from("fin_fiscal_years")
      .select("*")
      .eq("id", input.fiscalYearId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!year || year.tenant_id !== input.tenantId) throw new Error("Fiscal year not found");

    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.YearEndStarted, {
      fiscalYearId: year.id,
    });

    const snapshot = await this.snapshotFinancials({
      tenantId: input.tenantId,
      from: year.start_date,
      to: year.end_date,
    });

    const netProfit = (snapshot.profitLoss as { netProfit?: number } | null)?.netProfit ?? 0;
    if (Math.abs(netProfit) > 0.005) {
      // Emit retained-earnings carry-forward event — actual JE post is
      // performed via AutomationEngine.autoPost with a manual rule
      // (income summary → retained earnings).
      const debit = netProfit >= 0 ? ["4000"] : ["3900"];
      const credit = netProfit >= 0 ? ["3900"] : ["4000"];
      await this.automation.autoPost(
        {
          tenantId: input.tenantId,
          orgUnitId: year.org_unit_id,
          entryDate: year.end_date,
          amount: Math.abs(netProfit),
          sourceModule: "finance_year_end",
          referenceType: "retained_earnings_carry",
          referenceId: year.id,
          description: `Year-end carry ${year.code}`,
          rule: { debit, credit },
        },
        actorId,
      );
    }

    let closed = year;
    if (input.closeYear) {
      const updated = await this.sb
        .from("fin_fiscal_years")
        .update({ status: "closed" })
        .eq("id", year.id)
        .select("*")
        .single();
      if (updated.error) throw new Error(updated.error.message);
      closed = updated.data as Tables<"fin_fiscal_years">;
    }

    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.YearEndCompleted, {
      fiscalYearId: year.id,
      netProfit,
      closed: Boolean(input.closeYear),
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "fiscal_year",
      entityId: year.id,
      action: "year_end",
      eventType: FINANCE_EVENTS.YearEndCompleted,
      actorId,
      before: year as never,
      after: closed as never,
      metadata: { netProfit, closed: Boolean(input.closeYear) },
    });
    return { year: closed, snapshot, netProfit };
  }
}
