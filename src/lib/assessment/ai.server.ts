/**
 * Lovable AI Gateway call for assessment analysis.
 * Best-effort: if LOVABLE_API_KEY is missing or gateway fails, callers fall
 * back to the deterministic scoring in ./rules.ts.
 */
import type { ScoredResult } from "./rules";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a medical triage assistant for TryCare360, an aesthetic + wellness clinic network.
You review a self-reported questionnaire (and later, image findings) for one of: hair, skin, nail, nutrition.
Return STRICT JSON with keys:
  severity: "low"|"moderate"|"high"|"severe"
  confidence: number (0-100)
  urgency: "routine"|"soon"|"urgent"
  scale_scores: object (category-specific numeric or string scales)
  probable_causes: string[] (max 5)
  key_findings: string[] (max 5)
  summary: string (2-3 sentence patient-friendly summary — no medical diagnosis, use "may indicate" / "suggests")
Do NOT include markdown fences. Do NOT include any keys other than the above.`;

export type AiInput = {
  category: string;
  responses: Record<string, unknown>;
  age?: number | null;
  gender?: string | null;
};

export async function analyzeWithAi(input: AiInput, model = DEFAULT_MODEL): Promise<{
  result: Partial<ScoredResult> & { severity?: ScoredResult["severity"] };
  raw: unknown;
  ms: number;
  model: string;
} | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const started = Date.now();
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Category: ${input.category}\nAge: ${input.age ?? "unknown"}\nGender: ${input.gender ?? "unknown"}\nResponses JSON:\n${JSON.stringify(input.responses)}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const raw = await res.json();
    const text: string = raw?.choices?.[0]?.message?.content ?? "";
    let parsed: Partial<ScoredResult> = {};
    try { parsed = JSON.parse(text); } catch { return null; }
    return { result: parsed, raw, ms: Date.now() - started, model };
  } catch {
    return null;
  }
}
