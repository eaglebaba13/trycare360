/**
 * AccountingEngine — chart of accounts, fiscal calendar and cross-module
 * auto-posting entry points. Every posting flows through JournalEngine.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AccountingPeriodRepository,
  ChartOfAccountsRepository,
  FiscalYearRepository,
} from "../repositories.server";
import {
  emitFinanceEvent,
  indexFinanceSearch,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type {
  accountUpsertSchema,
  fiscalYearUpsertSchema,
  periodCloseSchema,
  periodOpenSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class AccountingEngine {
  private readonly accounts: ChartOfAccountsRepository;
  private readonly years: FiscalYearRepository;
  private readonly periods: AccountingPeriodRepository;
  constructor(private readonly sb: SB) {
    this.accounts = new ChartOfAccountsRepository(sb);
    this.years = new FiscalYearRepository(sb);
    this.periods = new AccountingPeriodRepository(sb);
  }

  async upsertAccount(input: z.infer<typeof accountUpsertSchema>, actorId: string) {
    const row = {
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      code: input.code,
      name: input.name,
      account_type: input.accountType,
      account_subtype: input.accountSubtype ?? null,
      parent_id: input.parentId ?? null,
      currency: input.currency,
      is_group: input.isGroup ?? false,
      is_active: input.isActive ?? true,
      gst_applicable: input.gstApplicable ?? false,
      tds_applicable: input.tdsApplicable ?? false,
      metadata: (input.metadata ?? {}) as never,
    };
    const account = input.id
      ? await this.accounts.update(input.id, row)
      : await this.accounts.insert(row);
    const event = input.id ? FINANCE_EVENTS.AccountUpdated : FINANCE_EVENTS.AccountCreated;
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "chart_of_accounts",
      entityId: account.id,
      action: input.id ? "update" : "create",
      eventType: event,
      actorId,
      after: account as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, event, { accountId: account.id });
    await indexFinanceSearch(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_account",
      entityId: account.id,
      title: `${account.code} · ${account.name}`,
      subtitle: account.account_type,
      keywords: `${account.code} ${account.name} ${account.account_type}`,
    });
    return account;
  }

  async upsertFiscalYear(input: z.infer<typeof fiscalYearUpsertSchema>, actorId: string) {
    const row = {
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      code: input.code,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status ?? "open",
    };
    const year = input.id
      ? await this.years.update(input.id, row)
      : await this.years.insert(row);
    await emitFinanceEvent(
      this.sb,
      input.tenantId,
      year.status === "closed" ? FINANCE_EVENTS.FiscalYearClosed : FINANCE_EVENTS.FiscalYearOpened,
      { fiscalYearId: year.id },
    );
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "fiscal_year",
      entityId: year.id,
      action: input.id ? "update" : "create",
      eventType: FINANCE_EVENTS.FiscalYearOpened,
      actorId,
      after: year as never,
    });
    return year;
  }

  async openPeriod(input: z.infer<typeof periodOpenSchema>, actorId: string) {
    const year = await this.years.getById(input.fiscalYearId);
    if (!year || year.tenant_id !== input.tenantId) throw new Error("Fiscal year not found");
    if (year.status !== "open") throw new Error("Fiscal year is not open");
    const period = await this.periods.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      fiscal_year_id: input.fiscalYearId,
      code: input.code,
      period_number: input.periodNumber,
      start_date: input.startDate,
      end_date: input.endDate,
      status: "open",
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "accounting_period",
      entityId: period.id,
      action: "open",
      eventType: FINANCE_EVENTS.PeriodOpened,
      actorId,
      after: period as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.PeriodOpened, {
      periodId: period.id,
    });
    return period;
  }

  async closePeriod(input: z.infer<typeof periodCloseSchema>, actorId: string) {
    const period = await this.periods.getById(input.periodId);
    if (!period || period.tenant_id !== input.tenantId) throw new Error("Period not found");
    if (period.status === "closed") return period;

    // Guard: no unposted journals inside the period.
    const { count, error } = await this.sb
      .from("fin_journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", input.tenantId)
      .eq("period_id", period.id)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) throw new Error(`Cannot close period — ${count} draft journals remain`);

    const updated = await this.periods.update(period.id, {
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: actorId,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "accounting_period",
      entityId: period.id,
      action: "close",
      eventType: FINANCE_EVENTS.PeriodClosed,
      actorId,
      before: period as never,
      after: updated as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.PeriodClosed, {
      periodId: period.id,
    });
    return updated;
  }
}
