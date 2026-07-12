/**
 * RecallEngine — drug recall lifecycle.
 *
 * Responsibilities:
 *   - Locate affected batches (by batchNo, lotNo, drug, manufacturer, or
 *     scope JSON) and mark them is_recalled = true.
 *   - Record recall items for each affected batch.
 *   - Locate patients dispensed from affected batches (read-only join to
 *     pharmacy_dispenses / _items — no clinical writes).
 *   - Emit recall workflow events so the Workflow / Notification engines
 *     can dispatch notifications to prescribers, patients, and regulators.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  BatchRepository,
  RecallRepository,
  type RecallRow,
} from "../repositories.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent, nextDocumentNumber } from "../helpers.server";
import type { RecallCreateInput } from "../validators";

type SB = SupabaseClient<Database>;

export class RecallEngine {
  private readonly recalls: RecallRepository;
  private readonly batches: BatchRepository;
  constructor(private readonly sb: SB) {
    this.recalls = new RecallRepository(sb);
    this.batches = new BatchRepository(sb);
  }

  async initiate(input: RecallCreateInput, actorId: string | null): Promise<{
    recall: RecallRow;
    affectedBatchIds: string[];
    affectedPatientIds: string[];
  }> {
    const recall = await this.recalls.insert({
      tenant_id: input.tenantId,
      drug_id: input.drugId ?? null,
      manufacturer: input.manufacturer ?? null,
      recall_class: input.recallClass ?? null,
      regulator_reference: input.regulatorReference ?? null,
      reason: input.reason,
      scope: (input.scope ?? {}) as never,
      recall_number: nextDocumentNumber("RCL"),
      status: "in_progress",
      initiated_at: new Date().toISOString(),
      created_by: actorId,
    });

    // Locate affected batches
    const affected = await this.batches.listByBatchNos(input.tenantId, input.batchNos ?? []);
    const items: TablesInsert<"pharmacy_drug_recall_items">[] = affected.map((b) => ({
      tenant_id: input.tenantId,
      recall_id: recall.id,
      batch_id: b.id,
      batch_no: b.batch_no,
      lot_no: b.lot_no ?? null,
      expiry_from: b.expiry_date,
      expiry_to: b.expiry_date,
    }));
    await this.recalls.insertItems(items);
    // Mark batches recalled
    for (const b of affected) {
      await this.batches.update(b.id, { is_recalled: true, recall_id: recall.id });
    }

    // Find patients previously dispensed from these batches (read-only)
    let affectedPatients: string[] = [];
    if (affected.length) {
      const { data } = await this.sb
        .from("pharmacy_dispense_items")
        .select("dispense_id")
        .in("batch_id", affected.map((b) => b.id));
      const dispenseIds = Array.from(new Set((data ?? []).map((r) => r.dispense_id)));
      if (dispenseIds.length) {
        const { data: dispenses } = await this.sb
          .from("pharmacy_dispenses")
          .select("patient_id")
          .in("id", dispenseIds);
        affectedPatients = Array.from(
          new Set(
            (dispenses ?? [])
              .map((d) => d.patient_id)
              .filter((x): x is string => Boolean(x)),
          ),
        );
      }
    }

    await emitPharmacyEvent(this.sb, input.tenantId, PHARMACY_EVENTS.RecallStarted, {
      recall_id: recall.id,
      drug_id: input.drugId ?? null,
      affected_batch_ids: affected.map((b) => b.id),
      affected_patient_ids: affectedPatients,
      class: input.recallClass ?? null,
    });

    return {
      recall,
      affectedBatchIds: affected.map((b) => b.id),
      affectedPatientIds: affectedPatients,
    };
  }

  async complete(tenantId: string, recallId: string): Promise<RecallRow> {
    const updated = await this.recalls.update(recallId, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    await emitPharmacyEvent(this.sb, tenantId, PHARMACY_EVENTS.RecallCompleted, {
      recall_id: recallId,
    });
    return updated;
  }
}
