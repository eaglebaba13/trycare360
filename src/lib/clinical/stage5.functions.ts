/**
 * Clinical / EMR — Stage 5 Server Functions.
 *
 * Every mutation:
 *   - uses requireSupabaseAuth (RLS enforces tenant + clinical permissions)
 *   - validates input via Zod schemas in ./stage5.validators
 *   - composes the Stage 5 ClinicalAssistantEngine / RecommendationEngine
 *   - reuses the existing Workflow Engine, Timeline, and AI Gateway
 * No autonomous EMR writes. No autonomous prescribing. The clinician
 * always confirms before anything is applied.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ClinicalAssistantEngine, RecommendationEngine } from "./stage5.engine.server";
import {
  AiAuditRepository,
  AiConversationRepository,
  AiRecommendationRepository,
  PromptTemplateRepository,
} from "./stage5.repositories.server";
import {
  assistantRunSchema,
  auditListSchema,
  conversationFeedbackSchema,
  conversationListSchema,
  promptTemplatesListSchema,
  recommendationIdSchema,
  recommendationListSchema,
  recommendationStatusSchema,
  recommendationUpsertSchema,
} from "./stage5.validators";

// ============================================================
// ASSISTANT
// ============================================================

export const runClinicalAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assistantRunSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ClinicalAssistantEngine(context.supabase);
    return engine.run({
      tenantId: data.tenantId,
      encounterId: data.encounterId ?? null,
      patientId: data.patientId ?? null,
      purpose: data.purpose,
      templateCode: data.templateCode ?? null,
      templateVersion: data.templateVersion ?? null,
      modelHint: data.modelHint ?? null,
      extraInstructions: data.extraInstructions ?? null,
      overrideContext: data.overrideContext ?? undefined,
      saveRecommendations: data.saveRecommendations ?? false,
      actor: context.userId,
    });
  });

// ============================================================
// CONVERSATIONS
// ============================================================

export const listAiConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conversationListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AiConversationRepository(context.supabase);
    const rows = await repo.list({
      tenantId: data.tenantId,
      encounterId: data.encounterId ?? null,
      patientId: data.patientId ?? null,
      limit: data.limit,
    });
    return { rows };
  });

export const submitAiConversationFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conversationFeedbackSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new ClinicalAssistantEngine(context.supabase);
    const row = await engine.submitFeedback({
      tenantId: data.tenantId,
      id: data.id,
      feedback: data.feedback,
      note: data.note ?? null,
      actor: context.userId,
    });
    return { conversation: row };
  });

// ============================================================
// RECOMMENDATIONS
// ============================================================

export const listAiRecommendations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recommendationListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AiRecommendationRepository(context.supabase);
    const rows = await repo.list({
      tenantId: data.tenantId,
      encounterId: data.encounterId ?? null,
      patientId: data.patientId ?? null,
      status: data.status ?? null,
      kind: data.kind ?? null,
      limit: data.limit,
    });
    return { rows };
  });

export const upsertAiRecommendation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recommendationUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RecommendationEngine(context.supabase);
    const row = await engine.upsert({
      tenantId: data.tenantId,
      id: data.id,
      encounterId: data.encounterId ?? null,
      patientId: data.patientId,
      kind: data.kind,
      targetType: data.targetType ?? null,
      targetId: data.targetId ?? null,
      title: data.title,
      summary: data.summary ?? null,
      body: data.body ?? {},
      sources: data.sources ?? [],
      confidence: data.confidence ?? null,
      severity: data.severity ?? null,
      model: data.model ?? null,
      modelVersion: data.modelVersion ?? null,
      promptTemplateId: data.promptTemplateId ?? null,
      promptTemplateCode: data.promptTemplateCode ?? null,
      promptTemplateVersion: data.promptTemplateVersion ?? null,
      conversationId: data.conversationId ?? null,
      status: data.status,
      statusReason: data.statusReason ?? null,
      actor: context.userId,
    });
    return { recommendation: row };
  });

export const setAiRecommendationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recommendationStatusSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new RecommendationEngine(context.supabase);
    const row = await engine.setStatus({
      tenantId: data.tenantId,
      id: data.id,
      status: data.status,
      reason: data.reason ?? null,
      appliedRef: data.appliedRef ?? null,
      actor: context.userId,
    });
    return { recommendation: row };
  });

export const getAiRecommendation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recommendationIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AiRecommendationRepository(context.supabase);
    const row = await repo.getById(data.id);
    if (!row || row.tenant_id !== data.tenantId) throw new Error("Not found");
    return { recommendation: row };
  });

// ============================================================
// PROMPT TEMPLATES (read-only)
// ============================================================

export const listAiPromptTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => promptTemplatesListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PromptTemplateRepository(context.supabase);
    const rows = await repo.list({
      tenantId: data.tenantId,
      purpose: data.purpose ?? null,
      activeOnly: data.activeOnly,
    });
    return { rows };
  });

// ============================================================
// AUDIT
// ============================================================

export const listAiAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => auditListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new AiAuditRepository(context.supabase);
    const rows = await repo.list({
      tenantId: data.tenantId,
      encounterId: data.encounterId ?? null,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      limit: data.limit,
    });
    return { rows };
  });
