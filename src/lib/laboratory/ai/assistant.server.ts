/**
 * Laboratory AI Assistant — runs one advisory turn through the Lovable AI
 * Gateway using the shared clinical AI helper, records it in the
 * per-process conversation store and writes an audit trail.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { callClinicalAi } from "@/lib/clinical/ai-gateway.server";
import {
  LAB_AI_SYSTEM_PROMPT,
  buildPrompt,
  type LabAiPurpose,
} from "./prompt-library";
import { recordTurn, type LabAiTurn } from "./conversation.server";
import { auditAiTurn } from "./audit.server";

type SB = SupabaseClient<Database>;

export interface AssistantRunInput {
  supabase: SB;
  tenantId: string;
  purpose: LabAiPurpose;
  payload: Record<string, unknown>;
  scope: string;
  actorId: string | null;
  model?: string;
}

export interface AssistantRunResult {
  ok: boolean;
  turn: LabAiTurn;
  text: string;
  error?: string;
}

function randomId(): string {
  return `lai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function runAssistant(input: AssistantRunInput): Promise<AssistantRunResult> {
  const prompt = buildPrompt(input.purpose, input.payload);
  const call = await callClinicalAi({
    systemPrompt: LAB_AI_SYSTEM_PROMPT,
    userPrompt: prompt,
    model: input.model,
  });

  const turn: LabAiTurn = {
    id: randomId(),
    purpose: input.purpose,
    createdAt: new Date().toISOString(),
    prompt,
    response: call.text,
    ok: call.ok,
    latencyMs: call.latencyMs,
    tokensIn: call.tokensIn,
    tokensOut: call.tokensOut,
    model: call.model,
    actorId: input.actorId,
    status: call.ok ? "suggested" : "draft",
  };

  recordTurn(input.tenantId, input.scope, turn);
  await auditAiTurn(input.supabase, {
    tenantId: input.tenantId,
    purpose: input.purpose,
    turnId: turn.id,
    actorId: input.actorId,
    ok: call.ok,
    latencyMs: call.latencyMs,
    tokensIn: call.tokensIn,
    tokensOut: call.tokensOut,
    model: call.model,
  });

  return { ok: call.ok, turn, text: call.text, error: call.error };
}
