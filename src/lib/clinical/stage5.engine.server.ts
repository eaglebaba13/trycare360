/**
 * Clinical / EMR — Stage 5 engine services (server-only).
 *
 * The AI Clinical Assistant is ADVISORY. Every run:
 *   1. Loads the 360° clinical context (Stage 2 loader — no parallel loader).
 *   2. Resolves a prompt template (Stage 1 clinical_ai_prompt_templates).
 *   3. Calls Lovable AI Gateway.
 *   4. Persists a clinical_ai_conversations row (prompt, response, model,
 *      tokens, latency, version).
 *   5. Records a clinical_ai_audit "requested" row.
 *   6. Emits a workflow event via the existing Workflow Engine.
 *   7. Optionally records `suggested` recommendation rows for JSON-shaped
 *      outputs (never applies them — clinician must accept).
 *
 * No autonomous EMR writes. No autonomous prescribing. Nothing is signed
 * or applied by the assistant.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { clinicalHelpers } from "./engine.server";
import { ClinicalContextLoader, type ClinicalContext } from "./context-loader.server";
import { callClinicalAi } from "./ai-gateway.server";
import {
  AiAuditRepository,
  AiConversationRepository,
  AiRecommendationRepository,
  PromptTemplateRepository,
  type AiConversationRow,
  type AiRecommendationInsert,
  type AiRecommendationRow,
  type PromptTemplateRow,
} from "./stage5.repositories.server";
import type { RecKind, RecStatus } from "./stage5.validators";

type SB = SupabaseClient<Database>;
type Actor = string | null | undefined;

// ---------------------------------------------------------------------------
// Context compaction — trim the full 360° ctx into a small JSON blob that
// fits comfortably in a prompt. We intentionally drop long free-text.
// ---------------------------------------------------------------------------
function compactContext(ctx: ClinicalContext): Record<string, unknown> {
  return {
    patient: ctx.person
      ? {
          id: ctx.person.id,
          full_name: ctx.person.full_name,
          gender: ctx.person.gender,
          dob: ctx.person.dob,
        }
      : null,
    encounter: ctx.encounter
      ? {
          id: ctx.encounter.id,
          type: ctx.encounter.encounter_type,
          chief_complaint: ctx.encounter.chief_complaint,
          started_at: ctx.encounter.started_at,
          status: ctx.encounter.status,
        }
      : null,
    active_problems: ctx.problems.map((p) => ({
      display: p.display,
      status: p.status,
      onset: p.onset_date,
    })),
    allergies: ctx.allergies.map((a) => ({
      substance: a.substance,
      severity: a.severity,
      reaction: a.reaction,
    })),
    vitals_latest: ctx.vitals[0] ?? null,
    medical_history: ctx.medicalHistory.map((m) => ({
      category: m.category,
      summary: m.summary,
      event_date: m.event_date,
    })),
    family_history: ctx.familyHistory.map((f) => ({
      relation: f.relation,
      condition: f.condition_display,
      onset_age: f.onset_age,
    })),
    lifestyle: ctx.lifestyleHistory ?? null,
    treatment_plans: ctx.treatmentPlans.slice(0, 5).map((t) => ({
      title: t.title,
      status: t.status,
      diagnosis: t.diagnosis,
    })),
    prescriptions: ctx.prescriptions.slice(0, 10).map((p) => ({
      id: p.id,
      status: p.status,
      notes: p.notes,
    })),
    current_soap: ctx.soap.current
      ? {
          version_no: ctx.soap.current.version_no,
          subjective: ctx.soap.current.subjective,
          objective: ctx.soap.current.objective,
          assessment: ctx.soap.current.assessment,
          plan: ctx.soap.current.plan,
        }
      : null,
    consents: ctx.clinicalConsents.map((c) => ({
      status: c.status,
      template_code: c.template_code,
    })),
    followups: ctx.followups.slice(0, 5).map((f) => ({
      reason: f.reason,
      priority: f.priority,
      status: f.status,
    })),
  };
}

// A best-effort mapper from AI JSON shapes to recommendation rows.
// Only used when `saveRecommendations` is true. Never applied to the EMR.
function extractRecommendations(purpose: string, json: unknown): Array<{
  kind: RecKind;
  title: string;
  summary?: string | null;
  body: Record<string, unknown>;
  sources: Array<Record<string, unknown>>;
  confidence?: number | null;
  severity?: AiRecommendationInsert["severity"];
}> {
  if (!Array.isArray(json)) return [];
  const kindMap: Record<string, RecKind> = {
    differential: "differential",
    differential_diagnosis: "differential",
    treatment_suggestion: "treatment",
    contraindication_check: "contraindication",
    checklist: "checklist",
    clinical_checklist: "checklist",
    followup: "followup",
    followup_suggestion: "followup",
    nutrition: "nutrition",
    nutrition_suggestion: "nutrition",
    referral: "referral",
    referral_suggestion: "referral",
  };
  const kind = kindMap[purpose];
  if (!kind) return [];
  return json.slice(0, 20).map((raw) => {
    const item = (raw ?? {}) as Record<string, unknown>;
    const title =
      (typeof item.label === "string" && item.label) ||
      (typeof item.item === "string" && item.item) ||
      (typeof item.title === "string" && item.title) ||
      (typeof item.specialty === "string" && `Refer: ${item.specialty}`) ||
      "Suggestion";
    const summary =
      (typeof item.rationale === "string" && item.rationale) ||
      (typeof item.reason === "string" && item.reason) ||
      (typeof item.why === "string" && item.why) ||
      null;
    const confidence =
      typeof item.confidence === "number" && item.confidence >= 0 && item.confidence <= 1
        ? item.confidence
        : null;
    const severity =
      typeof item.severity === "string" &&
      ["info", "low", "moderate", "high", "critical"].includes(item.severity)
        ? (item.severity as AiRecommendationInsert["severity"])
        : null;
    const sources = Array.isArray(item.sources)
      ? (item.sources as unknown[]).map((s) =>
          typeof s === "string" ? { label: s } : ((s ?? {}) as Record<string, unknown>),
        )
      : [];
    return {
      kind,
      title: String(title).slice(0, 300),
      summary: summary ? String(summary).slice(0, 2000) : null,
      body: item,
      sources,
      confidence,
      severity,
    };
  });
}

// ---------------------------------------------------------------------------

export interface AssistantRunInput {
  tenantId: string;
  encounterId?: string | null;
  patientId?: string | null;
  purpose: string;
  templateCode?: string | null;
  templateVersion?: number | null;
  modelHint?: string | null;
  extraInstructions?: string | null;
  overrideContext?: Record<string, unknown>;
  saveRecommendations?: boolean;
  actor: Actor;
}

export interface AssistantRunResult {
  conversation: AiConversationRow;
  recommendations: AiRecommendationRow[];
  ok: boolean;
  error?: string | null;
  responseText: string;
  responseJson: Json | null;
  template: PromptTemplateRow | null;
}

export class ClinicalAssistantEngine {
  private readonly conversations: AiConversationRepository;
  private readonly recommendations: AiRecommendationRepository;
  private readonly audit: AiAuditRepository;
  private readonly templates: PromptTemplateRepository;
  private readonly loader: ClinicalContextLoader;

  constructor(private readonly sb: SB) {
    this.conversations = new AiConversationRepository(sb);
    this.recommendations = new AiRecommendationRepository(sb);
    this.audit = new AiAuditRepository(sb);
    this.templates = new PromptTemplateRepository(sb);
    this.loader = new ClinicalContextLoader(sb);
  }

  async run(input: AssistantRunInput): Promise<AssistantRunResult> {
    // ---- 1. Load / prepare context ---------------------------------------
    let ctxPayload: Record<string, unknown> = {};
    let patientId = input.patientId ?? null;
    if (input.encounterId || input.patientId) {
      // We need a person id for the loader; if only encounter is given,
      // pull the patient from it.
      if (!patientId && input.encounterId) {
        const { data: enc } = await this.sb
          .from("clinical_encounters")
          .select("patient_id")
          .eq("id", input.encounterId)
          .maybeSingle();
        patientId = (enc?.patient_id as string | undefined) ?? null;
      }
      if (patientId) {
        try {
          const ctx = await this.loader.getClinicalContext({
            tenantId: input.tenantId,
            personId: patientId,
            userId: input.actor ?? "00000000-0000-0000-0000-000000000000",
            encounterId: input.encounterId ?? null,
            historyLimit: 10,
          });
          ctxPayload = compactContext(ctx);
        } catch (err) {
          console.warn("[clinical-ai] context load failed", err);
        }
      }
    }
    if (input.overrideContext) {
      ctxPayload = { ...ctxPayload, override: input.overrideContext };
    }

    // ---- 2. Resolve template --------------------------------------------
    const template = await this.templates.resolve({
      tenantId: input.tenantId,
      code: input.templateCode ?? null,
      purpose: input.templateCode ? null : input.purpose,
      version: input.templateVersion ?? null,
    });

    const systemPrompt =
      template?.prompt ??
      `You are a clinical assistant. Advisory only. Never diagnose autonomously.`;
    const model = input.modelHint || template?.model_hint || "google/gemini-2.5-flash";
    const jsonMode = looksLikeJson(input.purpose, template);
    const userPrompt = buildUserPrompt(input.purpose, ctxPayload, input.extraInstructions ?? null);

    // ---- 3. Call the AI gateway -----------------------------------------
    const call = await callClinicalAi({ systemPrompt, userPrompt, model, jsonMode });

    // ---- 4. Persist conversation ----------------------------------------
    const conversation = await this.conversations.insert({
      tenant_id: input.tenantId,
      encounter_id: input.encounterId ?? null,
      patient_id: patientId,
      purpose: input.purpose,
      prompt_template_id: template?.id ?? null,
      prompt_template_code: template?.code ?? null,
      prompt_template_version: template?.version ?? null,
      prompt: userPrompt,
      system_prompt: systemPrompt,
      input_context: ctxPayload as Json,
      response: call.text || null,
      response_json: (call.json as Json | null) ?? null,
      model: call.model,
      tokens_input: call.tokensIn,
      tokens_output: call.tokensOut,
      latency_ms: call.latencyMs,
      cost_usd: call.costUsd,
      version: 1,
      error: call.error ?? null,
      requested_by: input.actor ?? null,
    });

    // ---- 5. Audit --------------------------------------------------------
    await this.audit.insert({
      tenant_id: input.tenantId,
      encounter_id: input.encounterId ?? null,
      patient_id: patientId,
      entity_type: "clinical_ai_conversation",
      entity_id: conversation.id,
      action: "requested",
      actor_id: input.actor ?? null,
      meta: {
        purpose: input.purpose,
        model: call.model,
        ok: call.ok,
        template_code: template?.code ?? null,
      } as Json,
    });

    // ---- 6. Workflow event ----------------------------------------------
    await clinicalHelpers.emitEvent(
      this.sb,
      input.tenantId,
      "clinical.ai.suggested" as never,
      {
        conversation_id: conversation.id,
        encounter_id: input.encounterId ?? null,
        patient_id: patientId,
        purpose: input.purpose,
        model: call.model,
        ok: call.ok,
      },
      { entity: "clinical_ai_conversation", id: conversation.id },
    );

    // ---- 7. Optional recommendation persistence -------------------------
    let recRows: AiRecommendationRow[] = [];
    if (input.saveRecommendations && call.ok && patientId) {
      const extracted = extractRecommendations(input.purpose, call.json);
      if (extracted.length) {
        const inserts: AiRecommendationInsert[] = extracted.map((r) => ({
          tenant_id: input.tenantId,
          encounter_id: input.encounterId ?? null,
          patient_id: patientId!,
          kind: r.kind,
          title: r.title,
          summary: r.summary ?? null,
          body: r.body as Json,
          sources: r.sources as Json,
          confidence: r.confidence ?? null,
          severity: r.severity ?? null,
          model: call.model,
          prompt_template_id: template?.id ?? null,
          prompt_template_code: template?.code ?? null,
          prompt_template_version: template?.version ?? null,
          conversation_id: conversation.id,
          status: "suggested",
          requested_by: input.actor ?? null,
        }));
        recRows = await this.recommendations.insertMany(inserts);
        for (const rec of recRows) {
          await this.audit.insert({
            tenant_id: input.tenantId,
            encounter_id: input.encounterId ?? null,
            patient_id: patientId,
            entity_type: "clinical_ai_recommendation",
            entity_id: rec.id,
            action: "requested",
            actor_id: input.actor ?? null,
            meta: { kind: rec.kind, from_conversation: conversation.id } as Json,
          });
        }
      }
    }

    return {
      conversation,
      recommendations: recRows,
      ok: call.ok,
      error: call.error ?? null,
      responseText: call.text,
      responseJson: (call.json as Json | null) ?? null,
      template,
    };
  }

  async submitFeedback(args: {
    tenantId: string;
    id: string;
    feedback: "up" | "down";
    note?: string | null;
    actor: Actor;
  }): Promise<AiConversationRow> {
    const updated = await this.conversations.update(args.id, {
      feedback: args.feedback,
      feedback_note: args.note ?? null,
    });
    await this.audit.insert({
      tenant_id: args.tenantId,
      encounter_id: updated.encounter_id,
      patient_id: updated.patient_id,
      entity_type: "clinical_ai_conversation",
      entity_id: updated.id,
      action: "feedback",
      actor_id: args.actor ?? null,
      note: args.note ?? null,
      meta: { feedback: args.feedback } as Json,
    });
    return updated;
  }
}

// ---------------------------------------------------------------------------
// Recommendation engine — clinician-driven lifecycle only.
// ---------------------------------------------------------------------------

export interface RecommendationUpsertInput {
  tenantId: string;
  id?: string;
  encounterId?: string | null;
  patientId: string;
  kind: RecKind;
  targetType?: string | null;
  targetId?: string | null;
  title: string;
  summary?: string | null;
  body?: Record<string, unknown>;
  sources?: Array<Record<string, unknown>>;
  confidence?: number | null;
  severity?: AiRecommendationInsert["severity"];
  model?: string | null;
  modelVersion?: string | null;
  promptTemplateId?: string | null;
  promptTemplateCode?: string | null;
  promptTemplateVersion?: number | null;
  conversationId?: string | null;
  status?: RecStatus;
  statusReason?: string | null;
  actor: Actor;
}

export class RecommendationEngine {
  private readonly repo: AiRecommendationRepository;
  private readonly audit: AiAuditRepository;
  constructor(private readonly sb: SB) {
    this.repo = new AiRecommendationRepository(sb);
    this.audit = new AiAuditRepository(sb);
  }

  async upsert(input: RecommendationUpsertInput): Promise<AiRecommendationRow> {
    const base: AiRecommendationInsert = {
      tenant_id: input.tenantId,
      encounter_id: input.encounterId ?? null,
      patient_id: input.patientId,
      kind: input.kind,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      title: input.title,
      summary: input.summary ?? null,
      body: (input.body ?? {}) as Json,
      sources: (input.sources ?? []) as Json,
      confidence: input.confidence ?? null,
      severity: input.severity ?? null,
      model: input.model ?? null,
      model_version: input.modelVersion ?? null,
      prompt_template_id: input.promptTemplateId ?? null,
      prompt_template_code: input.promptTemplateCode ?? null,
      prompt_template_version: input.promptTemplateVersion ?? null,
      conversation_id: input.conversationId ?? null,
      status: input.status ?? "draft",
      status_reason: input.statusReason ?? null,
    };

    let row: AiRecommendationRow;
    let action: "requested" | "edited";
    if (input.id) {
      const prev = await this.repo.getById(input.id);
      row = await this.repo.update(input.id, {
        ...base,
        edited_by: input.actor ?? null,
        edited_at: new Date().toISOString(),
      });
      action = "edited";
      await this.audit.insert({
        tenant_id: input.tenantId,
        encounter_id: input.encounterId ?? null,
        patient_id: input.patientId,
        entity_type: "clinical_ai_recommendation",
        entity_id: row.id,
        action,
        actor_id: input.actor ?? null,
        before_state: (prev ?? null) as Json,
        after_state: row as unknown as Json,
      });
    } else {
      row = await this.repo.insert({ ...base, requested_by: input.actor ?? null });
      action = "requested";
      await this.audit.insert({
        tenant_id: input.tenantId,
        encounter_id: input.encounterId ?? null,
        patient_id: input.patientId,
        entity_type: "clinical_ai_recommendation",
        entity_id: row.id,
        action,
        actor_id: input.actor ?? null,
        after_state: row as unknown as Json,
      });
    }
    return row;
  }

  async setStatus(args: {
    tenantId: string;
    id: string;
    status: RecStatus;
    reason?: string | null;
    appliedRef?: Record<string, unknown> | null;
    actor: Actor;
  }): Promise<AiRecommendationRow> {
    const prev = await this.repo.getById(args.id);
    if (!prev || prev.tenant_id !== args.tenantId) throw new Error("Recommendation not found");
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      status: args.status,
      status_reason: args.reason ?? null,
    };
    if (args.status === "accepted") {
      patch.accepted_by = args.actor ?? null;
      patch.accepted_at = now;
      if (args.appliedRef) patch.applied_ref = args.appliedRef;
    } else if (args.status === "rejected") {
      patch.rejected_by = args.actor ?? null;
      patch.rejected_at = now;
    }
    const row = await this.repo.update(args.id, patch);
    const actionMap: Record<RecStatus, string> = {
      draft: "edited",
      suggested: "edited",
      accepted: "accepted",
      rejected: "rejected",
      archived: "archived",
    };
    await this.audit.insert({
      tenant_id: args.tenantId,
      encounter_id: row.encounter_id,
      patient_id: row.patient_id,
      entity_type: "clinical_ai_recommendation",
      entity_id: row.id,
      action: actionMap[args.status],
      actor_id: args.actor ?? null,
      note: args.reason ?? null,
      before_state: prev as unknown as Json,
      after_state: row as unknown as Json,
      meta: (args.appliedRef ?? {}) as Json,
    });
    await clinicalHelpers.emitEvent(
      this.sb,
      args.tenantId,
      `clinical.ai.recommendation.${args.status}` as never,
      { recommendation_id: row.id, kind: row.kind, patient_id: row.patient_id },
      { entity: "clinical_ai_recommendation", id: row.id },
    );
    return row;
  }
}

// ---------------------------------------------------------------------------
function looksLikeJson(purpose: string, tpl: PromptTemplateRow | null): boolean {
  if (!tpl) {
    return [
      "differential",
      "treatment_suggestion",
      "contraindication_check",
      "checklist",
      "followup",
      "nutrition",
      "referral",
      "soap_draft",
      "soap_improve",
    ].includes(purpose);
  }
  const p = tpl.prompt.toLowerCase();
  return p.includes("json") || p.includes("output json");
}

function buildUserPrompt(
  purpose: string,
  ctx: Record<string, unknown>,
  extraInstructions: string | null,
): string {
  const header = `Purpose: ${purpose}`;
  const extra = extraInstructions ? `Clinician instructions: ${extraInstructions}\n\n` : "";
  return `${header}\n\n${extra}Encounter context JSON:\n${JSON.stringify(ctx, null, 2)}`;
}
