/**
 * MedicationKitEngine — expand a bundle definition into component drugs
 * and reserve / commit / rollback them atomically.
 *
 * Atomicity: if any reservation fails, previously-created reservations
 * for the same expansion are released so the caller doesn't leak stock.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  MedicationKitRepository,
  type MedicationKitItemRow,
  type StockReservationRow,
} from "../repositories.server";
import { InventoryEngine } from "./inventory.engine.server";
import type { KitUpsertInput } from "../validators";

type SB = SupabaseClient<Database>;

export interface KitExpansion {
  kitId: string;
  items: Array<MedicationKitItemRow & { unit_multiplier?: number }>;
}

export class MedicationKitEngine {
  private readonly kits: MedicationKitRepository;
  private readonly inventory: InventoryEngine;

  constructor(private readonly sb: SB) {
    this.kits = new MedicationKitRepository(sb);
    this.inventory = new InventoryEngine(sb);
  }

  async upsertKit(input: KitUpsertInput, actorId: string | null) {
    const kit = await this.kits.upsertKit({
      id: input.id ?? undefined,
      tenant_id: input.tenantId,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      service_id: input.serviceId ?? null,
      is_active: input.isActive,
      created_by: actorId,
    });
    await this.kits.replaceItems(
      kit.id,
      input.tenantId,
      input.items.map((it) => ({
        tenant_id: input.tenantId,
        kit_id: kit.id,
        drug_id: it.drugId,
        quantity: it.quantity,
        unit_code: it.unitCode,
        is_mandatory: it.isMandatory,
        is_substitutable: it.isSubstitutable,
        notes: it.notes ?? null,
      })),
    );
    return kit;
  }

  async expand(kitId: string): Promise<KitExpansion> {
    const kit = await this.kits.getById(kitId);
    if (!kit) throw new Error("Kit not found");
    if (!kit.is_active) throw new Error("Kit is inactive");
    const items = await this.kits.listItems(kitId);
    return { kitId, items };
  }

  async reserveComponents(args: {
    tenantId: string;
    kitId: string;
    warehouseId: string;
    reservedForType: string;
    reservedForId?: string | null;
    actorId?: string | null;
  }): Promise<StockReservationRow[]> {
    const expansion = await this.expand(args.kitId);
    const created: StockReservationRow[] = [];
    try {
      for (const it of expansion.items) {
        const reservation = await this.inventory.reserveInventory({
          tenantId: args.tenantId,
          warehouseId: args.warehouseId,
          drugId: it.drug_id,
          quantity: Number(it.quantity),
          unitCode: it.unit_code,
          reservedForType: args.reservedForType,
          reservedForId: args.reservedForId ?? null,
          meta: { kit_id: args.kitId, kit_item_id: it.id },
          actorId: args.actorId ?? null,
        });
        created.push(reservation);
      }
      return created;
    } catch (err) {
      // Atomic rollback: release everything reserved in this expansion
      for (const r of created) {
        try {
          await this.inventory.releaseReservation(r.id);
        } catch (rollbackErr) {
          console.warn("[pharmacy.kit] rollback failed", rollbackErr);
        }
      }
      throw err;
    }
  }

  async releaseComponents(reservationIds: string[]) {
    for (const id of reservationIds) {
      await this.inventory.releaseReservation(id);
    }
  }
}
