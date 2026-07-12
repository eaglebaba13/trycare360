/**
 * Expense server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  expenseDecisionSchema,
  expenseSubmitSchema,
} from "./validators";
import { ExpenseEngine } from "./engines/expense.engine.server";
import { ExpenseRepository } from "./repositories.server";
import { z } from "zod";

const listSchema = z.object({
  tenantId: z.string().uuid(),
  status: z.string().optional(),
});

export const recordExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => expenseSubmitSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ExpenseEngine(context.supabase);
    return { expense: await engine.submit(data, context.userId) };
  });

export const approveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => expenseDecisionSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ExpenseEngine(context.supabase);
    return { expense: await engine.decide(data, context.userId) };
  });

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ExpenseRepository(context.supabase);
    return { rows: await repo.list(data.tenantId, data.status ?? null) };
  });
