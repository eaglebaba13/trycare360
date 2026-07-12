/**
 * Pharmacy — Cold Chain server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ColdChainRepository } from "./repositories.server";
import { ColdChainEngine } from "./engines/coldchain.engine.server";
import { coldChainListSchema, coldChainLogSchema } from "./validators";

export const recordColdChainReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => coldChainLogSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ColdChainEngine(context.supabase);
    return { row: await engine.recordReading(data, context.userId) };
  });

export const listColdChainReadings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => coldChainListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ColdChainRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId ?? null,
        locationId: data.locationId ?? null,
        excursionOnly: data.excursionOnly,
        from: data.from ?? null,
        to: data.to ?? null,
        limit: data.limit,
      }),
    };
  });
