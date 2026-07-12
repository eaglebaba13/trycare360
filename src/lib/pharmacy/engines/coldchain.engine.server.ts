/**
 * ColdChainEngine — cold-chain temperature validation and excursion
 * quarantine recommendations.
 *
 * Excursion detection uses the warehouse_locations.temperature_min_c /
 * max_c thresholds when a location is provided, else falls back to the
 * caller-supplied threshold JSON.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ColdChainRepository, type ColdChainRow } from "../repositories.server";
import { PHARMACY_EVENTS } from "../events";
import { emitPharmacyEvent } from "../helpers.server";
import type { ColdChainLogInput } from "../validators";

type SB = SupabaseClient<Database>;

export class ColdChainEngine {
  private readonly repo: ColdChainRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ColdChainRepository(sb);
  }

  private async resolveThreshold(locationId: string | null | undefined): Promise<{
    min: number | null;
    max: number | null;
  }> {
    if (!locationId) return { min: 2, max: 8 };
    const { data } = await this.sb
      .from("pharmacy_warehouse_locations")
      .select("temperature_min_c, temperature_max_c")
      .eq("id", locationId)
      .maybeSingle();
    return {
      min: data?.temperature_min_c ?? null,
      max: data?.temperature_max_c ?? null,
    };
  }

  async recordReading(input: ColdChainLogInput, actorId: string | null): Promise<ColdChainRow> {
    const th = await this.resolveThreshold(input.locationId ?? null);
    const excursion =
      (th.min !== null && input.temperatureC < th.min) ||
      (th.max !== null && input.temperatureC > th.max);
    const quarantineTriggered = excursion; // recommendation flag — actual quarantine done via BatchEngine
    const row = await this.repo.insert({
      tenant_id: input.tenantId,
      warehouse_id: input.warehouseId,
      location_id: input.locationId ?? null,
      device_id: input.deviceId ?? null,
      temperature_c: input.temperatureC,
      humidity_percent: input.humidityPercent ?? null,
      reading_at: input.readingAt ?? new Date().toISOString(),
      source: input.source,
      is_excursion: excursion,
      quarantine_triggered: quarantineTriggered,
      excursion_threshold: (th as unknown) as never,
      created_by: actorId,
      meta: (input.meta ?? {}) as never,
    });
    if (excursion) {
      await emitPharmacyEvent(this.sb, input.tenantId, PHARMACY_EVENTS.ColdChainBreach, {
        reading_id: row.id,
        warehouse_id: input.warehouseId,
        location_id: input.locationId ?? null,
        temperature_c: input.temperatureC,
        threshold: th,
      });
    }
    return row;
  }
}
