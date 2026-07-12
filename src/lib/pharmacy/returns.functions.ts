/**
 * Pharmacy — Returns server functions.
 *
 * Patient returns and supplier returns share this pipeline. Restock
 * dispositions flow through InventoryEngine.receiveStock; destroy /
 * quarantine dispositions produce ledger reductions or batch flags.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ReturnRepository } from "./repositories.server";
import { InventoryEngine } from "./engines/inventory.engine.server";
import { BatchEngine } from "./engines/batch.engine.server";
import { emitPharmacyEvent, nextDocumentNumber } from "./helpers.server";
import { PHARMACY_EVENTS } from "./events";
import { returnCreateSchema } from "./validators";

export const createReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => returnCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ReturnRepository(context.supabase);
    const inventory = new InventoryEngine(context.supabase);
    const batches = new BatchEngine(context.supabase);
    const header = await repo.insertHeader({
      tenant_id: data.tenantId,
      branch_id: data.branchId ?? null,
      warehouse_id: data.warehouseId,
      return_type: data.returnType,
      patient_id: data.patientId ?? null,
      supplier_id: data.supplierId ?? null,
      source_type: data.sourceType ?? null,
      source_id: data.sourceId ?? null,
      reason_code: data.reasonCode ?? null,
      return_date: data.returnDate ?? new Date().toISOString().slice(0, 10),
      return_number: nextDocumentNumber("RET"),
      notes: data.notes ?? null,
      status: "posted",
      created_by: context.userId,
    });
    await repo.insertItems(
      data.items.map((it) => ({
        tenant_id: data.tenantId,
        return_id: header.id,
        drug_id: it.drugId,
        batch_id: it.batchId ?? null,
        quantity: it.quantity,
        unit_code: it.unitCode,
        disposition: it.disposition,
        notes: it.notes ?? null,
      })),
    );
    // Apply dispositions
    for (const it of data.items) {
      if (it.disposition === "restock") {
        await inventory.receiveStock({
          tenantId: data.tenantId,
          warehouseId: data.warehouseId,
          drugId: it.drugId,
          batchId: it.batchId ?? null,
          quantity: it.quantity,
          unitCode: it.unitCode,
          sourceType: "return_restock",
          sourceId: header.id,
          actorId: context.userId,
        });
      } else if (it.disposition === "quarantine" && it.batchId) {
        await batches.quarantine({
          tenantId: data.tenantId,
          batchId: it.batchId,
          reason: data.reasonCode ?? "return_quarantine",
          actorId: context.userId,
        });
      } else if (it.disposition === "destroy") {
        await inventory.destroyInventory({
          tenantId: data.tenantId,
          warehouseId: data.warehouseId,
          drugId: it.drugId,
          batchId: it.batchId ?? null,
          quantity: -Math.abs(it.quantity),
          unitCode: it.unitCode,
          sourceType: "return_destroy",
          sourceId: header.id,
          reasonCode: data.reasonCode ?? "return_destroy",
          actorId: context.userId,
        });
      }
    }
    await emitPharmacyEvent(context.supabase, data.tenantId, PHARMACY_EVENTS.ReturnRecorded, {
      return_id: header.id,
      return_type: data.returnType,
      item_count: data.items.length,
    });
    return { returnRow: header };
  });

export const listReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new ReturnRepository(context.supabase);
    return { rows: await repo.list({ tenantId: data.tenantId, limit: data.limit }) };
  });
