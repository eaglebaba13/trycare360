/**
 * Patient Portal — Support & Feedback server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SupportEngine } from "./engines/support.engine.server";
import { createTicketSchema, emptySchema, submitFeedbackSchema } from "./validators";

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createTicketSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SupportEngine(context.supabase);
    return { ticket: await engine.createTicket(context.userId, data) };
  });

export const listMySupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emptySchema.parse(d ?? {}))
  .handler(async ({ context }) => {
    const engine = new SupportEngine(context.supabase);
    return { rows: await engine.list(context.userId) };
  });

export const submitPatientFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitFeedbackSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SupportEngine(context.supabase);
    return { feedback: await engine.submitFeedback(context.userId, data) };
  });
