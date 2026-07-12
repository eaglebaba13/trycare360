/**
 * PurchaseEngine — Purchase Order lifecycle and GRN posting.
 *
 * PO lifecycle: draft → approved → sent → partially_received → received → closed
 * Approvals reuse the existing Approval Engine (approval_requests) via the
 * PO header column `approval_request_id`. Stage 2 exposes the pipeline; the
 * actual approval definitions live in the Approval Engine tables.
 *
 * GRN posting is the ONLY entry point that creates batches and calls
 * InventoryEngine.receiveStock — this guarantees ledger integrity.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  BatchRepository,
  GoodsReceiptRepository,
  PurchaseOrderRepository,
  type GoodsReceiptRow,
  type PurchaseOrderRow,
} from "../repositories.server";
import { InventoryEngine } from "./inventory.engine.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent, indexPharmacySearch, nextDocumentNumber } from "../helpers.server";
import type { GrnPostInput, PoCreateInput } from "../validators";

type SB = SupabaseClient<Database>;

export class PurchaseEngine {
  private readonly po: PurchaseOrderRepository;
  private readonly grn: GoodsReceiptRepository;
  private readonly batches: BatchRepository;
  private readonly inventory: InventoryEngine;

  constructor(private readonly sb: SB) {
    this.po = new PurchaseOrderRepository(sb);
    this.grn = new GoodsReceiptRepository(sb);
    this.batches = new BatchRepository(sb);
    this.inventory = new InventoryEngine(sb);
  }

  async createPo(input: PoCreateInput, actorId: string | null): Promise<PurchaseOrderRow> {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    for (const it of input.items) {
      const line =
        (it.unitPrice ?? 0) * it.quantityOrdered * (1 - (it.discountPercent ?? 0) / 100);
      subtotal += line;
      taxTotal += line * ((it.taxPercent ?? 0) / 100);
      discountTotal += (it.unitPrice ?? 0) * it.quantityOrdered * ((it.discountPercent ?? 0) / 100);
    }
    const grandTotal = subtotal + taxTotal;
    const header = await this.po.insertHeader({
      tenant_id: input.tenantId,
      branch_id: input.branchId ?? null,
      warehouse_id: input.warehouseId ?? null,
      supplier_id: input.supplierId,
      po_date: input.poDate ?? new Date().toISOString().slice(0, 10),
      po_number: nextDocumentNumber("PO"),
      expected_date: input.expectedDate ?? null,
      currency: input.currency,
      status: "draft",
      notes: input.notes ?? null,
      subtotal,
      tax_total: taxTotal,
      discount_total: discountTotal,
      grand_total: grandTotal,
      created_by: actorId,
    });
    await this.po.insertItems(
      input.items.map((it) => ({
        tenant_id: input.tenantId,
        po_id: header.id,
        drug_id: it.drugId,
        quantity_ordered: it.quantityOrdered,
        unit_code: it.unitCode,
        unit_price: it.unitPrice ?? null,
        discount_percent: it.discountPercent ?? null,
        tax_percent: it.taxPercent ?? null,
        notes: it.notes ?? null,
        line_total:
          (it.unitPrice ?? 0) *
          it.quantityOrdered *
          (1 - (it.discountPercent ?? 0) / 100) *
          (1 + (it.taxPercent ?? 0) / 100),
      })),
    );
    await emitPharmacyEvent(this.sb, input.tenantId, PHARMACY_EVENTS.PoCreated, {
      po_id: header.id,
      supplier_id: input.supplierId,
      grand_total: grandTotal,
    });
    await indexPharmacySearch(this.sb, {
      tenantId: input.tenantId,
      entityType: "pharmacy_purchase_order",
      entityId: header.id,
      title: `PO ${header.po_number}`,
      subtitle: `Supplier ${input.supplierId}`,
    });
    return header;
  }

  async approve(tenantId: string, poId: string, actorId: string | null): Promise<PurchaseOrderRow> {
    const updated = await this.po.updateHeader(poId, {
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: actorId ?? null,
      updated_by: actorId ?? null,
    });
    await emitPharmacyEvent(this.sb, tenantId, PHARMACY_EVENTS.PoApproved, { po_id: poId });
    return updated;
  }

  async markSent(tenantId: string, poId: string, actorId: string | null) {
    const updated = await this.po.updateHeader(poId, {
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_by: actorId ?? null,
    });
    await emitPharmacyEvent(this.sb, tenantId, PHARMACY_EVENTS.PoSent, { po_id: poId });
    return updated;
  }

  async postGrn(input: GrnPostInput, actorId: string | null): Promise<GoodsReceiptRow> {
    // Header
    const header = await this.grn.insertHeader({
      tenant_id: input.tenantId,
      branch_id: input.branchId ?? null,
      warehouse_id: input.warehouseId,
      supplier_id: input.supplierId ?? null,
      po_id: input.poId ?? null,
      grn_date: input.grnDate ?? new Date().toISOString().slice(0, 10),
      grn_number: nextDocumentNumber("GRN"),
      invoice_number: input.invoiceNumber ?? null,
      invoice_date: input.invoiceDate ?? null,
      notes: input.notes ?? null,
      status: "posted",
      posted_at: new Date().toISOString(),
      created_by: actorId,
    });
    // Ensure batches exist, then insert item rows + inventory movements
    const itemRows: TablesInsert<"pharmacy_goods_receipt_items">[] = [];
    for (const it of input.items) {
      let batchId = it.batchId ?? null;
      if (!batchId) {
        if (!it.batchNo || !it.expiryDate)
          throw new Error("GRN item requires batchId or (batchNo + expiryDate)");
        const batch = await this.batches.findOrCreate({
          tenant_id: input.tenantId,
          drug_id: it.drugId,
          batch_no: it.batchNo,
          lot_no: it.lotNo ?? null,
          expiry_date: it.expiryDate,
          manufacture_date: it.manufactureDate ?? null,
          manufacturer: it.manufacturer ?? null,
          supplier_id: input.supplierId ?? null,
          cost_price: it.costPrice ?? null,
          mrp: it.mrp ?? null,
          gst_percent: it.gstPercent ?? null,
          hsn_code: it.hsnCode ?? null,
        });
        batchId = batch.id;
      }
      itemRows.push({
        tenant_id: input.tenantId,
        grn_id: header.id,
        po_item_id: it.poItemId ?? null,
        drug_id: it.drugId,
        batch_id: batchId,
        quantity_received: it.quantityReceived,
        unit_code: it.unitCode,
        unit_cost: it.unitCost ?? null,
        location_id: it.locationId ?? null,
        bin_id: it.binId ?? null,
        notes: it.notes ?? null,
      });
      // Update matching PO item received quantity (best-effort)
      if (it.poItemId) {
        await this.sb.rpc("emit_automation_event", {
          _tenant_id: input.tenantId,
          _event_type: "pharmacy.po.item.received",
          _payload: { po_item_id: it.poItemId, quantity: it.quantityReceived } as never,
          _entity_ref: null as never,
        }).catch(() => {/* best effort */});
      }
    }
    await this.grn.insertItems(itemRows);
    // Post inventory movements
    for (const row of itemRows) {
      await this.inventory.receiveStock({
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
        drugId: row.drug_id,
        batchId: row.batch_id ?? null,
        locationId: row.location_id ?? null,
        binId: row.bin_id ?? null,
        quantity: Number(row.quantity_received),
        unitCode: row.unit_code,
        sourceType: "grn",
        sourceId: header.id,
        actorId,
      });
    }
    // PO state transition (partial vs full)
    if (input.poId) {
      const po = await this.po.getById(input.poId);
      if (po) {
        await this.po.updateHeader(input.poId, {
          status: "partially_received",
          updated_by: actorId ?? null,
        });
      }
    }
    await emitPharmacyEvent(this.sb, input.tenantId, PHARMACY_EVENTS.GrnPosted, {
      grn_id: header.id,
      po_id: input.poId ?? null,
      supplier_id: input.supplierId ?? null,
      warehouse_id: input.warehouseId,
    });
    return header;
  }
}
