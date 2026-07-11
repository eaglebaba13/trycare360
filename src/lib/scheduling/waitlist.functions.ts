/**
 * Scheduling — Waitlist server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  waitlistFindSchema,
  waitlistOfferSchema,
  waitlistOfferIdSchema,
} from "./validators";
import { WaitlistEngine } from "./waitlist.server";

export const findWaitlistCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => waitlistFindSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WaitlistEngine(context.supabase);
    const candidates = await engine.findCandidate({
      tenantId: data.tenant_id,
      branchId: data.branch_id,
      serviceId: data.service_id,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
      doctorId: data.doctor_id ?? null,
      limit: data.limit,
    });
    return { candidates };
  });

export const offerWaitlistSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => waitlistOfferSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WaitlistEngine(context.supabase);
    const offer = await engine.offerSlot({
      tenantId: data.tenant_id,
      waitlistId: data.waitlist_id,
      slotStartsAt: data.slot_starts_at,
      slotEndsAt: data.slot_ends_at,
      branchId: data.branch_id,
      doctorId: data.doctor_id ?? null,
      ttlSeconds: data.ttl_seconds,
      channel: data.channel,
    });
    return { offer };
  });

export const expireWaitlistOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => waitlistOfferIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WaitlistEngine(context.supabase);
    return {
      offer: await engine.expireOffer({
        tenantId: data.tenant_id,
        offerId: data.offer_id,
      }),
    };
  });


export const acceptWaitlistOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    waitlistOfferIdSchema
      .extend({ appointment_id: waitlistOfferIdSchema.shape.offer_id })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new WaitlistEngine(context.supabase);
    return {
      offer: await engine.acceptOffer({
        tenantId: data.tenant_id,
        offerId: data.offer_id,
        appointmentId: data.appointment_id,
      }),
    };
  });

export const declineWaitlistOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => waitlistOfferIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WaitlistEngine(context.supabase);
    return {
      offer: await engine.declineOffer({
        tenantId: data.tenant_id,
        offerId: data.offer_id,
      }),
    };
  });
