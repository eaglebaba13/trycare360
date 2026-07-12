/**
 * InventoryEngine — every stock change MUST flow through here.
 *
 * Contract:
 *   1. Every movement writes an immutable ledger row.
 *   2. Stock-on-hand is a PROJECTION only — updated from the ledger,
 *      never independently.
 *   3. Reservations are tracked in pharmacy_stock_reservations and
 *      reflected in stock_on_hand.quantity_reserved.
 *   4. Ledger rows are NEVER updated. Reversals create a new row with
 *      `reverses_id` set (Stage 1 immutability trigger enforces this
 *      at the DB level too).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  InventoryLedgerRepository,
  InventoryRepository,
  ReservationRepository,
  type InventoryLedgerRow,
  type StockReservationRow,
} from "../repositories.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent } from "../helpers.server";

type SB = SupabaseClient<Database>;

export interface MovementInput {
  tenantId: string;
  warehouseId: string;
  drugId: string;
  batchId?: string | null;
  locationId?: string | null;
  binId?: string | null;
  quantity: number; // positive = in, negative = out
  unitCode: string;
  sourceType: string;
  sourceId?: string | null;
  reasonCode?: string | null;
  correlationId?: string | null;
  reversesId?: string | null;
  actorId?: string | null;
  meta?: Record<string, unknown>;
}

export class InventoryEngine {
  private readonly stock: InventoryRepository;
  private readonly ledger: InventoryLedgerRepository;
  private readonly reservations: ReservationRepository;

  constructor(private readonly sb: SB) {
    this.stock = new InventoryRepository(sb);
    this.ledger = new InventoryLedgerRepository(sb);
    this.reservations = new ReservationRepository(sb);
  }

  // --- ledger primitive ----------------------------------------------------
  async postMovement(m: MovementInput): Promise<InventoryLedgerRow> {
    const now = new Date().toISOString();
    const row: TablesInsert<"pharmacy_inventory_ledger"> = {
      tenant_id: m.tenantId,
      warehouse_id: m.warehouseId,
      drug_id: m.drugId,
      batch_id: m.batchId ?? null,
      location_id: m.locationId ?? null,
      bin_id: m.binId ?? null,
      unit_code: m.unitCode,
      quantity: m.quantity,
      source_type: m.sourceType,
      source_id: m.sourceId ?? null,
      reason_code: m.reasonCode ?? null,
      correlation_id: m.correlationId ?? null,
      reverses_id: m.reversesId ?? null,
      actor_id: m.actorId ?? null,
      occurred_at: now,
      meta: (m.meta ?? {}) as never,
    };
    const inserted = await this.ledger.insert(row);
    // Projection update (in-place, additive)
    await this.stock.upsertProjection({
      tenant_id: m.tenantId,
      warehouse_id: m.warehouseId,
      drug_id: m.drugId,
      batch_id: m.batchId ?? null,
      location_id: m.locationId ?? null,
      bin_id: m.binId ?? null,
      unit_code: m.unitCode,
      quantity_delta: m.quantity,
      last_movement_at: now,
    });
    return inserted;
  }

  async receiveStock(m: MovementInput): Promise<InventoryLedgerRow> {
    if (m.quantity <= 0) throw new Error("receiveStock requires positive quantity");
    const row = await this.postMovement({ ...m, sourceType: m.sourceType || "grn" });
    await emitPharmacyEvent(this.sb, m.tenantId, PHARMACY_EVENTS.StockReceived, {
      warehouse_id: m.warehouseId,
      drug_id: m.drugId,
      batch_id: m.batchId,
      quantity: m.quantity,
      source_type: row.source_type,
      source_id: row.source_id,
    });
    return row;
  }

  async adjustInventory(m: MovementInput): Promise<InventoryLedgerRow> {
    if (m.quantity === 0) throw new Error("adjustInventory quantity must be non-zero");
    const row = await this.postMovement({ ...m, sourceType: m.sourceType || "adjustment" });
    await emitPharmacyEvent(this.sb, m.tenantId, PHARMACY_EVENTS.StockAdjusted, {
      warehouse_id: m.warehouseId,
      drug_id: m.drugId,
      batch_id: m.batchId,
      quantity: m.quantity,
      reason_code: m.reasonCode,
    });
    return row;
  }

  async destroyInventory(m: MovementInput): Promise<InventoryLedgerRow> {
    if (m.quantity >= 0) throw new Error("destroyInventory requires negative quantity");
    return this.postMovement({ ...m, sourceType: "destroy" });
  }

  async reconcileInventory(args: {
    tenantId: string;
    warehouseId: string;
    drugId: string;
    batchId?: string | null;
    unitCode: string;
    countedQuantity: number;
    reasonCode?: string | null;
    actorId?: string | null;
  }): Promise<InventoryLedgerRow | null> {
    const current = await this.stock.lookup({
      tenantId: args.tenantId,
      warehouseId: args.warehouseId,
      drugId: args.drugId,
      batchId: args.batchId ?? null,
      unitCode: args.unitCode,
    });
    const onHand = Number(current?.quantity_on_hand ?? 0);
    const delta = args.countedQuantity - onHand;
    if (delta === 0) return null;
    return this.adjustInventory({
      tenantId: args.tenantId,
      warehouseId: args.warehouseId,
      drugId: args.drugId,
      batchId: args.batchId ?? null,
      quantity: delta,
      unitCode: args.unitCode,
      sourceType: "reconcile",
      reasonCode: args.reasonCode ?? "physical_count",
      actorId: args.actorId ?? null,
    });
  }

  // --- reservations --------------------------------------------------------
  async reserveInventory(args: {
    tenantId: string;
    warehouseId: string;
    drugId: string;
    batchId?: string | null;
    quantity: number;
    unitCode: string;
    reservedForType: string;
    reservedForId?: string | null;
    expiresAt?: string | null;
    actorId?: string | null;
    meta?: Record<string, unknown>;
  }): Promise<StockReservationRow> {
    if (args.quantity <= 0) throw new Error("reserveInventory quantity must be positive");
    const stock = await this.stock.lookup({
      tenantId: args.tenantId,
      warehouseId: args.warehouseId,
      drugId: args.drugId,
      batchId: args.batchId ?? null,
      unitCode: args.unitCode,
    });
    const available =
      Number(stock?.quantity_on_hand ?? 0) - Number(stock?.quantity_reserved ?? 0);
    if (available < args.quantity) {
      throw new Error(
        `Insufficient stock: available ${available} < requested ${args.quantity}`,
      );
    }
    const reservation = await this.reservations.insert({
      tenant_id: args.tenantId,
      warehouse_id: args.warehouseId,
      drug_id: args.drugId,
      batch_id: args.batchId ?? null,
      quantity: args.quantity,
      unit_code: args.unitCode,
      reserved_for_type: args.reservedForType,
      reserved_for_id: args.reservedForId ?? null,
      expires_at: args.expiresAt ?? null,
      status: "active",
      meta: (args.meta ?? {}) as never,
    });
    // Reflect on projection
    await this.stock.upsertProjection({
      tenant_id: args.tenantId,
      warehouse_id: args.warehouseId,
      drug_id: args.drugId,
      batch_id: args.batchId ?? null,
      location_id: null,
      bin_id: null,
      unit_code: args.unitCode,
      quantity_delta: 0,
      reserved_delta: args.quantity,
      last_movement_at: new Date().toISOString(),
    });
    return reservation;
  }

  async releaseReservation(reservationId: string): Promise<StockReservationRow | null> {
    const r = await this.reservations.getById(reservationId);
    if (!r) return null;
    if (r.status !== "active") return r;
    const updated = await this.reservations.setStatus(reservationId, "released");
    await this.stock.upsertProjection({
      tenant_id: r.tenant_id,
      warehouse_id: r.warehouse_id,
      drug_id: r.drug_id,
      batch_id: r.batch_id ?? null,
      location_id: null,
      bin_id: null,
      unit_code: r.unit_code,
      quantity_delta: 0,
      reserved_delta: -Number(r.quantity),
      last_movement_at: new Date().toISOString(),
    });
    return updated;
  }

  /**
   * Consume a reservation and post an outbound ledger movement in one shot.
   * Used by DispenseEngine.commit().
   */
  async commitDispense(args: {
    reservationId?: string | null;
    tenantId: string;
    warehouseId: string;
    drugId: string;
    batchId?: string | null;
    quantity: number;
    unitCode: string;
    sourceType: string;
    sourceId: string;
    actorId?: string | null;
    meta?: Record<string, unknown>;
  }): Promise<InventoryLedgerRow> {
    // Release reservation first (if any) so the outbound movement doesn't
    // double-count against available stock.
    if (args.reservationId) {
      const r = await this.reservations.getById(args.reservationId);
      if (r && r.status === "active") {
        await this.reservations.setStatus(args.reservationId, "consumed");
        await this.stock.upsertProjection({
          tenant_id: r.tenant_id,
          warehouse_id: r.warehouse_id,
          drug_id: r.drug_id,
          batch_id: r.batch_id ?? null,
          location_id: null,
          bin_id: null,
          unit_code: r.unit_code,
          quantity_delta: 0,
          reserved_delta: -Number(r.quantity),
          last_movement_at: new Date().toISOString(),
        });
      }
    }
    return this.postMovement({
      tenantId: args.tenantId,
      warehouseId: args.warehouseId,
      drugId: args.drugId,
      batchId: args.batchId ?? null,
      quantity: -Math.abs(args.quantity),
      unitCode: args.unitCode,
      sourceType: args.sourceType,
      sourceId: args.sourceId,
      actorId: args.actorId ?? null,
      meta: args.meta,
    });
  }
}
