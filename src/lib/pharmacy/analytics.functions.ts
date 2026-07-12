/**
 * Pharmacy — Analytics + Forecast server functions (server-side only).
 *
 * These are read-oriented signals that Stage 6 dashboards will consume.
 * No dashboards or reports are shipped here — Stage 2 delivers server
 * primitives only. All heavy analytics live in the platform Analytics
 * Engine; this file exposes pharmacy-specific windows.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BatchEngine } from "./engines/batch.engine.server";
import { ForecastEngine } from "./engines/forecast.engine.server";
import { analyticsWindowSchema, forecastListSchema } from "./validators";

export const listNearExpiryBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenantId: z.string().uuid(),
        withinDays: z.number().int().min(1).max(720).default(90),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new BatchEngine(context.supabase);
    return { rows: await engine.listNearExpiry(data.tenantId, data.withinDays) };
  });

export const listForecasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => forecastListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ForecastEngine(context.supabase);
    return {
      rows: await engine.listForecasts({
        tenantId: data.tenantId,
        warehouseId: data.warehouseId ?? null,
        drugId: data.drugId ?? null,
        limit: data.limit,
      }),
    };
  });

export const inventoryAnalyticsSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => analyticsWindowSchema.parse(d))
  .handler(async ({ context, data }) => {
    // Snapshot: totals for stock on hand + reserved.
    const { data: rows, error } = await context.supabase
      .from("pharmacy_stock_on_hand")
      .select("quantity_on_hand, quantity_reserved, warehouse_id")
      .eq("tenant_id", data.tenantId);
    if (error) throw new Error(error.message);
    const totals = (rows ?? []).reduce(
      (acc, r) => {
        acc.onHand += Number(r.quantity_on_hand ?? 0);
        acc.reserved += Number(r.quantity_reserved ?? 0);
        return acc;
      },
      { onHand: 0, reserved: 0 },
    );
    return { totals, rowCount: rows?.length ?? 0 };
  });
