/**
 * Forecast server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { forecastCreateSchema, forecastListSchema } from "./validators";
import { ForecastEngine } from "./engines/forecast.engine.server";
import { ForecastRepository } from "./repositories.server";

export const createForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => forecastCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ForecastEngine(context.supabase);
    return { forecast: await engine.create(data, context.userId) };
  });

export const listForecasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => forecastListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new ForecastRepository(context.supabase);
    return { rows: await repo.list(data) };
  });
