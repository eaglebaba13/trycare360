/**
 * Pharmacy — Inventory server functions.
 * Every movement runs through InventoryEngine; ledger integrity guaranteed.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  InventoryLedgerRepository,
  InventoryRepository,
} from "./repositories.server";
import { InventoryEngine } from "./engines/inventory.engine.server";
import {
  adjustStockSchema,
  destroyStockSchema,
  receiveStockSchema,
  reservationIdSchema,
  reserveStockSchema,
  stockLookupSchema,
} from "./validators";
import { z } from "zod";

export const receiveStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => receiveStockSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new InventoryEngine(context.supabase);
    return {
      ledger: await engine.receiveStock({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        drugId: data.drugId,
        batchId: data.batchId ?? null,
        locationId: data.locationId ?? null,
        binId: data.binId ?? null,
        quantity: data.quantity,
        unitCode: data.unitCode,
        sourceType: data.sourceType,
        sourceId: data.sourceId ?? null,
        reasonCode: data.reasonCode ?? null,
        actorId: context.userId,
        meta: data.meta ?? {},
      }),
    };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adjustStockSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new InventoryEngine(context.supabase);
    return {
      ledger: await engine.adjustInventory({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        drugId: data.drugId,
        batchId: data.batchId ?? null,
        locationId: data.locationId ?? null,
        binId: data.binId ?? null,
        quantity: data.quantity,
        unitCode: data.unitCode,
        sourceType: data.sourceType,
        sourceId: data.sourceId ?? null,
        reasonCode: data.reasonCode ?? null,
        actorId: context.userId,
        meta: data.meta ?? {},
      }),
    };
  });

export const destroyStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => destroyStockSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new InventoryEngine(context.supabase);
    return {
      ledger: await engine.destroyInventory({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        drugId: data.drugId,
        batchId: data.batchId ?? null,
        quantity: -Math.abs(data.quantity),
        unitCode: data.unitCode,
        sourceType: "destroy",
        reasonCode: data.reasonCode,
        actorId: context.userId,
        meta: data.meta ?? {},
      }),
    };
  });

export const reserveStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reserveStockSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new InventoryEngine(context.supabase);
    return {
      reservation: await engine.reserveInventory({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        drugId: data.drugId,
        batchId: data.batchId ?? null,
        quantity: data.quantity,
        unitCode: data.unitCode,
        reservedForType: data.reservedForType,
        reservedForId: data.reservedForId ?? null,
        expiresAt: data.expiresAt ?? null,
        actorId: context.userId,
        meta: data.meta ?? {},
      }),
    };
  });

export const releaseReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reservationIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new InventoryEngine(context.supabase);
    return { reservation: await engine.releaseReservation(data.reservationId) };
  });

export const listStockOnHand = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => stockLookupSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new InventoryRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId ?? null,
        drugId: data.drugId ?? null,
        limit: data.limit,
      }),
    };
  });

export const listInventoryLedger = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        warehouseId: z.string().uuid().nullable().optional(),
        drugId: z.string().uuid().nullable().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new InventoryLedgerRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId ?? null,
        drugId: data.drugId ?? null,
        limit: data.limit,
      }),
    };
  });
