/**
 * Pharmacy — Controlled Drug Register server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ControlledDrugRepository } from "./repositories.server";
import { ControlledDrugEngine } from "./engines/controlled.engine.server";
import { controlledEntrySchema, controlledListSchema } from "./validators";

export const postControlledEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => controlledEntrySchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ControlledDrugEngine(context.supabase);
    return {
      row: await engine.postEntry({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId,
        drugId: data.drugId,
        batchId: data.batchId ?? null,
        scheduleCode: data.scheduleCode,
        entryType: data.entryType,
        quantityIn: data.quantityIn,
        quantityOut: data.quantityOut,
        unitCode: data.unitCode,
        patientId: data.patientId ?? null,
        prescriberId: data.prescriberId ?? null,
        dispensedBy: data.dispensedBy ?? context.userId,
        witnessId: data.witnessId,
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
        meta: data.meta ?? {},
      }),
    };
  });

export const flagControlledVariance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        warehouseId: z.string().uuid(),
        drugId: z.string().uuid(),
        countedQuantity: z.number().finite().min(0),
        notes: z.string().min(1),
        witnessId: z.string().uuid(),
        unitCode: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new ControlledDrugEngine(context.supabase);
    return {
      row: await engine.flagVariance({ ...data, actorId: context.userId }),
    };
  });

export const listControlledRegister = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => controlledListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ControlledDrugRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId ?? null,
        drugId: data.drugId ?? null,
        from: data.from ?? null,
        to: data.to ?? null,
        discrepancyOnly: data.discrepancyOnly,
        limit: data.limit,
      }),
    };
  });
