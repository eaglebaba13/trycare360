/**
 * Server functions binding the Laboratory AI Assistant to the UI.
 * Only surface added in Stage 5 — no new database tables.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { runAssistant } from "./assistant.server";
import { LAB_AI_PURPOSES } from "./prompt-library";
import {
  listTurns,
  updateTurnStatus,
  feedbackTurn,
} from "./conversation.server";
import { auditAiStatusChange } from "./audit.server";

const purposeSchema = z.enum(LAB_AI_PURPOSES);

const runSchema = z.object({
  tenantId: z.string().uuid(),
  purpose: purposeSchema,
  scope: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  model: z.string().optional(),
});

export const runLabAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => runSchema.parse(d))
  .handler(async ({ context, data }) => {
    const res = await runAssistant({
      supabase: context.supabase,
      tenantId: data.tenantId,
      purpose: data.purpose,
      payload: data.payload,
      scope: data.scope,
      actorId: context.userId,
      model: data.model,
    });
    return res;
  });

const listSchema = z.object({
  tenantId: z.string().uuid(),
  scope: z.string().min(1),
});

export const listLabAssistantTurns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data }) => {
    return { turns: listTurns(data.tenantId, data.scope) };
  });

const statusSchema = z.object({
  tenantId: z.string().uuid(),
  scope: z.string().min(1),
  turnId: z.string().min(1),
  status: z.enum(["draft", "suggested", "accepted", "rejected", "archived"]),
  reason: z.string().nullish(),
});

export const setLabAssistantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusSchema.parse(d))
  .handler(async ({ context, data }) => {
    const turn = updateTurnStatus(data.tenantId, data.scope, data.turnId, data.status);
    if (turn) {
      await auditAiStatusChange(context.supabase, {
        tenantId: data.tenantId,
        turnId: data.turnId,
        actorId: context.userId,
        status: data.status,
        reason: data.reason ?? null,
      });
    }
    return { turn };
  });

const feedbackSchema = z.object({
  tenantId: z.string().uuid(),
  scope: z.string().min(1),
  turnId: z.string().min(1),
  feedback: z.enum(["up", "down"]),
});

export const submitLabAssistantFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => feedbackSchema.parse(d))
  .handler(async ({ data }) => {
    return { turn: feedbackTurn(data.tenantId, data.scope, data.turnId, data.feedback) };
  });
