/**
 * ForecastEngine — scenario-driven rolling forecasts. Pure numeric
 * projection; no journal side-effects.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ForecastRepository } from "../repositories.server";
import { emitFinanceEvent, writeFinanceAudit } from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import type { forecastCreateSchema } from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class ForecastEngine {
  private readonly forecasts: ForecastRepository;
  constructor(private readonly sb: SB) {
    this.forecasts = new ForecastRepository(sb);
  }

  async create(input: z.infer<typeof forecastCreateSchema>, actorId: string) {
    const row = await this.forecasts.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      fiscal_year_id: input.fiscalYearId ?? null,
      code: input.code,
      name: input.name,
      forecast_type: input.forecastType,
      horizon_months: input.horizonMonths,
      scenario: input.scenario,
      data_points: input.dataPoints as never,
      assumptions: (input.assumptions ?? {}) as never,
      generated_at: new Date().toISOString(),
      generated_by: actorId,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.ForecastGenerated, {
      forecastId: row.id,
      scenario: input.scenario,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "forecast",
      entityId: row.id,
      action: "generate",
      eventType: FINANCE_EVENTS.ForecastGenerated,
      actorId,
      after: row as never,
    });
    return row;
  }
}
