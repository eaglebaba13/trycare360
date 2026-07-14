/**
 * Patient Portal — AI Assistant server function.
 *
 * Thin wrapper around the existing Lovable AI Gateway helper
 * (`callClinicalAi`). Advisory-only: never diagnoses, never
 * prescribes, never issues clinical decisions.
 *
 * Reuses:
 *  - Existing Lovable AI Gateway helper (`callClinicalAi`)
 *  - `requireSupabaseAuth` middleware
 *  - Stage 2 clinical summary/prescription/lab readers for grounding context
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callClinicalAi } from "@/lib/clinical/ai-gateway.server";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const askSchema = z.object({
  mode: z
    .enum(["general", "health", "medications", "appointments", "labs", "education", "prescriptions"])
    .default("general"),
  messages: z.array(messageSchema).min(1),
  context: z.string().optional(),
});

const MODE_PROMPTS: Record<string, string> = {
  general:
    "You are the TryCare360 Patient AI Companion. You are advisory only, never diagnose, never prescribe, never make clinical decisions. Speak in plain, warm, culturally-aware language. Always remind the patient to consult their care team for medical decisions.",
  health:
    "You are a wellness coach. Help the patient understand their health goals, vitals trends, and lifestyle. Do not diagnose or prescribe. Recommend they discuss anything concerning with their doctor.",
  medications:
    "You explain what a medication is for, how it is generally taken, and common side effects in plain language. NEVER recommend starting, stopping, or changing a dose. Always defer to the prescribing clinician.",
  appointments:
    "You help patients understand appointment types, prepare for visits, and know what to expect. Do not diagnose.",
  labs:
    "You explain what a lab test measures in general terms. Do not interpret specific values as a diagnosis. Always recommend reviewing results with the ordering clinician.",
  education:
    "You are a health-education librarian. Provide balanced, evidence-based explanations of conditions, procedures, and wellness topics. Cite that recommendations are general and not personal medical advice.",
  prescriptions:
    "You explain how a prescription typically works — timing, food interactions, storage — in plain language. Never modify a regimen. Always defer to the prescriber and pharmacist.",
};

const SAFETY_FOOTER =
  "\n\nIMPORTANT: This assistant is advisory only. It does not diagnose, prescribe, or replace professional medical care. For anything urgent, contact your care team or local emergency services.";

export const askPatientAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => askSchema.parse(d))
  .handler(async ({ data }) => {
    const system = (MODE_PROMPTS[data.mode] ?? MODE_PROMPTS.general) + SAFETY_FOOTER;
    const transcript = data.messages
      .map((m) => `${m.role === "user" ? "Patient" : "Assistant"}: ${m.content}`)
      .join("\n");
    const userPrompt = data.context
      ? `Context:\n${data.context}\n\nConversation so far:\n${transcript}`
      : transcript;
    const result = await callClinicalAi({
      systemPrompt: system,
      userPrompt,
      temperature: 0.3,
    });
    return {
      ok: result.ok,
      reply: result.text,
      model: result.model,
      error: result.error ?? null,
    };
  });

export const suggestPatientActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ topic: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const result = await callClinicalAi({
      systemPrompt:
        "You are a supportive patient companion. Given a topic, propose 3-5 short, practical next steps the patient could take. Return concise bullet-style suggestions (one per line). Advisory only — no diagnosis or prescription.",
      userPrompt: data.topic,
      temperature: 0.4,
    });
    const suggestions = result.text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    return { ok: result.ok, suggestions, error: result.error ?? null };
  });
