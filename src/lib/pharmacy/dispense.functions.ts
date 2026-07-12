/**
 * Pharmacy — Dispense server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DispenseEngine } from "./engines/dispense.engine.server";
import { DispenseRepository } from "./repositories.server";
import {
  dispenseCreateSchema,
  dispenseIdSchema,
  dispenseListSchema,
} from "./validators";

export const createDispense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dispenseCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new DispenseEngine(context.supabase);
    return engine.createDispense(data, context.userId);
  });

export const cancelDispense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    dispenseIdSchema.extend({ reason: z.string().min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new DispenseEngine(context.supabase);
    return {
      dispense: await engine.cancelDispense({
        tenantId: data.tenantId,
        dispenseId: data.dispenseId,
        reason: data.reason,
        actorId: context.userId,
      }),
    };
  });

export const listDispenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dispenseListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new DispenseRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        patientId: data.patientId ?? null,
        encounterId: data.encounterId ?? null,
        warehouseId: data.warehouseId ?? null,
        status: data.status ?? null,
        limit: data.limit,
      }),
    };
  });

export const getDispense = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dispenseIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new DispenseRepository(context.supabase);
    const dispense = await repo.getById(data.dispenseId);
    if (!dispense || dispense.tenant_id !== data.tenantId) throw new Error("Not found");
    const items = await repo.listItems(dispense.id);
    return { dispense, items };
  });
