/**
 * BudgetEngine — budget CRUD, variance computation vs actuals in the
 * ledger.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BudgetRepository } from "../repositories.server";
import { emitFinanceEvent, writeFinanceAudit } from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type { budgetCreateSchema, budgetUpdateSchema } from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class BudgetEngine {
  private readonly budgets: BudgetRepository;
  constructor(private readonly sb: SB) {
    this.budgets = new BudgetRepository(sb);
  }

  async create(input: z.infer<typeof budgetCreateSchema>, actorId: string) {
    const total = input.lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);
    const budget = await this.budgets.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      fiscal_year_id: input.fiscalYearId ?? null,
      branch_id: input.branchId ?? null,
      cost_center_id: input.costCenterId ?? null,
      code: input.code,
      name: input.name,
      budget_type: input.budgetType,
      currency: input.currency,
      total_amount: Math.round(total * 100) / 100,
      status: "draft",
    });
    if (input.lines.length > 0) {
      await this.budgets.insertLines(
        input.lines.map((l) => ({
          tenant_id: input.tenantId,
          org_unit_id: input.orgUnitId ?? null,
          budget_id: budget.id,
          account_id: l.accountId ?? null,
          period_id: l.periodId ?? null,
          amount: l.amount,
          notes: l.notes ?? null,
        })),
      );
    }
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.BudgetCreated, {
      budgetId: budget.id,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "budget",
      entityId: budget.id,
      action: "create",
      eventType: FINANCE_EVENTS.BudgetCreated,
      actorId,
      after: budget as never,
    });
    return budget;
  }

  async update(input: z.infer<typeof budgetUpdateSchema>, actorId: string) {
    const budget = await this.budgets.getById(input.budgetId);
    if (!budget || budget.tenant_id !== input.tenantId) throw new Error("Budget not found");
    let total = Number(budget.total_amount);
    if (input.lines) {
      await this.budgets.deleteLines(budget.id);
      total = input.lines.reduce((s, l) => s + Number(l.amount ?? 0), 0);
      await this.budgets.insertLines(
        input.lines.map((l) => ({
          tenant_id: input.tenantId,
          org_unit_id: budget.org_unit_id,
          budget_id: budget.id,
          account_id: l.accountId ?? null,
          period_id: l.periodId ?? null,
          amount: l.amount,
          notes: l.notes ?? null,
        })),
      );
    }
    const patch: Record<string, unknown> = { total_amount: Math.round(total * 100) / 100 };
    if (input.status) patch.status = input.status;
    if (input.status === "approved") {
      patch.approved_at = new Date().toISOString();
      patch.approved_by = actorId;
    }
    const updated = await this.budgets.update(budget.id, patch as never);
    if (input.status === "approved") {
      await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.BudgetApproved, {
        budgetId: budget.id,
      });
    }
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "budget",
      entityId: budget.id,
      action: "update",
      eventType: FINANCE_EVENTS.BudgetCreated,
      actorId,
      before: budget as never,
      after: updated as never,
    });
    return updated;
  }
}
