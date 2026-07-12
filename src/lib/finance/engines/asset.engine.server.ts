/**
 * AssetEngine — registration, depreciation posting and disposal of
 * fixed assets. Depreciation posting emits an event that the Journal
 * automation converts into a posted JE (`finance.asset.depreciated`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  DepreciationRepository,
  FixedAssetRepository,
} from "../repositories.server";
import {
  emitFinanceEvent,
  indexFinanceSearch,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type {
  assetDepreciationSchema,
  assetDisposeSchema,
  assetRegisterSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class AssetEngine {
  private readonly assets: FixedAssetRepository;
  private readonly dep: DepreciationRepository;
  constructor(private readonly sb: SB) {
    this.assets = new FixedAssetRepository(sb);
    this.dep = new DepreciationRepository(sb);
  }

  async register(input: z.infer<typeof assetRegisterSchema>, actorId: string) {
    const asset = await this.assets.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      asset_code: input.assetCode,
      name: input.name,
      category: input.category ?? null,
      asset_account_id: input.assetAccountId ?? null,
      depreciation_account_id: input.depreciationAccountId ?? null,
      accumulated_dep_account_id: input.accumulatedDepAccountId ?? null,
      acquisition_date: input.acquisitionDate,
      acquisition_cost: input.acquisitionCost,
      salvage_value: input.salvageValue,
      useful_life_months: input.usefulLifeMonths,
      depreciation_method: input.depreciationMethod,
      status: "active",
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "fixed_asset",
      entityId: asset.id,
      action: "acquire",
      eventType: FINANCE_EVENTS.AssetAcquired,
      actorId,
      after: asset as never,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.AssetAcquired, {
      assetId: asset.id,
    });
    await indexFinanceSearch(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_asset",
      entityId: asset.id,
      title: `${asset.asset_code} · ${asset.name}`,
      subtitle: asset.category ?? undefined,
      keywords: `${asset.asset_code} ${asset.name}`,
    });
    return asset;
  }

  async postDepreciation(input: z.infer<typeof assetDepreciationSchema>, actorId: string) {
    const asset = await this.assets.getById(input.assetId);
    if (!asset || asset.tenant_id !== input.tenantId) throw new Error("Asset not found");
    if (asset.status !== "active") throw new Error("Only active assets can depreciate");

    const cost = Number(asset.acquisition_cost);
    const salvage = Number(asset.salvage_value);
    const months = asset.useful_life_months;
    const monthly = Math.max(0, (cost - salvage) / Math.max(months, 1));
    const latest = await this.dep.latestForAsset(asset.id);
    const accumulated = (latest ? Number(latest.accumulated_depreciation) : 0) + monthly;
    const bookValue = Math.max(salvage, cost - accumulated);

    const schedule = await this.dep.insert({
      tenant_id: input.tenantId,
      org_unit_id: asset.org_unit_id,
      asset_id: asset.id,
      period_id: input.periodId ?? null,
      schedule_date: input.scheduleDate,
      depreciation_amount: Math.round(monthly * 100) / 100,
      accumulated_depreciation: Math.round(accumulated * 100) / 100,
      book_value: Math.round(bookValue * 100) / 100,
      status: "pending",
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.AssetDepreciated, {
      assetId: asset.id,
      scheduleId: schedule.id,
      amount: monthly,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "fixed_asset",
      entityId: asset.id,
      action: "depreciate",
      eventType: FINANCE_EVENTS.AssetDepreciated,
      actorId,
      metadata: { scheduleId: schedule.id, amount: monthly },
    });
    return schedule;
  }

  async dispose(input: z.infer<typeof assetDisposeSchema>, actorId: string) {
    const asset = await this.assets.getById(input.assetId);
    if (!asset || asset.tenant_id !== input.tenantId) throw new Error("Asset not found");
    const updated = await this.assets.update(asset.id, {
      status: "disposed",
      disposed_at: input.disposedAt,
      disposal_value: input.disposalValue,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.AssetDisposed, {
      assetId: asset.id,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "fixed_asset",
      entityId: asset.id,
      action: "dispose",
      eventType: FINANCE_EVENTS.AssetDisposed,
      actorId,
      before: asset as never,
      after: updated as never,
    });
    return updated;
  }
}
