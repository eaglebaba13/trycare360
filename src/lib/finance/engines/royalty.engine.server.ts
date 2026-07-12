/**
 * RoyaltyEngine — franchise royalty accrual and settlement.
 *
 * Uses the active royalty rule for the franchise at the accrual date.
 * Emits `finance.royalty.*` events; settlement produces a settlement
 * row that downstream automations convert into a Payment + Journal.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  RoyaltyLedgerRepository,
  RoyaltyRuleRepository,
  RoyaltySettlementRepository,
} from "../repositories.server";
import {
  emitFinanceEvent,
  nextFinanceNumber,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type {
  royaltyCalculateSchema,
  royaltyRuleUpsertSchema,
  royaltySettleSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class RoyaltyEngine {
  private readonly rules: RoyaltyRuleRepository;
  private readonly ledger: RoyaltyLedgerRepository;
  private readonly settlements: RoyaltySettlementRepository;
  constructor(private readonly sb: SB) {
    this.rules = new RoyaltyRuleRepository(sb);
    this.ledger = new RoyaltyLedgerRepository(sb);
    this.settlements = new RoyaltySettlementRepository(sb);
  }

  async upsertRule(input: z.infer<typeof royaltyRuleUpsertSchema>, actorId: string) {
    const row = {
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      franchise_org_unit_id: input.franchiseOrgUnitId ?? null,
      code: input.code,
      name: input.name,
      basis: input.basis,
      rate_pct: input.ratePct,
      fixed_amount: input.fixedAmount,
      minimum_amount: input.minimumAmount,
      frequency: input.frequency,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo ?? null,
    };
    const rule = input.id
      ? await this.rules.update(input.id, row)
      : await this.rules.insert(row);
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "royalty_rule",
      entityId: rule.id,
      action: input.id ? "update" : "create",
      eventType: FINANCE_EVENTS.RoyaltyAccrued,
      actorId,
      after: rule as never,
    });
    return rule;
  }

  async calculate(input: z.infer<typeof royaltyCalculateSchema>, actorId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const rules = await this.rules.activeForFranchise(
      input.tenantId,
      input.franchiseOrgUnitId,
      today,
    );
    const rule = rules[0];
    if (!rule) throw new Error("No active royalty rule for franchise");

    let computed = 0;
    if (rule.basis === "revenue" || rule.basis === "gross_margin") {
      computed = (Number(input.revenueBasis) * Number(rule.rate_pct)) / 100;
    } else {
      computed = Number(rule.fixed_amount);
    }
    computed = Math.max(computed, Number(rule.minimum_amount));
    const finalAmount = Math.round((computed + Number(input.adjustments)) * 100) / 100;

    const ledgerRow = await this.ledger.insert({
      tenant_id: input.tenantId,
      org_unit_id: rule.org_unit_id,
      franchise_org_unit_id: input.franchiseOrgUnitId,
      rule_id: rule.id,
      period_id: input.periodId,
      revenue_basis: input.revenueBasis,
      computed_amount: Math.round(computed * 100) / 100,
      adjustments: input.adjustments,
      final_amount: finalAmount,
      status: "accrued",
      breakdown: { basis: rule.basis, rate_pct: rule.rate_pct } as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.RoyaltyAccrued, {
      ledgerId: ledgerRow.id,
      franchiseOrgUnitId: input.franchiseOrgUnitId,
      amount: finalAmount,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "royalty_ledger",
      entityId: ledgerRow.id,
      action: "accrue",
      eventType: FINANCE_EVENTS.RoyaltyAccrued,
      actorId,
      after: ledgerRow as never,
    });
    return ledgerRow;
  }

  async settle(input: z.infer<typeof royaltySettleSchema>, actorId: string) {
    let ids = input.ledgerIds;
    if (ids.length === 0) {
      const open = await this.ledger.listOpenForFranchise(
        input.tenantId,
        input.franchiseOrgUnitId,
      );
      ids = open.map((r) => r.id);
    }
    // Refetch entries to sum
    const { data, error } = await this.sb
      .from("fin_royalty_ledger")
      .select("id,final_amount")
      .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ id: string; final_amount: number }>;
    const gross = rows.reduce((s, r) => s + Number(r.final_amount), 0);
    const net = Math.round((gross + Number(input.adjustments)) * 100) / 100;
    const number = await nextFinanceNumber(this.sb, input.tenantId, "royalty_settlement", "RSET");

    const settlement = await this.settlements.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      franchise_org_unit_id: input.franchiseOrgUnitId,
      settlement_number: number,
      settlement_date: input.settlementDate,
      period_from: input.periodFrom,
      period_to: input.periodTo,
      ledger_ids: ids as never,
      gross_amount: Math.round(gross * 100) / 100,
      adjustments: input.adjustments,
      net_amount: net,
      status: "draft",
      notes: input.notes ?? null,
      created_by: actorId,
    });
    if (ids.length > 0) {
      await this.sb
        .from("fin_royalty_ledger")
        .update({ status: "settled", settlement_id: settlement.id })
        .in("id", ids);
    }
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.RoyaltySettled, {
      settlementId: settlement.id,
      amount: net,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "royalty_settlement",
      entityId: settlement.id,
      action: "settle",
      eventType: FINANCE_EVENTS.RoyaltySettled,
      actorId,
      after: settlement as never,
    });
    return settlement;
  }
}
