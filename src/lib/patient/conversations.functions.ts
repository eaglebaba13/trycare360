/**
 * Patient Portal — Conversation server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ConversationEngine } from "./engines/conversation.engine.server";
import {
  conversationIdSchema,
  createConversationSchema,
  emptySchema,
  sendChatMessageSchema,
} from "./validators";

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createConversationSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new ConversationEngine(context.supabase);
    return { conversation: await engine.create(context.userId, data) };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new ConversationEngine(context.supabase);
    return { rows: await engine.list(context.userId) };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendChatMessageSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ConversationEngine(context.supabase);
    return { message: await engine.send(context.userId, data) };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conversationIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ConversationEngine(context.supabase);
    return await engine.markRead(context.userId, data.conversationId);
  });
