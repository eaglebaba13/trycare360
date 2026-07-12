/**
 * BatchEngine — batch lifecycle, FEFO selection, expiry validation,
 * quarantine, and recall enforcement.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BatchRepository, InventoryRepository, type BatchRow } from "../repositories.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent } from "../helpers.server";

type SB = SupabaseClient<Database>;

export interface FefoPick {
  batch: BatchRow;
  availableQuantity: number;
  takeQuantity: number;
}

export class BatchEngine {
  private readonly batches: BatchRepository;
  private readonly stock: InventoryRepository;

  constructor(private readonly sb: SB) {
    this.batches = new BatchRepository(sb);
    this.stock = new InventoryRepository(sb);
  }

  isDispensable(batch: BatchRow): { ok: boolean; reason?: string } {
    if (batch.is_recalled) return { ok: false, reason: "batch_recalled" };
    if (batch.is_quarantined) return { ok: false, reason: "batch_quarantined" };
    const today = new Date().toISOString().slice(0, 10);
    if (batch.expiry_date && batch.expiry_date <= today)
      return { ok: false, reason: "batch_expired" };
    return { ok: true };
  }

  async validateBatchForUse(batchId: string): Promise<BatchRow> {
    const batch = await this.batches.getById(batchId);
    if (!batch) throw new Error("Batch not found");
    const check = this.isDispensable(batch);
    if (!check.ok) throw new Error(`Batch not usable: ${check.reason}`);
    return batch;
  }

  async pickFefo(args: {
    tenantId: string;
    warehouseId: string;
    drugId: string;
    unitCode: string;
    quantityNeeded: number;
  }): Promise<FefoPick[]> {
    const batches = await this.batches.listFefoForDrug({
      tenantId: args.tenantId,
      drugId: args.drugId,
      includeQuarantined: false,
    });
    const picks: FefoPick[] = [];
    let remaining = args.quantityNeeded;
    const today = new Date().toISOString().slice(0, 10);
    for (const b of batches) {
      if (remaining <= 0) break;
      if (b.expiry_date <= today) continue;
      const stock = await this.stock.lookup({
        tenantId: args.tenantId,
        warehouseId: args.warehouseId,
        drugId: args.drugId,
        batchId: b.id,
        unitCode: args.unitCode,
      });
      const available =
        Number(stock?.quantity_on_hand ?? 0) - Number(stock?.quantity_reserved ?? 0);
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      picks.push({ batch: b, availableQuantity: available, takeQuantity: take });
      remaining -= take;
    }
    if (remaining > 0) {
      throw new Error(
        `Insufficient stock for drug ${args.drugId}: short by ${remaining} ${args.unitCode}`,
      );
    }
    return picks;
  }

  async quarantine(args: {
    tenantId: string;
    batchId: string;
    reason: string;
    actorId?: string | null;
  }): Promise<BatchRow> {
    const updated = await this.batches.update(args.batchId, {
      is_quarantined: true,
      quarantine_reason: args.reason,
      updated_by: args.actorId ?? null,
    });
    await emitPharmacyEvent(this.sb, args.tenantId, PHARMACY_EVENTS.BatchQuarantined, {
      batch_id: args.batchId,
      reason: args.reason,
    });
    return updated;
  }

  async releaseQuarantine(args: { tenantId: string; batchId: string; actorId?: string | null }) {
    return this.batches.update(args.batchId, {
      is_quarantined: false,
      quarantine_reason: null,
      updated_by: args.actorId ?? null,
    });
  }

  async listNearExpiry(tenantId: string, withinDays = 90) {
    return this.batches.listNearExpiry({ tenantId, withinDays });
  }
}
