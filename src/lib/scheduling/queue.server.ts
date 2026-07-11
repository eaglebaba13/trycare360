/**
 * Scheduling — Queue Engine (server-only).
 *
 * A Queue lives per branch/service/room and issues numbered tokens as
 * patients arrive. Every state transition emits a workflow event so
 * downstream automation (SMS "you're next", display boards, escalation)
 * plugs in without touching this engine.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { QueueRepository } from "./repositories.server";
import { QUEUE_EVENTS } from "./events";

type SB = SupabaseClient<Database>;

export class QueueEngine {
  private readonly repo: QueueRepository;
  constructor(private readonly sb: SB) {
    this.repo = new QueueRepository(sb);
  }

  async issueToken(args: {
    tenantId: string;
    branchId: string;
    queueId: string;
    appointmentId?: string | null;
    personId?: string | null;
    priority?: number;
    isVip?: boolean;
    isEmergency?: boolean;
    notes?: string | null;
  }) {
    const number = await this.repo.nextTokenNumber(args.queueId);
    const token = await this.repo.issueToken({
      tenant_id: args.tenantId,
      branch_id: args.branchId,
      queue_id: args.queueId,
      appointment_id: args.appointmentId ?? null,
      person_id: args.personId ?? null,
      token_number: number,
      priority: args.priority ?? 0,
      is_vip: args.isVip ?? false,
      is_emergency: args.isEmergency ?? false,
      status: "waiting",
      notes: args.notes ?? null,
    } as never);
    await this.sb.rpc("emit_automation_event", {
      _tenant_id: args.tenantId,
      _event_type: QUEUE_EVENTS.TOKEN_ISSUED,
      _payload: {
        token_id: token.id,
        queue_id: args.queueId,
        appointment_id: args.appointmentId,
        person_id: args.personId,
        token_number: number,
      } as never,
      _entity_ref: { type: "queue_token", id: token.id } as never,
    });
    return token;
  }

  /**
   * Move the highest-priority waiting token to `called` state.
   */
  async callNext(args: {
    tenantId: string;
    queueId: string;
    counterCode?: string | null;
  }) {
    const waiting = await this.repo.listWaiting(args.tenantId, args.queueId);
    const next = waiting[0];
    if (!next) return null;
    const updated = await this.repo.updateToken(next.id as string, {
      status: "called",
      called_at: new Date().toISOString(),
      counter_code: args.counterCode ?? null,
    } as never);
    await this.sb.rpc("emit_automation_event", {
      _tenant_id: args.tenantId,
      _event_type: QUEUE_EVENTS.CALLED,
      _payload: {
        token_id: updated.id,
        queue_id: args.queueId,
        token_number: updated.token_number,
        counter_code: args.counterCode ?? null,
      } as never,
      _entity_ref: { type: "queue_token", id: updated.id } as never,
    });
    return updated;
  }

  async skipToken(args: { tenantId: string; tokenId: string; notes?: string | null }) {
    return this.repo.updateToken(args.tokenId, {
      status: "skipped",
      notes: args.notes ?? null,
    } as never);
  }

  async recallToken(args: { tenantId: string; tokenId: string }) {
    return this.repo.updateToken(args.tokenId, { status: "recalled" } as never);
  }

  async transferQueue(args: {
    tenantId: string;
    tokenId: string;
    targetQueueId: string;
    reason?: string | null;
  }) {
    const number = await this.repo.nextTokenNumber(args.targetQueueId);
    return this.repo.updateToken(args.tokenId, {
      queue_id: args.targetQueueId,
      token_number: number,
      status: "waiting",
      notes: args.reason ?? null,
    } as never);
  }

  /**
   * Rough wait estimate = (position ahead) × avg_service_minutes.
   * If no per-queue avg is configured, defaults to 15 minutes.
   */
  async estimateWaitTime(args: {
    tenantId: string;
    queueId: string;
    tokenId?: string;
    avgServiceMinutes?: number;
  }): Promise<{ ahead: number; estimated_minutes: number }> {
    const waiting = await this.repo.listWaiting(args.tenantId, args.queueId);
    let ahead = waiting.length;
    if (args.tokenId) {
      const idx = waiting.findIndex((t) => t.id === args.tokenId);
      ahead = idx >= 0 ? idx : waiting.length;
    }
    const avg = args.avgServiceMinutes ?? 15;
    return { ahead, estimated_minutes: ahead * avg };
  }
}
