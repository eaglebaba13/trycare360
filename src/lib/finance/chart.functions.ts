/**
 * Chart of accounts & fiscal calendar server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  accountListSchema,
  accountUpsertSchema,
  costCenterUpsertSchema,
  fiscalYearListSchema,
  fiscalYearUpsertSchema,
  periodCloseSchema,
  periodOpenSchema,
  profitCenterUpsertSchema,
} from "./validators";
import { AccountingEngine } from "./engines/accounting.engine.server";
import {
  AccountingPeriodRepository,
  ChartOfAccountsRepository,
  CostCenterRepository,
  FiscalYearRepository,
  ProfitCenterRepository,
} from "./repositories.server";

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ChartOfAccountsRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const upsertAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AccountingEngine(context.supabase);
    return { account: await engine.upsertAccount(data, context.userId) };
  });

export const listFiscalYears = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => fiscalYearListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new FiscalYearRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const upsertFiscalYear = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => fiscalYearUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AccountingEngine(context.supabase);
    return { year: await engine.upsertFiscalYear(data, context.userId) };
  });

export const openPeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodOpenSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AccountingEngine(context.supabase);
    return { period: await engine.openPeriod(data, context.userId) };
  });

export const closePeriod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodCloseSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new AccountingEngine(context.supabase);
    return { period: await engine.closePeriod(data, context.userId) };
  });

export const listPeriodsByYear = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => periodCloseSchema.partial({ periodId: true }).extend({ fiscalYearId: periodOpenSchema.shape.fiscalYearId }).parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AccountingPeriodRepository(context.supabase);
    return { rows: await repo.listByYear(data.fiscalYearId) };
  });

export const upsertCostCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => costCenterUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new CostCenterRepository(context.supabase);
    const row = {
      tenant_id: data.tenantId,
      org_unit_id: data.orgUnitId ?? null,
      code: data.code,
      name: data.name,
      parent_id: data.parentId ?? null,
      branch_id: data.branchId ?? null,
      department_id: data.departmentId ?? null,
      is_active: data.isActive ?? true,
    };
    return {
      center: data.id ? await repo.update(data.id, row) : await repo.insert(row),
    };
  });

export const upsertProfitCenter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profitCenterUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ProfitCenterRepository(context.supabase);
    const row = {
      tenant_id: data.tenantId,
      org_unit_id: data.orgUnitId ?? null,
      code: data.code,
      name: data.name,
      branch_id: data.branchId ?? null,
      is_active: data.isActive ?? true,
    };
    return {
      center: data.id ? await repo.update(data.id, row) : await repo.insert(row),
    };
  });
