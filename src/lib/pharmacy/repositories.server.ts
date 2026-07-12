/**
 * Phase 2.6 Pharmacy — Stage 2 Repositories (server-only).
 *
 * Thin typed wrappers over the Stage 1 pharmacy tables. Repositories
 * contain NO business logic — they only read and write rows.
 * All orchestration (ledger integrity, FEFO, events, timeline, revenue,
 * workflow) lives in the engines under ./engines/*.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// unwrap helpers
// ---------------------------------------------------------------------------
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("Row not found");
  return res.data;
}
function unwrapMaybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function unwrapList<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

// ---------------------------------------------------------------------------
// Drug master
// ---------------------------------------------------------------------------
export type DrugRow = Tables<"pharmacy_drugs">;
export class DrugMasterRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_drugs").select("*").eq("id", id).maybeSingle(),
    );
  }
  async getByCode(tenantId: string | null, code: string) {
    let q = this.sb.from("pharmacy_drugs").select("*").eq("code", code);
    q = tenantId ? q.or(`tenant_id.eq.${tenantId},tenant_id.is.null`) : q.is("tenant_id", null);
    return unwrapMaybe(await q.limit(1).maybeSingle());
  }
  async list(args: {
    tenantId: string | null;
    search?: string;
    activeOnly?: boolean;
    requiresPrescription?: boolean;
    controlledOnly?: boolean;
    limit?: number;
  }) {
    let q = this.sb.from("pharmacy_drugs").select("*").order("name", { ascending: true });
    if (args.tenantId) q = q.or(`tenant_id.eq.${args.tenantId},tenant_id.is.null`);
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    if (args.requiresPrescription !== undefined)
      q = q.eq("requires_prescription", args.requiresPrescription);
    if (args.controlledOnly) q = q.not("controlled_schedule_code", "is", null);
    if (args.search && args.search.trim()) {
      const s = args.search.trim();
      q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%,generic_name.ilike.%${s}%,brand_name.ilike.%${s}%`);
    }
    return unwrapList(await q.limit(args.limit ?? 100));
  }
  async insert(row: TablesInsert<"pharmacy_drugs">) {
    return unwrap(await this.sb.from("pharmacy_drugs").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"pharmacy_drugs">) {
    return unwrap(
      await this.sb.from("pharmacy_drugs").update(patch).eq("id", id).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------
export type BatchRow = Tables<"pharmacy_batches">;
export class BatchRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_batches").select("*").eq("id", id).maybeSingle(),
    );
  }
  async findOrCreate(row: TablesInsert<"pharmacy_batches">) {
    const existing = unwrapMaybe(
      await this.sb
        .from("pharmacy_batches")
        .select("*")
        .eq("tenant_id", row.tenant_id)
        .eq("drug_id", row.drug_id)
        .eq("batch_no", row.batch_no)
        .maybeSingle(),
    );
    if (existing) return existing;
    return this.insert(row);
  }
  async insert(row: TablesInsert<"pharmacy_batches">) {
    return unwrap(await this.sb.from("pharmacy_batches").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"pharmacy_batches">) {
    return unwrap(
      await this.sb.from("pharmacy_batches").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listFefoForDrug(args: { tenantId: string; drugId: string; includeQuarantined?: boolean }) {
    let q = this.sb
      .from("pharmacy_batches")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("drug_id", args.drugId)
      .eq("is_recalled", false)
      .order("expiry_date", { ascending: true });
    if (!args.includeQuarantined) q = q.eq("is_quarantined", false);
    return unwrapList(await q.limit(200));
  }
  async listByBatchNos(tenantId: string, batchNos: string[]) {
    if (!batchNos.length) return [];
    return unwrapList(
      await this.sb
        .from("pharmacy_batches")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("batch_no", batchNos),
    );
  }
  async listNearExpiry(args: { tenantId: string; withinDays: number; limit?: number }) {
    const until = new Date(Date.now() + args.withinDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return unwrapList(
      await this.sb
        .from("pharmacy_batches")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .lte("expiry_date", until)
        .eq("is_recalled", false)
        .eq("is_quarantined", false)
        .order("expiry_date", { ascending: true })
        .limit(args.limit ?? 200),
    );
  }
}

// ---------------------------------------------------------------------------
// Warehouse / locations / bins
// ---------------------------------------------------------------------------
export type WarehouseRow = Tables<"pharmacy_warehouses">;
export type WarehouseLocationRow = Tables<"pharmacy_warehouse_locations">;
export type WarehouseBinRow = Tables<"pharmacy_warehouse_bins">;
export class WarehouseRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_warehouses").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(args: { tenantId: string; branchId?: string | null; activeOnly?: boolean }) {
    let q = this.sb
      .from("pharmacy_warehouses")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("name", { ascending: true });
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    return unwrapList(await q.limit(500));
  }
  async insert(row: TablesInsert<"pharmacy_warehouses">) {
    return unwrap(await this.sb.from("pharmacy_warehouses").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"pharmacy_warehouses">) {
    return unwrap(
      await this.sb.from("pharmacy_warehouses").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listLocations(warehouseId: string) {
    return unwrapList(
      await this.sb
        .from("pharmacy_warehouse_locations")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .order("name"),
    );
  }
  async upsertLocation(row: TablesInsert<"pharmacy_warehouse_locations">) {
    if (row.id) {
      return unwrap(
        await this.sb
          .from("pharmacy_warehouse_locations")
          .update(row)
          .eq("id", row.id)
          .select("*")
          .single(),
      );
    }
    return unwrap(
      await this.sb.from("pharmacy_warehouse_locations").insert(row).select("*").single(),
    );
  }
  async listBins(warehouseId: string) {
    return unwrapList(
      await this.sb
        .from("pharmacy_warehouse_bins")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .order("code"),
    );
  }
  async upsertBin(row: TablesInsert<"pharmacy_warehouse_bins">) {
    if (row.id) {
      return unwrap(
        await this.sb
          .from("pharmacy_warehouse_bins")
          .update(row)
          .eq("id", row.id)
          .select("*")
          .single(),
      );
    }
    return unwrap(await this.sb.from("pharmacy_warehouse_bins").insert(row).select("*").single());
  }
}

// ---------------------------------------------------------------------------
// Inventory (stock_on_hand + ledger + reservations)
// ---------------------------------------------------------------------------
export type StockOnHandRow = Tables<"pharmacy_stock_on_hand">;
export type StockReservationRow = Tables<"pharmacy_stock_reservations">;
export type InventoryLedgerRow = Tables<"pharmacy_inventory_ledger">;

export class InventoryRepository {
  constructor(private readonly sb: SB) {}

  async lookup(args: {
    tenantId: string;
    warehouseId: string;
    drugId: string;
    batchId?: string | null;
    locationId?: string | null;
    binId?: string | null;
    unitCode: string;
  }): Promise<StockOnHandRow | null> {
    let q = this.sb
      .from("pharmacy_stock_on_hand")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("warehouse_id", args.warehouseId)
      .eq("drug_id", args.drugId)
      .eq("unit_code", args.unitCode);
    q = args.batchId ? q.eq("batch_id", args.batchId) : q.is("batch_id", null);
    q = args.locationId ? q.eq("location_id", args.locationId) : q.is("location_id", null);
    q = args.binId ? q.eq("bin_id", args.binId) : q.is("bin_id", null);
    return unwrapMaybe(await q.maybeSingle());
  }

  async list(args: {
    tenantId: string;
    warehouseId?: string | null;
    drugId?: string | null;
    limit: number;
  }) {
    let q = this.sb
      .from("pharmacy_stock_on_hand")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("updated_at", { ascending: false });
    if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
    if (args.drugId) q = q.eq("drug_id", args.drugId);
    return unwrapList(await q.limit(args.limit));
  }

  async upsertProjection(row: {
    tenant_id: string;
    warehouse_id: string;
    drug_id: string;
    batch_id: string | null;
    location_id: string | null;
    bin_id: string | null;
    unit_code: string;
    quantity_delta: number;
    reserved_delta?: number;
    last_movement_at: string;
  }): Promise<StockOnHandRow> {
    const existing = await this.lookup({
      tenantId: row.tenant_id,
      warehouseId: row.warehouse_id,
      drugId: row.drug_id,
      batchId: row.batch_id,
      locationId: row.location_id,
      binId: row.bin_id,
      unitCode: row.unit_code,
    });
    if (existing) {
      const patch: TablesUpdate<"pharmacy_stock_on_hand"> = {
        quantity_on_hand: Number(existing.quantity_on_hand) + row.quantity_delta,
        quantity_reserved:
          Number(existing.quantity_reserved) + (row.reserved_delta ?? 0),
        last_movement_at: row.last_movement_at,
      };
      return unwrap(
        await this.sb
          .from("pharmacy_stock_on_hand")
          .update(patch)
          .eq("id", existing.id)
          .select("*")
          .single(),
      );
    }
    const insert: TablesInsert<"pharmacy_stock_on_hand"> = {
      tenant_id: row.tenant_id,
      warehouse_id: row.warehouse_id,
      drug_id: row.drug_id,
      batch_id: row.batch_id,
      location_id: row.location_id,
      bin_id: row.bin_id,
      unit_code: row.unit_code,
      quantity_on_hand: row.quantity_delta,
      quantity_reserved: row.reserved_delta ?? 0,
      last_movement_at: row.last_movement_at,
    };
    return unwrap(
      await this.sb.from("pharmacy_stock_on_hand").insert(insert).select("*").single(),
    );
  }
}

export class InventoryLedgerRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_inventory_ledger">) {
    return unwrap(
      await this.sb.from("pharmacy_inventory_ledger").insert(row).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    warehouseId?: string | null;
    drugId?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("pharmacy_inventory_ledger")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("occurred_at", { ascending: false });
    if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
    if (args.drugId) q = q.eq("drug_id", args.drugId);
    return unwrapList(await q.limit(args.limit ?? 200));
  }
}

export class ReservationRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_stock_reservations">) {
    return unwrap(
      await this.sb.from("pharmacy_stock_reservations").insert(row).select("*").single(),
    );
  }
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_stock_reservations").select("*").eq("id", id).maybeSingle(),
    );
  }
  async setStatus(id: string, status: string) {
    return unwrap(
      await this.sb
        .from("pharmacy_stock_reservations")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Supplier
// ---------------------------------------------------------------------------
export type SupplierRow = Tables<"pharmacy_suppliers">;
export class SupplierRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_suppliers").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(args: { tenantId: string; search?: string; activeOnly?: boolean }) {
    let q = this.sb
      .from("pharmacy_suppliers")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("name");
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    if (args.search && args.search.trim()) {
      const s = args.search.trim();
      q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%,legal_name.ilike.%${s}%`);
    }
    return unwrapList(await q.limit(200));
  }
  async insert(row: TablesInsert<"pharmacy_suppliers">) {
    return unwrap(await this.sb.from("pharmacy_suppliers").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"pharmacy_suppliers">) {
    return unwrap(
      await this.sb.from("pharmacy_suppliers").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listProductsForDrug(tenantId: string, drugId: string) {
    return unwrapList(
      await this.sb
        .from("pharmacy_supplier_products")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("drug_id", drugId)
        .eq("is_active", true)
        .order("is_preferred", { ascending: false }),
    );
  }
  async upsertSupplierProduct(row: TablesInsert<"pharmacy_supplier_products">) {
    if (row.id) {
      return unwrap(
        await this.sb
          .from("pharmacy_supplier_products")
          .update(row)
          .eq("id", row.id)
          .select("*")
          .single(),
      );
    }
    return unwrap(
      await this.sb.from("pharmacy_supplier_products").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------
export type PurchaseOrderRow = Tables<"pharmacy_purchase_orders">;
export type PurchaseOrderItemRow = Tables<"pharmacy_purchase_order_items">;
export class PurchaseOrderRepository {
  constructor(private readonly sb: SB) {}
  async insertHeader(row: TablesInsert<"pharmacy_purchase_orders">) {
    return unwrap(await this.sb.from("pharmacy_purchase_orders").insert(row).select("*").single());
  }
  async updateHeader(id: string, patch: TablesUpdate<"pharmacy_purchase_orders">) {
    return unwrap(
      await this.sb
        .from("pharmacy_purchase_orders")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_purchase_orders").select("*").eq("id", id).maybeSingle(),
    );
  }
  async listItems(poId: string) {
    return unwrapList(
      await this.sb
        .from("pharmacy_purchase_order_items")
        .select("*")
        .eq("po_id", poId)
        .order("created_at"),
    );
  }
  async insertItems(rows: TablesInsert<"pharmacy_purchase_order_items">[]) {
    if (!rows.length) return [];
    return unwrapList(
      await this.sb.from("pharmacy_purchase_order_items").insert(rows).select("*"),
    );
  }
  async list(args: {
    tenantId: string;
    supplierId?: string | null;
    status?: string | null;
    limit: number;
  }) {
    let q = this.sb
      .from("pharmacy_purchase_orders")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("po_date", { ascending: false });
    if (args.supplierId) q = q.eq("supplier_id", args.supplierId);
    if (args.status) q = q.eq("status", args.status);
    return unwrapList(await q.limit(args.limit));
  }
}

// ---------------------------------------------------------------------------
// Goods Receipts
// ---------------------------------------------------------------------------
export type GoodsReceiptRow = Tables<"pharmacy_goods_receipts">;
export type GoodsReceiptItemRow = Tables<"pharmacy_goods_receipt_items">;
export class GoodsReceiptRepository {
  constructor(private readonly sb: SB) {}
  async insertHeader(row: TablesInsert<"pharmacy_goods_receipts">) {
    return unwrap(await this.sb.from("pharmacy_goods_receipts").insert(row).select("*").single());
  }
  async updateHeader(id: string, patch: TablesUpdate<"pharmacy_goods_receipts">) {
    return unwrap(
      await this.sb
        .from("pharmacy_goods_receipts")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async insertItems(rows: TablesInsert<"pharmacy_goods_receipt_items">[]) {
    if (!rows.length) return [];
    return unwrapList(
      await this.sb.from("pharmacy_goods_receipt_items").insert(rows).select("*"),
    );
  }
}

// ---------------------------------------------------------------------------
// Dispenses / prescription fills
// ---------------------------------------------------------------------------
export type DispenseRow = Tables<"pharmacy_dispenses">;
export type DispenseItemRow = Tables<"pharmacy_dispense_items">;
export type PrescriptionFillRow = Tables<"pharmacy_prescription_fills">;
export class DispenseRepository {
  constructor(private readonly sb: SB) {}
  async insertHeader(row: TablesInsert<"pharmacy_dispenses">) {
    return unwrap(await this.sb.from("pharmacy_dispenses").insert(row).select("*").single());
  }
  async updateHeader(id: string, patch: TablesUpdate<"pharmacy_dispenses">) {
    return unwrap(
      await this.sb.from("pharmacy_dispenses").update(patch).eq("id", id).select("*").single(),
    );
  }
  async insertItems(rows: TablesInsert<"pharmacy_dispense_items">[]) {
    if (!rows.length) return [];
    return unwrapList(await this.sb.from("pharmacy_dispense_items").insert(rows).select("*"));
  }
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_dispenses").select("*").eq("id", id).maybeSingle(),
    );
  }
  async listItems(dispenseId: string) {
    return unwrapList(
      await this.sb.from("pharmacy_dispense_items").select("*").eq("dispense_id", dispenseId),
    );
  }
  async list(args: {
    tenantId: string;
    patientId?: string | null;
    encounterId?: string | null;
    warehouseId?: string | null;
    status?: string | null;
    limit: number;
  }) {
    let q = this.sb
      .from("pharmacy_dispenses")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("dispense_date", { ascending: false });
    if (args.patientId) q = q.eq("patient_id", args.patientId);
    if (args.encounterId) q = q.eq("encounter_id", args.encounterId);
    if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
    if (args.status) q = q.eq("status", args.status);
    return unwrapList(await q.limit(args.limit));
  }
}
export class PrescriptionFillRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_prescription_fills">) {
    return unwrap(
      await this.sb.from("pharmacy_prescription_fills").insert(row).select("*").single(),
    );
  }
  async listForPrescription(prescriptionId: string) {
    return unwrapList(
      await this.sb
        .from("pharmacy_prescription_fills")
        .select("*")
        .eq("prescription_id", prescriptionId)
        .order("filled_at", { ascending: false }),
    );
  }
  async countForItem(prescriptionItemId: string): Promise<number> {
    const { count, error } = await this.sb
      .from("pharmacy_prescription_fills")
      .select("id", { count: "exact", head: true })
      .eq("prescription_item_id", prescriptionItemId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Transfers / Returns / Controlled register / Cold chain / Recalls / Kits
// ---------------------------------------------------------------------------
export type TransferRow = Tables<"pharmacy_transfers">;
export type TransferItemRow = Tables<"pharmacy_transfer_items">;
export class TransferRepository {
  constructor(private readonly sb: SB) {}
  async insertHeader(row: TablesInsert<"pharmacy_transfers">) {
    return unwrap(await this.sb.from("pharmacy_transfers").insert(row).select("*").single());
  }
  async insertItems(rows: TablesInsert<"pharmacy_transfer_items">[]) {
    if (!rows.length) return [];
    return unwrapList(await this.sb.from("pharmacy_transfer_items").insert(rows).select("*"));
  }
  async updateHeader(id: string, patch: TablesUpdate<"pharmacy_transfers">) {
    return unwrap(
      await this.sb.from("pharmacy_transfers").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: { tenantId: string; limit?: number }) {
    return unwrapList(
      await this.sb
        .from("pharmacy_transfers")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .order("transfer_date", { ascending: false })
        .limit(args.limit ?? 100),
    );
  }
}

export type ReturnRow = Tables<"pharmacy_returns">;
export class ReturnRepository {
  constructor(private readonly sb: SB) {}
  async insertHeader(row: TablesInsert<"pharmacy_returns">) {
    return unwrap(await this.sb.from("pharmacy_returns").insert(row).select("*").single());
  }
  async insertItems(rows: TablesInsert<"pharmacy_return_items">[]) {
    if (!rows.length) return [];
    return unwrapList(await this.sb.from("pharmacy_return_items").insert(rows).select("*"));
  }
  async list(args: { tenantId: string; limit?: number }) {
    return unwrapList(
      await this.sb
        .from("pharmacy_returns")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .order("return_date", { ascending: false })
        .limit(args.limit ?? 100),
    );
  }
}

export type ControlledRegisterRow = Tables<"pharmacy_controlled_register">;
export class ControlledDrugRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_controlled_register">) {
    return unwrap(
      await this.sb.from("pharmacy_controlled_register").insert(row).select("*").single(),
    );
  }
  async latestBalance(args: { tenantId: string; warehouseId: string; drugId: string }) {
    return unwrapMaybe(
      await this.sb
        .from("pharmacy_controlled_register")
        .select("balance_after")
        .eq("tenant_id", args.tenantId)
        .eq("warehouse_id", args.warehouseId)
        .eq("drug_id", args.drugId)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
  }
  async list(args: {
    tenantId: string;
    warehouseId?: string | null;
    drugId?: string | null;
    from?: string | null;
    to?: string | null;
    discrepancyOnly?: boolean;
    limit: number;
  }) {
    let q = this.sb
      .from("pharmacy_controlled_register")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("occurred_at", { ascending: false });
    if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
    if (args.drugId) q = q.eq("drug_id", args.drugId);
    if (args.from) q = q.gte("occurred_at", args.from);
    if (args.to) q = q.lte("occurred_at", args.to);
    if (args.discrepancyOnly) q = q.eq("discrepancy_flag", true);
    return unwrapList(await q.limit(args.limit));
  }
}

export type ColdChainRow = Tables<"pharmacy_coldchain_logs">;
export class ColdChainRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_coldchain_logs">) {
    return unwrap(await this.sb.from("pharmacy_coldchain_logs").insert(row).select("*").single());
  }
  async list(args: {
    tenantId: string;
    warehouseId?: string | null;
    locationId?: string | null;
    excursionOnly?: boolean;
    from?: string | null;
    to?: string | null;
    limit: number;
  }) {
    let q = this.sb
      .from("pharmacy_coldchain_logs")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("reading_at", { ascending: false });
    if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
    if (args.locationId) q = q.eq("location_id", args.locationId);
    if (args.excursionOnly) q = q.eq("is_excursion", true);
    if (args.from) q = q.gte("reading_at", args.from);
    if (args.to) q = q.lte("reading_at", args.to);
    return unwrapList(await q.limit(args.limit));
  }
}

export type RecallRow = Tables<"pharmacy_drug_recalls">;
export type RecallItemRow = Tables<"pharmacy_drug_recall_items">;
export class RecallRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_drug_recalls">) {
    return unwrap(await this.sb.from("pharmacy_drug_recalls").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"pharmacy_drug_recalls">) {
    return unwrap(
      await this.sb.from("pharmacy_drug_recalls").update(patch).eq("id", id).select("*").single(),
    );
  }
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_drug_recalls").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insertItems(rows: TablesInsert<"pharmacy_drug_recall_items">[]) {
    if (!rows.length) return [];
    return unwrapList(await this.sb.from("pharmacy_drug_recall_items").insert(rows).select("*"));
  }
  async list(args: { tenantId: string; limit?: number }) {
    return unwrapList(
      await this.sb
        .from("pharmacy_drug_recalls")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .order("initiated_at", { ascending: false })
        .limit(args.limit ?? 100),
    );
  }
}

export type MedicationKitRow = Tables<"pharmacy_medication_kits">;
export type MedicationKitItemRow = Tables<"pharmacy_medication_kit_items">;
export class MedicationKitRepository {
  constructor(private readonly sb: SB) {}
  async upsertKit(row: TablesInsert<"pharmacy_medication_kits">) {
    if (row.id) {
      return unwrap(
        await this.sb
          .from("pharmacy_medication_kits")
          .update(row)
          .eq("id", row.id)
          .select("*")
          .single(),
      );
    }
    return unwrap(await this.sb.from("pharmacy_medication_kits").insert(row).select("*").single());
  }
  async replaceItems(kitId: string, tenantId: string, items: TablesInsert<"pharmacy_medication_kit_items">[]) {
    const del = await this.sb.from("pharmacy_medication_kit_items").delete().eq("kit_id", kitId);
    if (del.error) throw new Error(del.error.message);
    if (!items.length) return [];
    const rows = items.map((i) => ({ ...i, kit_id: kitId, tenant_id: tenantId }));
    return unwrapList(await this.sb.from("pharmacy_medication_kit_items").insert(rows).select("*"));
  }
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("pharmacy_medication_kits").select("*").eq("id", id).maybeSingle(),
    );
  }
  async listItems(kitId: string) {
    return unwrapList(
      await this.sb
        .from("pharmacy_medication_kit_items")
        .select("*")
        .eq("kit_id", kitId)
        .order("created_at"),
    );
  }
  async list(args: { tenantId: string; activeOnly?: boolean }) {
    let q = this.sb
      .from("pharmacy_medication_kits")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("name");
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    return unwrapList(await q.limit(200));
  }
}

// ---------------------------------------------------------------------------
// Forecast (read-only in Stage 2; ForecastEngine holds the interface only)
// ---------------------------------------------------------------------------
export type ForecastRow = Tables<"pharmacy_inventory_forecasts">;
export class ForecastRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"pharmacy_inventory_forecasts">) {
    return unwrap(
      await this.sb.from("pharmacy_inventory_forecasts").insert(row).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    warehouseId?: string | null;
    drugId?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("pharmacy_inventory_forecasts")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("generated_at", { ascending: false });
    if (args.warehouseId) q = q.eq("warehouse_id", args.warehouseId);
    if (args.drugId) q = q.eq("drug_id", args.drugId);
    return unwrapList(await q.limit(args.limit ?? 50));
  }
}
