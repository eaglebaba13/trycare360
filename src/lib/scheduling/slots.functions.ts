/**
 * Scheduling — Slot & availability server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  findSlotsSchema,
  checkAvailabilitySchema,
  holdSlotSchema,
  releaseHoldSchema,
  generateSlotsSchema,
} from "./validators";
import { SlotEngine } from "./slots.server";
import { ConflictEngine } from "./conflict.server";

export const findSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => findSlotsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SlotEngine(context.supabase);
    const slots = await engine.findSlots({
      tenantId: data.tenant_id,
      serviceId: data.service_id,
      branchId: data.branch_id ?? null,
      doctorId: data.doctor_id ?? null,
      resourceGroupId: data.resource_group_id ?? null,
      preferredResourceIds: data.preferred_resource_ids,
      from: data.from,
      to: data.to,
      durationMinutes: data.duration_minutes,
      limit: data.limit,
      respectCapacity: data.respect_capacity,
    });
    return { slots };
  });

export const checkAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => checkAvailabilitySchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SlotEngine(context.supabase);
    return engine.checkAvailability({
      tenantId: data.tenant_id,
      branchId: data.branch_id,
      doctorId: data.doctor_id ?? null,
      roomResourceId: data.room_resource_id ?? null,
      startsAt: data.starts_at,
      durationMinutes: data.duration_minutes,
    });
  });

export const holdSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => holdSlotSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ConflictEngine(context.supabase);
    const endsAt = data.ends_at;
    const resource =
      data.doctor_id ?? data.room_resource_id ?? data.resource_ids?.[0];
    if (!resource) throw new Error("Hold requires a resource");
    const hold = await engine.createHold({
      row: {
        tenant_id: data.tenant_id,
        branch_id: data.branch_id,
        resource_id: resource,
        starts_at: data.starts_at,
        ends_at: endsAt,
        expires_at: new Date(Date.now() + data.ttl_seconds * 1000).toISOString(),
        slot_key: `${data.branch_id}:${resource}:${data.starts_at}`,
        held_by: context.userId,
        status: "active",
        meta: {
          reason: data.hold_reason,
          context: data.booking_context ?? {},
        } as never,
      } as never,
    });
    return { hold };
  });

export const releaseHold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => releaseHoldSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ConflictEngine(context.supabase);
    await engine.releaseHold(data.hold_id);
    return { ok: true };
  });

export const generateSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => generateSlotsSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SlotEngine(context.supabase);
    return engine.generateSlots({
      tenantId: data.tenant_id,
      branchId: data.branch_id,
      resourceId: data.resource_id ?? null,
      from: data.from,
      to: data.to,
    });
  });
