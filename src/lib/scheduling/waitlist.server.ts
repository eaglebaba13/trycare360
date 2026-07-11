/**
 * Scheduling — Waitlist Engine (server-only).
 *
 * When capacity opens (a cancellation, a schedule extension, an override),
 * `findCandidate()` pulls the top prioritized waitlist entries whose
 * preferences match the freed slot. `offerSlot()` records an offer with
 * a TTL and emits `waitlist.offer_sent`. Accept/decline/expire update
 * the offer + waitlist state.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { WaitlistRepository } from "./repositories.server";
import { WAITLIST_EVENTS } from "./events";

type SB = SupabaseClient<Database>;

export class WaitlistEngine {
  private readonly repo: WaitlistRepository;
  constructor(private readonly sb: SB) {
    this.repo = new WaitlistRepository(sb);
  }

  async findCandidate(args: {
    tenantId: string;
    branchId: string;
    serviceId: string;
    startsAt: string;
    endsAt: string;
    doctorId?: string | null;
    limit?: number;
  }) {
    return this.repo.findCandidates(args);
  }

  async offerSlot(args: {
    tenantId: string;
    waitlistId: string;
    slotStartsAt: string;
    slotEndsAt: string;
    branchId: string;
    doctorId?: string | null;
    ttlSeconds?: number;
    channel?: string;
  }) {
    const ttl = args.ttlSeconds ?? 1800;
    const offer = await this.repo.offer({
      tenant_id: args.tenantId,
      waitlist_id: args.waitlistId,
      slot_starts_at: args.slotStartsAt,
      slot_ends_at: args.slotEndsAt,
      branch_id: args.branchId,
      doctor_id: args.doctorId ?? null,
      expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
      status: "sent",
      channel: args.channel ?? "sms",
    } as never);
    await this.repo.setWaitlistStatus(args.waitlistId, "notified");
    await this.sb.rpc("emit_automation_event", {
      _tenant_id: args.tenantId,
      _event_type: WAITLIST_EVENTS.OFFER_SENT,
      _payload: {
        offer_id: offer.id,
        waitlist_id: args.waitlistId,
        slot_starts_at: args.slotStartsAt,
        slot_ends_at: args.slotEndsAt,
        channel: args.channel ?? "sms",
      } as never,
      _entity_ref: { type: "waitlist_offer", id: offer.id } as never,
    });
    return offer;
  }

  async expireOffer(args: { tenantId: string; offerId: string }) {
    const offer = await this.repo.getOffer(args.offerId);
    if (!offer) return null;
    const updated = await this.repo.updateOffer(args.offerId, {
      status: "expired",
    });
    await this.repo.setWaitlistStatus(offer.waitlist_id as string, "active");
    return updated;
  }

  async acceptOffer(args: { tenantId: string; offerId: string; appointmentId: string }) {
    const offer = await this.repo.updateOffer(args.offerId, {
      status: "accepted",
    });
    await this.repo.setWaitlistStatus(offer.waitlist_id as string, "converted");
    return offer;
  }

  async declineOffer(args: { tenantId: string; offerId: string; reason?: string | null }) {
    const offer = await this.repo.updateOffer(args.offerId, {
      status: "declined",
    });
    await this.repo.setWaitlistStatus(offer.waitlist_id as string, "active");
    return offer;
  }
}
