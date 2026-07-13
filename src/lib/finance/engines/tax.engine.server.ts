/**
 * TaxEngine — GST/TDS/TCS accrual and payment posting.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { TaxRepository } from "../repositories.server";
import { emitFinanceEvent, writeFinanceAudit } from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import { AutomationEngine } from "./automation.engine.server";
import type { taxPostSchema } from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class TaxEngine {
  private readonly tax: TaxRepository;
  constructor(private readonly sb: SB) {
    this.tax = new TaxRepository(sb);
  }

  async post(input: z.infer<typeof taxPostSchema>, actorId: string) {
    const row = await this.tax.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      tax_type: input.taxType,
      tax_code: input.taxCode ?? null,
      gstin: input.gstin ?? null,
      period_id: input.periodId ?? null,
      entry_date: input.entryDate,
      taxable_amount: input.taxableAmount,
      rate_pct: input.ratePct,
      cgst: input.cgst,
      sgst: input.sgst,
      igst: input.igst,
      cess: input.cess,
      tds_amount: input.tdsAmount,
      tcs_amount: input.tcsAmount,
      status: "accrued",
      source_module: input.sourceModule ?? null,
      source_reference_id: input.sourceReferenceId ?? null,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.TaxAccrued, {
      ledgerId: row.id,
      taxType: input.taxType,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "tax_ledger",
      entityId: row.id,
      action: "accrue",
      eventType: FINANCE_EVENTS.TaxAccrued,
      actorId,
      after: row as never,
    });
    const amount =
      Number(input.cgst) + Number(input.sgst) + Number(input.igst) + Number(input.cess) +
      Number(input.tdsAmount) + Number(input.tcsAmount);
    if (amount > 0) {
      await new AutomationEngine(this.sb).postTaxAccrual(
        {
          tenantId: input.tenantId,
          orgUnitId: input.orgUnitId ?? null,
          entryDate: input.entryDate,
          amount,
          ledgerId: row.id,
          taxType: input.taxType,
        },
        actorId,
      );
    }
    return row;
  }
}
