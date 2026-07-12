/**
 * JournalEngine — draft/approve/post/reverse/void of journal entries.
 * Enforces double-entry, period validation and posting lock. Delegates
 * per-line writes to LedgerEngine.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  AccountingPeriodRepository,
  JournalLineRepository,
  JournalRepository,
  type JournalEntryRow,
} from "../repositories.server";
import {
  emitFinanceEvent,
  indexFinanceSearch,
  logFinanceTimeline,
  nextFinanceNumber,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type {
  journalCreateSchema,
  journalIdSchema,
  journalReverseSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export class JournalEngine {
  private readonly journals: JournalRepository;
  private readonly lines: JournalLineRepository;
  private readonly periods: AccountingPeriodRepository;

  constructor(private readonly sb: SB) {
    this.journals = new JournalRepository(sb);
    this.lines = new JournalLineRepository(sb);
    this.periods = new AccountingPeriodRepository(sb);
  }

  /** Ensure the entry date falls inside an OPEN accounting period. */
  private async resolvePeriod(tenantId: string, periodId: string | null | undefined, entryDate: string) {
    let period = null;
    if (periodId) period = await this.periods.getById(periodId);
    if (!period) period = await this.periods.findByDate(tenantId, entryDate);
    if (period && period.status !== "open") {
      throw new Error(`Accounting period ${period.code} is ${period.status}`);
    }
    return period;
  }

  async create(
    input: z.infer<typeof journalCreateSchema>,
    actorId: string,
    opts?: { status?: "draft" | "posted"; skipEvents?: boolean },
  ): Promise<JournalEntryRow> {
    const totalDebit = round2(input.lines.reduce((s, l) => s + Number(l.debit ?? 0), 0));
    const totalCredit = round2(input.lines.reduce((s, l) => s + Number(l.credit ?? 0), 0));
    if (totalDebit !== totalCredit) {
      await emitFinanceEvent(
        this.sb,
        input.tenantId,
        FINANCE_EVENTS.JournalUnbalanced,
        { totalDebit, totalCredit, sourceModule: input.sourceModule },
      );
      throw new Error(`Journal unbalanced (dr=${totalDebit}, cr=${totalCredit})`);
    }
    const period = await this.resolvePeriod(input.tenantId, input.periodId ?? null, input.entryDate);
    const number = await nextFinanceNumber(this.sb, input.tenantId, "journal", "JE");
    const status = opts?.status ?? "draft";

    const entryRow: TablesInsert<"fin_journal_entries"> = {
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      period_id: period?.id ?? null,
      entry_number: number,
      entry_date: input.entryDate,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      source_module: input.sourceModule,
      description: input.description ?? null,
      currency: input.currency,
      fx_rate: input.fxRate,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status,
      posted_at: status === "posted" ? new Date().toISOString() : null,
      posted_by: status === "posted" ? actorId : null,
      metadata: (input.metadata ?? {}) as never,
      created_by: actorId,
    };
    const entry = await this.journals.insert(entryRow);

    const lineRows: TablesInsert<"fin_journal_lines">[] = input.lines.map((l) => ({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      journal_entry_id: entry.id,
      line_number: l.lineNumber,
      account_id: l.accountId,
      cost_center_id: l.costCenterId ?? null,
      profit_center_id: l.profitCenterId ?? null,
      branch_id: l.branchId ?? input.branchId ?? null,
      debit: round2(Number(l.debit ?? 0)),
      credit: round2(Number(l.credit ?? 0)),
      description: l.description ?? null,
      partner_type: l.partnerType ?? null,
      partner_id: l.partnerId ?? null,
      tax_code: l.taxCode ?? null,
      metadata: (l.metadata ?? {}) as never,
    }));
    await this.lines.insertMany(lineRows);

    if (!opts?.skipEvents) {
      await writeFinanceAudit(this.sb, {
        tenantId: input.tenantId,
        orgUnitId: input.orgUnitId ?? null,
        entityType: "journal_entry",
        entityId: entry.id,
        action: status === "posted" ? "post" : "draft",
        eventType: status === "posted" ? FINANCE_EVENTS.JournalPosted : FINANCE_EVENTS.JournalDrafted,
        actorId,
        after: entry as never,
      });
      await emitFinanceEvent(
        this.sb,
        input.tenantId,
        status === "posted" ? FINANCE_EVENTS.JournalPosted : FINANCE_EVENTS.JournalDrafted,
        { journalId: entry.id, entryNumber: number, totalDebit },
        { entityType: "journal_entry", entityId: entry.id },
      );
      await indexFinanceSearch(this.sb, {
        tenantId: input.tenantId,
        entityType: "finance_journal",
        entityId: entry.id,
        title: `${number} · ${input.sourceModule}`,
        subtitle: input.description ?? undefined,
        keywords: `journal ${number} ${input.sourceModule}`,
      });
      await logFinanceTimeline(this.sb, {
        tenantId: input.tenantId,
        entityType: "finance_journal",
        entityId: entry.id,
        eventType: status === "posted" ? FINANCE_EVENTS.JournalPosted : FINANCE_EVENTS.JournalDrafted,
        title: `Journal ${number} ${status}`,
      });
    }
    return entry;
  }

  async post(input: z.infer<typeof journalIdSchema>, actorId: string) {
    const entry = await this.journals.getById(input.journalId);
    if (!entry || entry.tenant_id !== input.tenantId) throw new Error("Journal not found");
    if (entry.status === "posted") return entry;
    if (entry.status === "reversed" || entry.status === "void")
      throw new Error(`Cannot post ${entry.status} journal`);
    await this.resolvePeriod(input.tenantId, entry.period_id, entry.entry_date);
    const updated = await this.journals.update(entry.id, {
      status: "posted",
      posted_at: new Date().toISOString(),
      posted_by: actorId,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "journal_entry",
      entityId: entry.id,
      action: "post",
      eventType: FINANCE_EVENTS.JournalPosted,
      actorId,
      before: entry as never,
      after: updated as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.JournalPosted, {
      journalId: entry.id,
    });
    return updated;
  }

  async reverse(input: z.infer<typeof journalReverseSchema>, actorId: string) {
    const original = await this.journals.getById(input.journalId);
    if (!original || original.tenant_id !== input.tenantId) throw new Error("Journal not found");
    if (original.status !== "posted") throw new Error("Only posted journals can be reversed");

    const originalLines = await this.lines.listByEntry(original.id);
    const number = await nextFinanceNumber(this.sb, input.tenantId, "journal", "JE-REV");
    const reversal = await this.journals.insert({
      tenant_id: input.tenantId,
      org_unit_id: original.org_unit_id,
      branch_id: original.branch_id,
      period_id: original.period_id,
      entry_number: number,
      entry_date: input.entryDate,
      reference_type: "reversal",
      reference_id: original.id,
      source_module: original.source_module,
      description: `Reversal of ${original.entry_number}: ${input.reason}`,
      currency: original.currency,
      fx_rate: original.fx_rate,
      total_debit: original.total_credit,
      total_credit: original.total_debit,
      status: "posted",
      posted_at: new Date().toISOString(),
      posted_by: actorId,
      reversed_entry_id: original.id,
      metadata: { reversal_reason: input.reason } as never,
      created_by: actorId,
    });
    await this.lines.insertMany(
      originalLines.map((l) => ({
        tenant_id: l.tenant_id,
        org_unit_id: l.org_unit_id,
        journal_entry_id: reversal.id,
        line_number: l.line_number,
        account_id: l.account_id,
        cost_center_id: l.cost_center_id,
        profit_center_id: l.profit_center_id,
        branch_id: l.branch_id,
        debit: l.credit,
        credit: l.debit,
        description: `Reversal: ${l.description ?? ""}`,
        partner_type: l.partner_type,
        partner_id: l.partner_id,
        tax_code: l.tax_code,
      })),
    );
    await this.journals.update(original.id, { status: "reversed" });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "journal_entry",
      entityId: original.id,
      action: "reverse",
      eventType: FINANCE_EVENTS.JournalReversed,
      actorId,
      metadata: { reversalId: reversal.id, reason: input.reason },
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.JournalReversed, {
      originalId: original.id,
      reversalId: reversal.id,
    });
    return reversal;
  }

  async voidEntry(input: z.infer<typeof journalIdSchema>, actorId: string) {
    const entry = await this.journals.getById(input.journalId);
    if (!entry || entry.tenant_id !== input.tenantId) throw new Error("Journal not found");
    if (entry.status !== "draft") throw new Error("Only draft journals can be voided");
    const updated = await this.journals.update(entry.id, { status: "void" });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "journal_entry",
      entityId: entry.id,
      action: "void",
      eventType: FINANCE_EVENTS.JournalVoided,
      actorId,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.JournalVoided, {
      journalId: entry.id,
    });
    return updated;
  }
}
