/**
 * ControlledDrugEngine — controlled-substance register.
 *
 * Enforces witness presence, running balance calculation, variance
 * detection, and immutability (Stage 1 DB trigger also blocks
 * UPDATE/DELETE for non-admins).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  ControlledDrugRepository,
  type ControlledRegisterRow,
} from "../repositories.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent } from "../helpers.server";

type SB = SupabaseClient<Database>;

export interface ControlledEntryArgs {
  tenantId: string;
  warehouseId: string;
  drugId: string;
  batchId?: string | null;
  scheduleCode?: string | null;
  entryType: string;
  quantityIn?: number;
  quantityOut?: number;
  unitCode: string;
  patientId?: string | null;
  prescriberId?: string | null;
  dispensedBy?: string | null;
  witnessId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  meta?: Record<string, unknown>;
}

export class ControlledDrugEngine {
  private readonly repo: ControlledDrugRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ControlledDrugRepository(sb);
  }

  private async lookupScheduleCode(drugId: string): Promise<string> {
    const { data } = await this.sb
      .from("pharmacy_drugs")
      .select("controlled_schedule_code")
      .eq("id", drugId)
      .maybeSingle();
    return data?.controlled_schedule_code ?? "UNSCHEDULED";
  }

  async postEntry(args: ControlledEntryArgs): Promise<ControlledRegisterRow> {
    const qIn = args.quantityIn ?? 0;
    const qOut = args.quantityOut ?? 0;
    if (qIn <= 0 && qOut <= 0) throw new Error("Controlled entry requires quantityIn or quantityOut");
    if (qOut > 0 && !args.witnessId)
      throw new Error("Controlled dispense requires a witness_id");

    const scheduleCode = args.scheduleCode ?? (await this.lookupScheduleCode(args.drugId));
    const prev = await this.repo.latestBalance({
      tenantId: args.tenantId,
      warehouseId: args.warehouseId,
      drugId: args.drugId,
    });
    const prevBalance = Number(prev?.balance_after ?? 0);
    const balanceAfter = prevBalance + qIn - qOut;
    if (balanceAfter < 0)
      throw new Error(
        `Controlled register underflow: prev=${prevBalance}, in=${qIn}, out=${qOut}`,
      );

    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      warehouse_id: args.warehouseId,
      drug_id: args.drugId,
      batch_id: args.batchId ?? null,
      schedule_code: scheduleCode,
      entry_type: args.entryType,
      quantity_in: qIn,
      quantity_out: qOut,
      balance_after: balanceAfter,
      unit_code: args.unitCode,
      patient_id: args.patientId ?? null,
      prescriber_id: args.prescriberId ?? null,
      dispensed_by: args.dispensedBy ?? null,
      witness_id: args.witnessId ?? null,
      reference_type: args.referenceType ?? null,
      reference_id: args.referenceId ?? null,
      occurred_at: new Date().toISOString(),
      meta: (args.meta ?? {}) as never,
    });
    if (qOut > 0) {
      await emitPharmacyEvent(this.sb, args.tenantId, PHARMACY_EVENTS.ControlledDispensed, {
        register_id: row.id,
        drug_id: args.drugId,
        warehouse_id: args.warehouseId,
        schedule_code: scheduleCode,
        balance_after: balanceAfter,
      });
    }
    return row;
  }

  async recordDispense(args: {
    tenantId: string;
    warehouseId: string;
    drugId: string;
    batchId?: string | null;
    quantityOut: number;
    unitCode: string;
    patientId?: string | null;
    prescriberId?: string | null;
    dispensedBy?: string | null;
    witnessId?: string | null;
    referenceType: string;
    referenceId: string;
  }): Promise<ControlledRegisterRow> {
    return this.postEntry({
      ...args,
      entryType: "dispense",
      quantityOut: args.quantityOut,
    });
  }

  async flagVariance(args: {
    tenantId: string;
    warehouseId: string;
    drugId: string;
    countedQuantity: number;
    notes: string;
    witnessId: string;
    unitCode: string;
    actorId?: string | null;
  }): Promise<ControlledRegisterRow> {
    const prev = await this.repo.latestBalance({
      tenantId: args.tenantId,
      warehouseId: args.warehouseId,
      drugId: args.drugId,
    });
    const expected = Number(prev?.balance_after ?? 0);
    const delta = args.countedQuantity - expected;
    const row = await this.repo.insert({
      tenant_id: args.tenantId,
      warehouse_id: args.warehouseId,
      drug_id: args.drugId,
      schedule_code: await this.lookupScheduleCode(args.drugId),
      entry_type: "adjustment",
      quantity_in: delta > 0 ? delta : 0,
      quantity_out: delta < 0 ? -delta : 0,
      balance_after: args.countedQuantity,
      unit_code: args.unitCode,
      witness_id: args.witnessId,
      discrepancy_flag: delta !== 0,
      discrepancy_notes: args.notes,
      occurred_at: new Date().toISOString(),
      created_by: args.actorId ?? null,
      meta: {} as never,
    });
    if (delta !== 0) {
      await emitPharmacyEvent(this.sb, args.tenantId, PHARMACY_EVENTS.ControlledDiscrepancy, {
        register_id: row.id,
        drug_id: args.drugId,
        warehouse_id: args.warehouseId,
        expected,
        counted: args.countedQuantity,
        delta,
      });
    }
    return row;
  }
}
