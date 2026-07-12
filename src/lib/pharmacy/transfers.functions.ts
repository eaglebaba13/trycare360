/**
 * Pharmacy — Warehouse transfer server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WarehouseEngine } from "./engines/warehouse.engine.server";
import { TransferRepository } from "./repositories.server";
import { transferSchema } from "./validators";

export const createTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => transferSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WarehouseEngine(context.supabase);
    return {
      transfer: await engine.createTransfer({
        tenantId: data.tenantId,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        transferDate: data.transferDate ?? null,
        notes: data.notes ?? null,
        items: data.items,
        actorId: context.userId,
      }),
    };
  });

export const receiveTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), transferId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new WarehouseEngine(context.supabase);
    return {
      transfer: await engine.receiveTransfer({
        tenantId: data.tenantId,
        transferId: data.transferId,
        actorId: context.userId,
      }),
    };
  });

export const listTransfers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new TransferRepository(context.supabase);
    return { rows: await repo.list({ tenantId: data.tenantId, limit: data.limit }) };
  });
