/**
 * WarehouseEngine — warehouse/location/bin CRUD, warehouse hierarchy,
 * and warehouse→warehouse / branch→branch transfers.
 *
 * Every transfer step is posted through the InventoryEngine so ledger
 * integrity is preserved (no direct stock table writes).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  TransferRepository,
  WarehouseRepository,
  type TransferRow,
} from "../repositories.server";
import { InventoryEngine } from "./inventory.engine.server";
import { BatchEngine } from "./batch.engine.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent, nextDocumentNumber } from "../helpers.server";

type SB = SupabaseClient<Database>;

export interface TransferItemInput {
  drugId: string;
  batchId?: string | null;
  quantity: number;
  unitCode: string;
}

export class WarehouseEngine {
  private readonly warehouses: WarehouseRepository;
  private readonly transfers: TransferRepository;
  private readonly inventory: InventoryEngine;
  private readonly batches: BatchEngine;

  constructor(private readonly sb: SB) {
    this.warehouses = new WarehouseRepository(sb);
    this.transfers = new TransferRepository(sb);
    this.inventory = new InventoryEngine(sb);
    this.batches = new BatchEngine(sb);
  }

  async upsertWarehouse(row: TablesInsert<"pharmacy_warehouses">) {
    if (row.id) return this.warehouses.update(row.id, row);
    return this.warehouses.insert(row);
  }

  async createTransfer(args: {
    tenantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    transferDate?: string | null;
    notes?: string | null;
    items: TransferItemInput[];
    actorId?: string | null;
  }): Promise<TransferRow> {
    if (args.fromWarehouseId === args.toWarehouseId)
      throw new Error("Transfer source and destination must differ");
    // Pre-validate all batches
    for (const item of args.items) {
      if (item.batchId) await this.batches.validateBatchForUse(item.batchId);
    }
    const header = await this.transfers.insertHeader({
      tenant_id: args.tenantId,
      from_warehouse_id: args.fromWarehouseId,
      to_warehouse_id: args.toWarehouseId,
      transfer_date: args.transferDate ?? new Date().toISOString().slice(0, 10),
      transfer_number: nextDocumentNumber("TR"),
      status: "in_transit",
      notes: args.notes ?? null,
      shipped_at: new Date().toISOString(),
      created_by: args.actorId ?? null,
    });
    // Insert item rows
    await this.transfers.insertItems(
      args.items.map((i) => ({
        tenant_id: args.tenantId,
        transfer_id: header.id,
        drug_id: i.drugId,
        batch_id: i.batchId ?? null,
        quantity: i.quantity,
        unit_code: i.unitCode,
      })),
    );
    // Ship-out ledger movements
    for (const i of args.items) {
      await this.inventory.postMovement({
        tenantId: args.tenantId,
        warehouseId: args.fromWarehouseId,
        drugId: i.drugId,
        batchId: i.batchId ?? null,
        quantity: -Math.abs(i.quantity),
        unitCode: i.unitCode,
        sourceType: "transfer_out",
        sourceId: header.id,
        actorId: args.actorId ?? null,
      });
    }
    await emitPharmacyEvent(this.sb, args.tenantId, PHARMACY_EVENTS.StockTransferred, {
      transfer_id: header.id,
      from_warehouse_id: args.fromWarehouseId,
      to_warehouse_id: args.toWarehouseId,
      status: "in_transit",
    });
    return header;
  }

  async receiveTransfer(args: {
    tenantId: string;
    transferId: string;
    actorId?: string | null;
  }): Promise<TransferRow> {
    const { data: header, error } = await this.sb
      .from("pharmacy_transfers")
      .select("*")
      .eq("id", args.transferId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!header) throw new Error("Transfer not found");
    if (header.status === "received") return header;
    const { data: items } = await this.sb
      .from("pharmacy_transfer_items")
      .select("*")
      .eq("transfer_id", args.transferId);
    for (const i of items ?? []) {
      await this.inventory.postMovement({
        tenantId: args.tenantId,
        warehouseId: header.to_warehouse_id,
        drugId: i.drug_id,
        batchId: i.batch_id ?? null,
        quantity: Math.abs(Number(i.quantity)),
        unitCode: i.unit_code,
        sourceType: "transfer_in",
        sourceId: header.id,
        actorId: args.actorId ?? null,
      });
    }
    const updated = await this.transfers.updateHeader(header.id, {
      status: "received",
      received_at: new Date().toISOString(),
      updated_by: args.actorId ?? null,
    });
    return updated;
  }
}
