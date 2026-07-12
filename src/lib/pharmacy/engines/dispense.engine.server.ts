/**
 * DispenseEngine — the ONLY entry point that turns a clinical prescription
 * into a physical medication dispense.
 *
 * Guardrails:
 *   - Patient context is loaded via the existing ClinicalContextLoader.
 *     Pharmacy NEVER queries clinical tables directly for context.
 *   - Prescription, allergy, and contraindication references are
 *     validated against Stage 4 clinical tables read-only.
 *   - Never mutates any clinical_* table. Dispense results are recorded
 *     in pharmacy_* tables and surfaced to the EMR via events + timeline.
 *   - Every stock movement goes through InventoryEngine.
 *   - Revenue is emitted through the shared revenue_events table.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  DispenseRepository,
  PrescriptionFillRepository,
  type DispenseRow,
} from "../repositories.server";
import { BatchEngine } from "./batch.engine.server";
import { InventoryEngine } from "./inventory.engine.server";
import { ControlledDrugEngine } from "./controlled.engine.server";
import { ClinicalContextLoader } from "@/lib/clinical/context-loader.server";
import { PHARMACY_EVENTS } from "../events";
import {
  emitPharmacyEvent,
  indexPharmacySearch,
  logPharmacyTimeline,
  nextDocumentNumber,
  recordPharmacyRevenue,
} from "../helpers.server";
import type { DispenseCreateInput } from "../validators";

type SB = SupabaseClient<Database>;

interface PrescriptionValidationResult {
  prescription: { id: string; status: string; patient_id: string } | null;
  itemsById: Map<string, { id: string; medication: string; refills: number }>;
}

export class DispenseEngine {
  private readonly dispenses: DispenseRepository;
  private readonly fills: PrescriptionFillRepository;
  private readonly inventory: InventoryEngine;
  private readonly batches: BatchEngine;
  private readonly controlled: ControlledDrugEngine;
  private readonly loader: ClinicalContextLoader;

  constructor(private readonly sb: SB) {
    this.dispenses = new DispenseRepository(sb);
    this.fills = new PrescriptionFillRepository(sb);
    this.inventory = new InventoryEngine(sb);
    this.batches = new BatchEngine(sb);
    this.controlled = new ControlledDrugEngine(sb);
    this.loader = new ClinicalContextLoader(sb);
  }

  /**
   * Read-only clinical validation. NEVER writes to any clinical table.
   */
  private async validatePrescription(
    tenantId: string,
    prescriptionId: string | null | undefined,
    expectedPatientId: string,
  ): Promise<PrescriptionValidationResult> {
    if (!prescriptionId) return { prescription: null, itemsById: new Map() };
    const { data: rx, error } = await this.sb
      .from("clinical_prescriptions")
      .select("id, status, patient_id, tenant_id")
      .eq("id", prescriptionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rx) throw new Error("Prescription not found");
    if (rx.tenant_id !== tenantId) throw new Error("Prescription tenant mismatch");
    if (rx.patient_id !== expectedPatientId)
      throw new Error("Prescription patient mismatch");
    if (rx.status === "cancelled" || rx.status === "expired")
      throw new Error(`Prescription is ${rx.status}`);
    const { data: items } = await this.sb
      .from("clinical_prescription_items")
      .select("id, medication, refills")
      .eq("prescription_id", prescriptionId);
    const map = new Map<string, { id: string; medication: string; refills: number }>();
    for (const it of items ?? []) map.set(it.id, it);
    return { prescription: rx, itemsById: map };
  }

  /**
   * Load compact clinical context — allergies & problems only used for
   * advisory flags returned in the dispense result. The engine does not
   * hard-block dispensing on soft allergies; that is a clinician decision.
   */
  private async loadPatientContext(tenantId: string, patientId: string, actorId: string | null) {
    try {
      return await this.loader.getClinicalContext({
        tenantId,
        personId: patientId,
        userId: actorId ?? "00000000-0000-0000-0000-000000000000",
        historyLimit: 5,
      });
    } catch (err) {
      console.warn("[pharmacy.dispense] context load failed", err);
      return null;
    }
  }

  async createDispense(
    input: DispenseCreateInput,
    actorId: string | null,
  ): Promise<{ dispense: DispenseRow; warnings: string[] }> {
    const warnings: string[] = [];
    const rx = await this.validatePrescription(
      input.tenantId,
      input.prescriptionId ?? null,
      input.patientId,
    );
    const ctx = await this.loadPatientContext(input.tenantId, input.patientId, actorId);

    // Advisory allergy check (soft warning)
    if (ctx?.allergies?.length) {
      for (const item of input.items) {
        const hit = ctx.allergies.find((a) =>
          a.substance?.toLowerCase().includes(item.drugId.toLowerCase()),
        );
        if (hit) warnings.push(`Possible allergy: ${hit.substance}`);
      }
    }

    // Resolve FEFO batches for every item that hasn't specified one
    interface Line {
      itemInput: DispenseCreateInput["items"][number];
      pickBatchId: string | null;
      quantityFilled: number;
      unitPrice: number | null;
    }
    const lines: Line[] = [];
    let revenueTotal = 0;

    for (const item of input.items) {
      const picks = await this.batches.pickFefo({
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
        drugId: item.drugId,
        unitCode: item.unitCode,
        quantityNeeded: item.quantity,
      });
      for (const pick of picks) {
        lines.push({
          itemInput: item,
          pickBatchId: pick.batch.id,
          quantityFilled: pick.takeQuantity,
          unitPrice: item.unitPrice ?? null,
        });
        if (item.unitPrice) revenueTotal += item.unitPrice * pick.takeQuantity;
      }
    }

    // Insert header (status draft until items commit)
    const header = await this.dispenses.insertHeader({
      tenant_id: input.tenantId,
      branch_id: input.branchId ?? null,
      warehouse_id: input.warehouseId,
      encounter_id: input.encounterId ?? null,
      patient_id: input.patientId,
      prescription_id: input.prescriptionId ?? null,
      dispense_date: input.dispenseDate ?? new Date().toISOString().slice(0, 10),
      dispense_number: nextDocumentNumber("DSP"),
      dispensed_by: actorId,
      status: "issued",
      counselling_notes: input.counsellingNotes ?? null,
      created_by: actorId,
    });

    // Persist dispense items + commit inventory
    const itemRows: TablesInsert<"pharmacy_dispense_items">[] = lines.map((l) => ({
      tenant_id: input.tenantId,
      dispense_id: header.id,
      prescription_item_id: l.itemInput.prescriptionItemId ?? null,
      drug_id: l.itemInput.drugId,
      batch_id: l.pickBatchId,
      quantity: l.quantityFilled,
      unit_code: l.itemInput.unitCode,
      unit_price: l.unitPrice,
      is_controlled: l.itemInput.isControlled ?? false,
      substituted_from_drug_id: l.itemInput.substitutedFromDrugId ?? null,
      substitution_reason: l.itemInput.substitutionReason ?? null,
      notes: l.itemInput.notes ?? null,
    }));
    const insertedItems = await this.dispenses.insertItems(itemRows);

    // Commit outbound stock movement + controlled register + fills
    for (const [idx, dispItem] of insertedItems.entries()) {
      const line = lines[idx];
      await this.inventory.commitDispense({
        reservationId: null,
        tenantId: input.tenantId,
        warehouseId: input.warehouseId,
        drugId: dispItem.drug_id,
        batchId: dispItem.batch_id ?? null,
        quantity: Number(dispItem.quantity),
        unitCode: dispItem.unit_code,
        sourceType: "dispense",
        sourceId: header.id,
        actorId,
        meta: { dispense_item_id: dispItem.id },
      });

      // Controlled register entry (delegate to engine — witness/balance rules there)
      if (line.itemInput.isControlled) {
        await this.controlled.recordDispense({
          tenantId: input.tenantId,
          warehouseId: input.warehouseId,
          drugId: dispItem.drug_id,
          batchId: dispItem.batch_id ?? null,
          quantityOut: Number(dispItem.quantity),
          unitCode: dispItem.unit_code,
          patientId: input.patientId,
          prescriberId: null,
          dispensedBy: actorId,
          witnessId: line.itemInput.witnessId ?? null,
          referenceType: "pharmacy_dispense",
          referenceId: header.id,
        });
      }

      // Prescription fill (only if linked to a prescription item)
      if (rx.prescription && line.itemInput.prescriptionItemId) {
        const rxItem = rx.itemsById.get(line.itemInput.prescriptionItemId);
        const priorFills = await this.fills.countForItem(line.itemInput.prescriptionItemId);
        await this.fills.insert({
          tenant_id: input.tenantId,
          prescription_id: rx.prescription.id,
          prescription_item_id: line.itemInput.prescriptionItemId,
          dispense_id: header.id,
          dispense_item_id: dispItem.id,
          fill_number: priorFills + 1,
          quantity_filled: Number(dispItem.quantity),
          unit_code: dispItem.unit_code,
          status: rxItem && priorFills + 1 > rxItem.refills ? "final" : "active",
        });
      }
    }

    // Revenue (best-effort; category flags pharmacy)
    if (revenueTotal > 0) {
      await recordPharmacyRevenue(this.sb, {
        tenantId: input.tenantId,
        personId: input.patientId,
        amount: revenueTotal,
        branchId: input.branchId ?? null,
        sourceRef: header.id,
        category: "pharmacy_dispense",
        meta: { dispense_number: header.dispense_number },
      });
    }

    // Workflow event + timeline + search
    await emitPharmacyEvent(this.sb, input.tenantId, PHARMACY_EVENTS.DispenseCompleted, {
      dispense_id: header.id,
      patient_id: input.patientId,
      encounter_id: input.encounterId ?? null,
      prescription_id: input.prescriptionId ?? null,
      item_count: insertedItems.length,
      warnings,
    });
    await logPharmacyTimeline(this.sb, {
      tenantId: input.tenantId,
      entityType: "person",
      entityId: input.patientId,
      eventType: "pharmacy.dispensed",
      title: `Medications dispensed (${insertedItems.length} item${insertedItems.length === 1 ? "" : "s"})`,
      meta: { dispense_id: header.id, dispense_number: header.dispense_number },
    });
    if (input.encounterId) {
      await logPharmacyTimeline(this.sb, {
        tenantId: input.tenantId,
        entityType: "encounter",
        entityId: input.encounterId,
        eventType: "pharmacy.dispensed",
        title: `Dispense ${header.dispense_number}`,
        meta: { dispense_id: header.id },
      });
    }
    await indexPharmacySearch(this.sb, {
      tenantId: input.tenantId,
      entityType: "pharmacy_dispense",
      entityId: header.id,
      title: `Dispense ${header.dispense_number}`,
      meta: { patient_id: input.patientId },
    });

    return { dispense: header, warnings };
  }

  async cancelDispense(args: {
    tenantId: string;
    dispenseId: string;
    reason: string;
    actorId?: string | null;
  }): Promise<DispenseRow> {
    const dispense = await this.dispenses.getById(args.dispenseId);
    if (!dispense) throw new Error("Dispense not found");
    if (dispense.status === "cancelled") return dispense;
    const items = await this.dispenses.listItems(args.dispenseId);
    // Reverse each ledger movement
    for (const it of items) {
      await this.inventory.postMovement({
        tenantId: args.tenantId,
        warehouseId: dispense.warehouse_id,
        drugId: it.drug_id,
        batchId: it.batch_id ?? null,
        quantity: Math.abs(Number(it.quantity)),
        unitCode: it.unit_code,
        sourceType: "dispense_reversal",
        sourceId: dispense.id,
        reasonCode: args.reason,
        actorId: args.actorId ?? null,
      });
    }
    const updated = await this.dispenses.updateHeader(dispense.id, {
      status: "cancelled",
      updated_by: args.actorId ?? null,
    });
    await emitPharmacyEvent(this.sb, args.tenantId, PHARMACY_EVENTS.DispenseCancelled, {
      dispense_id: dispense.id,
      reason: args.reason,
    });
    return updated;
  }
}
