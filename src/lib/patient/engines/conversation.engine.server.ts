import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ChatMessageRepository, ConversationRepository } from "../repositories.server";
import { emitPatientEvent, resolvePatientIdentity } from "../helpers.server";
import { PATIENT_EVENTS } from "../events";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Conversation engine — thin patient chat surface. All actual
 * fan-out / notifications happen via the platform Notification
 * Engine using the emitted PATIENT_EVENTS.Conversation* events.
 */
export class ConversationEngine {
  constructor(private readonly sb: SB) {}

  async create(userId: string, input: { topic?: string | null; channel?: string; meta?: Record<string, unknown> }) {
    const identity = await resolvePatientIdentity(this.sb, userId);
    const row = await new ConversationRepository(this.sb).insert({
      patient_user_id: userId,
      tenant_id: identity.tenantId,
      topic: input.topic ?? null,
      channel: input.channel ?? "in_app",
      status: "open",
      meta: (input.meta ?? {}) as never,
    });
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.ConversationOpened,
      payload: { conversation_id: row.id, topic: input.topic },
    });
    return row;
  }

  async list(userId: string) {
    return new ConversationRepository(this.sb).list(userId);
  }

  async send(userId: string, input: { conversationId: string; body: string; attachments?: Record<string, unknown>[] }) {
    const conv = new ConversationRepository(this.sb);
    const existing = await conv.getById(input.conversationId);
    if (!existing || existing.patient_user_id !== userId) throw new Error("Not found");
    const identity = await resolvePatientIdentity(this.sb, userId);
    const msg = await new ChatMessageRepository(this.sb).insert({
      conversation_id: input.conversationId,
      patient_user_id: userId,
      sender_user_id: userId,
      sender_role: "patient",
      body: input.body,
      attachments: (input.attachments ?? []) as never,
    });
    await conv.touchLastMessage(input.conversationId, new Date().toISOString());
    await emitPatientEvent(this.sb, {
      tenantId: identity.tenantId,
      event: PATIENT_EVENTS.ConversationMessage,
      payload: { conversation_id: input.conversationId, message_id: msg.id },
    });
    return msg;
  }

  async markRead(userId: string, conversationId: string) {
    const conv = new ConversationRepository(this.sb);
    const existing = await conv.getById(conversationId);
    if (!existing || existing.patient_user_id !== userId) throw new Error("Not found");
    await new ChatMessageRepository(this.sb).markConversationRead(conversationId, userId, new Date().toISOString());
    return { ok: true };
  }
}
