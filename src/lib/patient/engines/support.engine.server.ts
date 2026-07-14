import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { FeedbackRepository, SupportTicketRepository } from "../repositories.server";
import { emitPatientEvent, logPatientTimeline, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Support engine — support tickets and patient feedback. Escalation
 * (SLA, routing, auto-assign) is delegated to the platform Workflow
 * Engine through the emitted PATIENT_EVENTS.SupportCreated.
 */
export class SupportEngine {
  constructor(private readonly sb: SB) {}

  async createTicket(userId: string, input: {
    subject: string;
    body: string;
    category?: string | null;
    priority?: string | null;
    meta?: Record<string, unknown>;
  }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new SupportTicketRepository(this.sb).insert({
      patient_user_id: userId,
      tenant_id: identity.tenantId,
      subject: input.subject,
      body: input.body,
      category: input.category ?? null,
      priority: input.priority ?? "normal",
      status: "open",
      meta: (input.meta ?? {}) as never,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.SupportCreated,
      payload: { ticket_id: row.id, category: input.category, priority: input.priority },
      entityRef: { type: "patient_support_ticket", id: row.id },
    });
    await logPatientTimeline(this.sb, {
      tenantId: identity.tenantId,
      entityType: "patient_support_ticket",
      entityId: row.id,
      eventType: PATIENT_EVENTS.SupportCreated,
      title: `Support ticket: ${input.subject}`,
    });
    return row;
  }

  async list(userId: string) {
    return new SupportTicketRepository(this.sb).list(userId);
  }

  async submitFeedback(userId: string, input: {
    targetType: string;
    targetId: string;
    rating: number;
    comment?: string | null;
    sentiment?: string | null;
    meta?: Record<string, unknown>;
  }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new FeedbackRepository(this.sb).insert({
      patient_user_id: userId,
      tenant_id: identity.tenantId,
      target_type: input.targetType,
      target_id: input.targetId,
      rating: input.rating,
      comment: input.comment ?? null,
      sentiment: input.sentiment ?? null,
      meta: (input.meta ?? {}) as never,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.FeedbackCreated,
      payload: { feedback_id: row.id, target_type: input.targetType, rating: input.rating },
    });
    return row;
  }
}
