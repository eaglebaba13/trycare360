/**
 * ExpenseEngine — submission → approval routing → posting.
 * Approval is delegated to the shared Approval Engine (Workflow event
 * `finance.expense.submitted` fires an approval request in a downstream
 * automation). This engine only records the decision and posts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ExpenseRepository } from "../repositories.server";
import {
  emitFinanceEvent,
  logFinanceTimeline,
  nextFinanceNumber,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import { AutomationEngine } from "./automation.engine.server";
import type {
  expenseDecisionSchema,
  expenseSubmitSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class ExpenseEngine {
  private readonly expenses: ExpenseRepository;
  constructor(private readonly sb: SB) {
    this.expenses = new ExpenseRepository(sb);
  }

  async submit(input: z.infer<typeof expenseSubmitSchema>, actorId: string) {
    const number = await nextFinanceNumber(this.sb, input.tenantId, "expense", "EXP");
    const total = Number(input.amount) + Number(input.taxAmount ?? 0);
    const row = await this.expenses.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      cost_center_id: input.costCenterId ?? null,
      expense_number: number,
      expense_date: input.expenseDate,
      category: input.category ?? null,
      vendor_id: input.vendorId ?? null,
      employee_id: input.employeeId ?? null,
      account_id: input.accountId ?? null,
      amount: input.amount,
      tax_amount: input.taxAmount,
      total_amount: total,
      currency: input.currency,
      status: "submitted",
      attachments: input.attachments as never,
      notes: input.notes ?? null,
      created_by: actorId,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.ExpenseSubmitted, {
      expenseId: row.id,
      totalAmount: total,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "expense",
      entityId: row.id,
      action: "submit",
      eventType: FINANCE_EVENTS.ExpenseSubmitted,
      actorId,
      after: row as never,
    });
    await logFinanceTimeline(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_expense",
      entityId: row.id,
      eventType: FINANCE_EVENTS.ExpenseSubmitted,
      title: `Expense ${number} submitted`,
    });
    return row;
  }

  async decide(input: z.infer<typeof expenseDecisionSchema>, actorId: string) {
    const expense = await this.expenses.getById(input.expenseId);
    if (!expense || expense.tenant_id !== input.tenantId) throw new Error("Expense not found");
    if (expense.status !== "submitted" && expense.status !== "pending")
      throw new Error(`Cannot ${input.decision} expense in status ${expense.status}`);

    const status = input.decision === "approve" ? "approved" : "rejected";
    const updated = await this.expenses.update(expense.id, { status });
    const event =
      input.decision === "approve"
        ? FINANCE_EVENTS.ExpenseApproved
        : FINANCE_EVENTS.ExpenseRejected;
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "expense",
      entityId: expense.id,
      action: input.decision,
      eventType: event,
      actorId,
      before: expense as never,
      after: updated as never,
      metadata: { reason: input.reason ?? null },
    });
    await emitFinanceEvent(this.sb, input.tenantId, event, {
      expenseId: expense.id,
      reason: input.reason,
    });
    if (input.decision === "approve") {
      await new AutomationEngine(this.sb).postExpense(
        {
          tenantId: input.tenantId,
          orgUnitId: expense.org_unit_id,
          branchId: expense.branch_id,
          entryDate: expense.expense_date,
          amount: Number(expense.total_amount),
          currency: expense.currency,
          expenseId: expense.id,
          category: expense.category,
        },
        actorId,
      );
      await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.ExpensePosted, {
        expenseId: expense.id,
      });
    }
    return updated;
  }
}
