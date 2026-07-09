/**
 * Assessment platform — authenticated server functions (staff only).
 * Public write-path lives in src/routes/api/public/assessment.$action.ts.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { scoreByCategory, recommendationsFor, type ScoredResult } from "./rules";

// ---------- List ----------
const listSchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
}).partial();

export const listAssessmentSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("assessment_sessions").select(
      "id, public_token, category, status, contact_name, contact_phone, contact_email, contact_city, age, gender, source, campaign, progress_pct, started_at, submitted_at, completed_at, person_id, lead_person_id, created_at"
    ).order("created_at", { ascending: false }).limit(data.limit ?? 50);
    if (data.status) q = q.eq("status", data.status);
    if (data.category) q = q.eq("category", data.category);
    if (data.q) {
      const needle = `%${data.q}%`;
      q = q.or(`contact_name.ilike.${needle},contact_phone.ilike.${needle},contact_email.ilike.${needle}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { sessions: rows ?? [] };
  });

// ---------- Get one ----------
export const getAssessmentSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [{ data: session }, { data: result }, { data: recs }, { data: photos }] = await Promise.all([
      context.supabase.from("assessment_sessions").select("*").eq("id", data.session_id).maybeSingle(),
      context.supabase.from("assessment_results").select("*").eq("session_id", data.session_id).maybeSingle(),
      context.supabase.from("assessment_recommendations").select("*").eq("session_id", data.session_id).order("priority"),
      context.supabase.from("assessment_photos").select("*").eq("session_id", data.session_id),
    ]);
    if (!session) throw new Error("Session not found");
    return { session, result: result ?? null, recommendations: recs ?? [], photos: photos ?? [] };
  });

// ---------- Analyze (run AI + rules, write result + recommendations) ----------
export const analyzeAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: session, error } = await context.supabase
      .from("assessment_sessions").select("*").eq("id", data.session_id).maybeSingle();
    if (error || !session) throw new Error("Session not found");

    // Mark analyzing
    await context.supabase.from("assessment_sessions").update({ status: "analyzing" }).eq("id", session.id);

    const responses = (session.responses ?? {}) as Record<string, unknown>;
    const scored: ScoredResult = scoreByCategory(session.category, responses);

    // Try AI (best-effort)
    const { analyzeWithAi } = await import("./ai.server");
    const ai = await analyzeWithAi({
      category: session.category,
      responses,
      age: session.age,
      gender: session.gender,
    });

    // Merge: prefer AI severity/summary/causes when present, keep rule scales as ground truth
    const merged: ScoredResult = ai?.result
      ? {
          severity: (ai.result.severity as ScoredResult["severity"]) ?? scored.severity,
          urgency: (ai.result.urgency as ScoredResult["urgency"]) ?? scored.urgency,
          confidence: typeof ai.result.confidence === "number" ? ai.result.confidence : scored.confidence,
          scale_scores: { ...scored.scale_scores, ...(ai.result.scale_scores ?? {}) },
          probable_causes: Array.isArray(ai.result.probable_causes) && ai.result.probable_causes.length
            ? ai.result.probable_causes.slice(0, 5) : scored.probable_causes,
          key_findings: Array.isArray(ai.result.key_findings) && ai.result.key_findings.length
            ? ai.result.key_findings.slice(0, 5) : scored.key_findings,
          summary: typeof ai.result.summary === "string" && ai.result.summary ? ai.result.summary : scored.summary,
        }
      : scored;

    // Upsert result
    const { error: rErr } = await context.supabase.from("assessment_results").upsert({
      session_id: session.id,
      severity: merged.severity,
      confidence: merged.confidence,
      scale_scores: merged.scale_scores as never,
      probable_causes: merged.probable_causes as never,
      key_findings: merged.key_findings as never,
      ai_summary: merged.summary,
      ai_raw: (ai?.raw ?? null) as never,
      ai_model: ai?.model ?? null,
      processing_ms: ai?.ms ?? null,
      urgency: merged.urgency,
    }, { onConflict: "session_id" });
    if (rErr) throw new Error(rErr.message);

    // Replace recommendations
    await context.supabase.from("assessment_recommendations").delete().eq("session_id", session.id);
    const recs = recommendationsFor(session.category, merged, responses);
    if (recs.length) {
      const { error: recErr } = await context.supabase.from("assessment_recommendations").insert(
        recs.map((r) => ({
          session_id: session.id,
          kind: r.kind,
          title: r.title,
          description: r.description ?? null,
          reason: r.reason ?? null,
          priority: r.priority,
          ref_slug: r.ref_slug ?? null,
        }))
      );
      if (recErr) throw new Error(recErr.message);
    }

    await context.supabase
      .from("assessment_sessions")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", session.id);

    return { ok: true, severity: merged.severity, used_ai: !!ai };
  });

// ---------- Convert to Person + Lead ----------
export const convertAssessmentToLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    session_id: z.string().uuid(),
    tenant_id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: session, error } = await context.supabase
      .from("assessment_sessions").select("*").eq("id", data.session_id).maybeSingle();
    if (error || !session) throw new Error("Session not found");
    if (session.person_id) return { ok: true, person_id: session.person_id, already_linked: true };

    // Best-effort dedup by phone/email within tenant
    let person: { id: string } | null = null;
    if (session.contact_phone || session.contact_email) {
      const existing = await context.supabase
        .from("persons")
        .select("id")
        .eq("tenant_id", data.tenant_id)
        .or(
          [
            session.contact_phone ? `primary_phone.eq.${session.contact_phone}` : null,
            session.contact_email ? `primary_email.eq.${session.contact_email}` : null,
          ].filter(Boolean).join(",")
        )
        .limit(1)
        .maybeSingle();
      if (existing.data) person = existing.data;
    }

    if (!person) {
      const parts = (session.contact_name ?? "").trim().split(/\s+/);
      const first_name = parts[0] ?? "Consultation";
      const last_name = parts.slice(1).join(" ") || "Lead";
      const { data: created, error: pErr } = await context.supabase
        .from("persons")
        .insert({
          tenant_id: data.tenant_id,
          first_name,
          last_name,
          primary_phone: session.contact_phone ?? null,
          primary_email: session.contact_email ?? null,
          gender: session.gender ?? null,
          city: session.contact_city ?? null,
        } as never)
        .select("id")
        .single();
      if (pErr) throw new Error(pErr.message);
      person = created;
    }

    await context.supabase
      .from("assessment_sessions")
      .update({ person_id: person!.id, lead_person_id: person!.id })
      .eq("id", session.id);

    // Emit workflow event (best-effort)
    await context.supabase.from("workflow_runs").insert({
      tenant_id: data.tenant_id,
      workflow_id: null,
      status: "pending",
      entity_ref: { assessment_session_id: session.id, person_id: person!.id } as never,
      context: { source: "assessment", category: session.category } as never,
      trigger_source: "assessment_lead_created",
    } as never).then(() => {}, () => {});

    return { ok: true, person_id: person!.id };
  });

// ---------- Analytics summary ----------
export const assessmentAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(() => ({}))
  .handler(async ({ context }) => {
    const { data: rows } = await context.supabase
      .from("assessment_sessions")
      .select("category, status, source, created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    const list = rows ?? [];
    const total = list.length;
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const r of list) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      const src = r.source ?? "direct";
      bySource[src] = (bySource[src] ?? 0) + 1;
    }
    const completed = byStatus["completed"] ?? 0;
    return { total, completed, conversion: total ? Math.round((completed / total) * 100) : 0, byStatus, byCategory, bySource };
  });
