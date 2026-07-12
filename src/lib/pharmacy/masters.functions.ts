/**
 * Pharmacy — Masters server functions (drugs, kits).
 *
 * Reuses:
 *   - requireSupabaseAuth (RLS scopes tenant + role)
 *   - Zod validators (../validators)
 *   - Repositories / Kit engine (../repositories.server, ../engines/*)
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DrugMasterRepository,
  MedicationKitRepository,
} from "./repositories.server";
import { MedicationKitEngine } from "./engines/kit.engine.server";
import {
  drugListSchema,
  drugUpsertSchema,
  kitExpandSchema,
  kitUpsertSchema,
} from "./validators";
import { z } from "zod";

export const listDrugs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => drugListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new DrugMasterRepository(context.supabase);
    const rows = await repo.list({
      tenantId: data.tenantId ?? null,
      search: data.search,
      activeOnly: data.activeOnly,
      requiresPrescription: data.requiresPrescription,
      controlledOnly: data.controlledOnly,
      limit: data.limit,
    });
    return { rows };
  });

export const upsertDrug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => drugUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new DrugMasterRepository(context.supabase);
    const payload = {
      id: data.id ?? undefined,
      tenant_id: data.tenantId ?? null,
      code: data.code,
      name: data.name,
      generic_name: data.genericName ?? null,
      brand_name: data.brandName ?? null,
      strength: data.strength ?? null,
      strength_value: data.strengthValue ?? null,
      strength_unit_code: data.strengthUnitCode ?? null,
      form_code: data.formCode ?? null,
      base_unit_code: data.baseUnitCode,
      pack_size: data.packSize ?? null,
      pack_unit_code: data.packUnitCode ?? null,
      category_code: data.categoryCode ?? null,
      controlled_schedule_code: data.controlledScheduleCode ?? null,
      storage_condition_code: data.storageConditionCode ?? null,
      is_cold_chain: data.isColdChain,
      requires_prescription: data.requiresPrescription,
      hsn_code: data.hsnCode ?? null,
      atc_code: data.atcCode ?? null,
      barcode: data.barcode ?? null,
      manufacturer: data.manufacturer ?? null,
      is_active: data.isActive,
      updated_by: context.userId,
      created_by: context.userId,
      meta: (data.meta ?? {}) as never,
    };
    const row = data.id ? await repo.update(data.id, payload) : await repo.insert(payload);
    return { drug: row };
  });

export const listMedicationKits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), activeOnly: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new MedicationKitRepository(context.supabase);
    return { rows: await repo.list({ tenantId: data.tenantId, activeOnly: data.activeOnly }) };
  });

export const upsertMedicationKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => kitUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MedicationKitEngine(context.supabase);
    return { kit: await engine.upsertKit(data, context.userId) };
  });

export const expandMedicationKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => kitExpandSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new MedicationKitEngine(context.supabase);
    return engine.expand(data.kitId);
  });
