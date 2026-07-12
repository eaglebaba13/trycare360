/**
 * ForecastEngine — Stage 2 delivers INTERFACES ONLY.
 *
 * The actual forecast implementation (statistical baselines, AI-assisted
 * reorder suggestions, seasonal multipliers) is scheduled for Stage 5/6
 * per the Phase 2.6 Blueprint. This module provides:
 *   - a stable interface for callers,
 *   - a no-op default implementation that reads existing forecast rows,
 *   - the persistence primitive for future model outputs.
 *
 * When Stage 5 lands, swap the default implementation without touching
 * any callers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ForecastRepository, type ForecastRow } from "../repositories.server";

type SB = SupabaseClient<Database>;

export interface ForecastRequest {
  tenantId: string;
  warehouseId?: string | null;
  drugId: string;
  horizonDays: number;
}

export interface ForecastOutput {
  predictedDemand: number;
  confidenceLower: number | null;
  confidenceUpper: number | null;
  model: string;
  modelVersion: string;
  inputs: Record<string, unknown>;
}

export interface ReorderSuggestion {
  drugId: string;
  warehouseId: string;
  suggestedQuantity: number;
  reason: string;
  supplierId?: string | null;
}

/**
 * Contract the analytics/AI layer will implement in Stage 5/6.
 */
export interface ForecastProvider {
  forecast(req: ForecastRequest): Promise<ForecastOutput>;
  suggestReorder(args: {
    tenantId: string;
    warehouseId: string;
  }): Promise<ReorderSuggestion[]>;
}

export class ForecastEngine {
  private readonly repo: ForecastRepository;
  private readonly provider: ForecastProvider | null;

  constructor(private readonly sb: SB, provider: ForecastProvider | null = null) {
    this.repo = new ForecastRepository(sb);
    this.provider = provider;
  }

  async generateForecast(req: ForecastRequest, actorId: string | null): Promise<ForecastRow> {
    const output = this.provider
      ? await this.provider.forecast(req)
      : {
          predictedDemand: 0,
          confidenceLower: null,
          confidenceUpper: null,
          model: "noop",
          modelVersion: "stage-2",
          inputs: { note: "ForecastProvider not yet wired — Stage 5/6 delivery" },
        };
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + req.horizonDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return this.repo.insert({
      tenant_id: req.tenantId,
      warehouse_id: req.warehouseId ?? null,
      drug_id: req.drugId,
      horizon_days: req.horizonDays,
      forecast_from: from,
      forecast_to: to,
      predicted_demand: output.predictedDemand,
      confidence_lower: output.confidenceLower,
      confidence_upper: output.confidenceUpper,
      model: output.model,
      model_version: output.modelVersion,
      inputs: output.inputs as never,
      created_by: actorId,
    });
  }

  async listForecasts(args: {
    tenantId: string;
    warehouseId?: string | null;
    drugId?: string | null;
    limit?: number;
  }): Promise<ForecastRow[]> {
    return this.repo.list(args);
  }

  async suggestReorder(args: {
    tenantId: string;
    warehouseId: string;
  }): Promise<ReorderSuggestion[]> {
    if (!this.provider) return [];
    return this.provider.suggestReorder(args);
  }
}
