/**
 * Scheduling — Recurrence, Packages, Policy, Capacity server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  materializeRecurrenceSchema,
  createPackageSequenceSchema,
  validateDependenciesSchema,
  evaluatePolicyContextSchema,
  capacityCheckSchema,
} from "./validators";
import { RecurrenceEngine } from "./recurrence.server";
import { PackageEngine } from "./packages.server";
import { SchedulingPolicyEngine } from "./policy.server";
import { CapacityEngine } from "./capacity.server";

export const materializeRecurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => materializeRecurrenceSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RecurrenceEngine(context.supabase);
    return engine.materializeRecurrence({
      tenantId: data.tenant_id,
      seriesId: data.series_id,
      horizonDays: data.horizon_days,
    });
  });

export const createPackageSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createPackageSequenceSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PackageEngine(context.supabase);
    return engine.createPackageSequence({
      tenantId: data.tenant_id,
      personId: data.person_id,
      packagePlanId: data.package_plan_id,
      branchId: data.branch_id,
      doctorId: data.doctor_id ?? null,
      startDate: data.start_date,
      meta: data.meta,
    });
  });

export const validateServiceDependencies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => validateDependenciesSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PackageEngine(context.supabase);
    return engine.validateDependencies({
      tenantId: data.tenant_id,
      personId: data.person_id,
      serviceId: data.service_id,
      startsAt: data.starts_at,
    });
  });

export const evaluateSchedulingPolicies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => evaluatePolicyContextSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SchedulingPolicyEngine(context.supabase);
    return engine.evaluate(data);
  });

export const checkSchedulingCapacity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => capacityCheckSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new CapacityEngine(context.supabase);
    return engine.checkCapacity({
      tenantId: data.tenant_id,
      branchId: data.branch_id,
      dimensionCode: data.dimension_code,
      bucketStart: data.bucket_start,
      bucketEnd: data.bucket_end,
      unitsRequired: data.units_required,
    });
  });
