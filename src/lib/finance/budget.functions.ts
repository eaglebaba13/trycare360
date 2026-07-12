/**
 * Budget server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { budgetCreateSchema, budgetUpdateSchema } from "./validators";
import { BudgetEngine } from "./engines/budget.engine.server";
import { BudgetRepository } from "./repositories.server";
import { z } from "zod";

const tenantIdOnly = z.object({ tenantId: z.string().uuid() });
const byId = z.object({ tenantId: z.string().uuid(), budgetId: z.string().uuid() });

export const createBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => budgetCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new BudgetEngine(context.supabase);
    return { budget: await engine.create(data, context.userId) };
  });

export const updateBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => budgetUpdateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new BudgetEngine(context.supabase);
    return { budget: await engine.update(data, context.userId) };
  });

export const listBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tenantIdOnly.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new BudgetRepository(context.supabase);
    return { rows: await repo.list(data.tenantId) };
  });

export const getBudget = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => byId.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new BudgetRepository(context.supabase);
    const budget = await repo.getById(data.budgetId);
    if (!budget || budget.tenant_id !== data.tenantId) throw new Error("Not found");
    return { budget, lines: await repo.listLines(budget.id) };
  });
