/**
 * Lovable AI Gateway helper for the Clinical AI Assistant (server-only).
 *
 * Direct fetch to https://ai.gateway.lovable.dev — mirrors the pattern used
 * in src/lib/assessment/ai.server.ts to avoid pulling in a new SDK
 * dependency. Every call records latency and best-effort token usage so the
 * caller can persist it into `clinical_ai_conversations`.
 */
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

export interface ClinicalAiCallInput {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  jsonMode?: boolean;
  temperature?: number;
}

export interface ClinicalAiCallResult {
  ok: boolean;
  text: string;
  json: unknown;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  latencyMs: number;
  costUsd: number | null;
  raw: unknown;
  error?: string;
}

function parseJsonLoose(text: string): unknown {
  if (!text) return null;
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export async function callClinicalAi(input: ClinicalAiCallInput): Promise<ClinicalAiCallResult> {
  const key = process.env.LOVABLE_API_KEY;
  const model = input.model || DEFAULT_MODEL;
  const started = Date.now();
  if (!key) {
    return {
      ok: false,
      text: "",
      json: null,
      model,
      tokensIn: null,
      tokensOut: null,
      latencyMs: Date.now() - started,
      costUsd: null,
      raw: null,
      error: "LOVABLE_API_KEY is not configured",
    };
  }

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    };
    if (input.jsonMode) body.response_format = { type: "json_object" };
    if (typeof input.temperature === "number") body.temperature = input.temperature;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });
    const latencyMs = Date.now() - started;
    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        text: "",
        json: null,
        model,
        tokensIn: null,
        tokensOut: null,
        latencyMs,
        costUsd: null,
        raw,
        error: `Gateway ${res.status}: ${JSON.stringify(raw).slice(0, 500)}`,
      };
    }

    const text: string =
      (raw as { choices?: Array<{ message?: { content?: string } }> })
        ?.choices?.[0]?.message?.content ?? "";
    const usage = (raw as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
    return {
      ok: true,
      text,
      json: input.jsonMode ? parseJsonLoose(text) : null,
      model,
      tokensIn: usage?.prompt_tokens ?? null,
      tokensOut: usage?.completion_tokens ?? null,
      latencyMs,
      costUsd: null,
      raw,
    };
  } catch (err) {
    return {
      ok: false,
      text: "",
      json: null,
      model,
      tokensIn: null,
      tokensOut: null,
      latencyMs: Date.now() - started,
      costUsd: null,
      raw: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
