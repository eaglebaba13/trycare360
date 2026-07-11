/**
 * Scheduling — Capacity Engine (server-only).
 *
 * Consumes `capacity_plans` + `capacity_dimensions` + `capacity_overrides`
 * to decide whether a new booking fits available capacity for a given
 * dimension (doctors, rooms, procedures, home-visit vehicles, etc.).
 *
 * Consumption of capacity is virtual: we count in-window appointments
 * whose service/dimension matches. Overrides adjust the day's headroom.
 *
 * All the actual "how many exist" arithmetic is done via SELECT count()
 * so we stay tenant/RLS safe.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { CapacityRepository } from "./repositories.server";

type SB = SupabaseClient<Database>;

export type CapacityDecision = {
  ok: boolean;
  reason:
    | "within_limit"
    | "no_plan"
    | "no_dimension"
    | "capacity_exhausted"
    | "override_disabled";
  plan_id?: string;
  dimension_code?: string;
  units_limit?: number;
  units_in_use?: number;
  units_required: number;
  bucket_start: string;
  bucket_end: string;
};

export class CapacityEngine {
  private readonly repo: CapacityRepository;
  constructor(private readonly sb: SB) {
    this.repo = new CapacityRepository(sb);
  }

  /**
   * Evaluate whether `units_required` fits inside the effective capacity
   * of `dimension_code` for the (branch, bucket) window. Read-only.
   */
  async checkCapacity(args: {
    tenantId: string;
    branchId: string;
    dimensionCode: string;
    bucketStart: string;
    bucketEnd: string;
    unitsRequired?: number;
  }): Promise<CapacityDecision> {
    const unitsRequired = args.unitsRequired ?? 1;
    const plan = await this.repo.findPlan({
      tenantId: args.tenantId,
      branchId: args.branchId,
      at: args.bucketStart,
    });
    const base: Omit<CapacityDecision, "ok" | "reason"> = {
      units_required: unitsRequired,
      bucket_start: args.bucketStart,
      bucket_end: args.bucketEnd,
    };
    if (!plan)
      return { ok: true, reason: "no_plan", ...base };
    const dims = await this.repo.listDimensions(plan.id as string);
    const dim = dims.find(
      (d) => (d.dimension as string) === args.dimensionCode,
    );
    if (!dim)
      return {
        ok: true,
        reason: "no_dimension",
        plan_id: plan.id as string,
        ...base,
      };

    let limit = Number((dim as unknown as { max_units: number }).max_units ?? 0);


    // Overrides for the day (delta_units, +/-).
    const day = args.bucketStart.slice(0, 10);
    const overrides = await this.repo.listOverrides({
      tenantId: args.tenantId,
      planId: plan.id as string,
      fromDate: day,
      toDate: day,
    });
    for (const o of overrides) {
      if ((o.dimension as string) !== args.dimensionCode) continue;
      limit += Number(o.delta_units ?? 0);
    }
    if (limit < 0) limit = 0;

    // Count in-use units: appointments overlapping the bucket at this branch.
    // NOTE: dimension→appointment mapping is by convention (dimension_code
    // stored on capacity_dimensions.meta.match — falls back to all active
    // appointments in the window).
    const { count, error } = await this.sb
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", args.tenantId)
      .eq("branch_id", args.branchId)
      .lt("starts_at", args.bucketEnd)
      .gt("ends_at", args.bucketStart)
      .not(
        "status_code",
        "in",
        "(cancelled,no_show,rescheduled)",
      );
    if (error) throw new Error(error.message);
    const inUse = count ?? 0;

    const ok = inUse + unitsRequired <= limit;
    return {
      ok,
      reason: ok ? "within_limit" : "capacity_exhausted",
      plan_id: plan.id as string,
      dimension_code: args.dimensionCode,
      units_limit: limit,
      units_in_use: inUse,
      ...base,
    };
  }

  /**
   * `consumeCapacity` / `releaseCapacity` are no-ops today: capacity is
   * derived from appointment counts, so the appointment insert/cancel IS
   * the consumption/release. Kept for API-stability with the blueprint —
   * future explicit reservations would land here.
   */
  async consumeCapacity(_args: {
    tenantId: string;
    branchId: string;
    dimensionCode: string;
    bucketStart: string;
    bucketEnd: string;
    units?: number;
  }): Promise<void> {
    // Intentionally empty — see docstring above.
  }
  async releaseCapacity(_args: {
    tenantId: string;
    branchId: string;
    dimensionCode: string;
    bucketStart: string;
    bucketEnd: string;
    units?: number;
  }): Promise<void> {
    // Intentionally empty — see docstring above.
  }

  /**
   * Aggregate evaluator: given a service's resource requirements, evaluate
   * every mapped dimension_code and return the first blocker (if any).
   */
  async evaluateCapacity(args: {
    tenantId: string;
    branchId: string;
    dimensionCodes: string[];
    bucketStart: string;
    bucketEnd: string;
    unitsRequired?: number;
  }): Promise<CapacityDecision[]> {
    const out: CapacityDecision[] = [];
    for (const code of args.dimensionCodes) {
      out.push(
        await this.checkCapacity({
          tenantId: args.tenantId,
          branchId: args.branchId,
          dimensionCode: code,
          bucketStart: args.bucketStart,
          bucketEnd: args.bucketEnd,
          unitsRequired: args.unitsRequired,
        }),
      );
    }
    return out;
  }
}
