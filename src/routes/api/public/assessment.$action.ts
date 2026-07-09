/**
 * Public assessment API — single route file for the whole anonymous flow.
 *
 * POST /api/public/assessment/start      { code, source?, utm? }
 * POST /api/public/assessment/save       { token, responses?, progress?, contact? }
 * POST /api/public/assessment/photo      { token, slot, mime, base64 }
 * POST /api/public/assessment/submit     { token, consent }
 * GET  /api/public/assessment/result?token=...
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const cors: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const startSchema = z.object({
  code: z.string().min(1).max(64),
  source: z.string().max(120).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
});
const saveSchema = z.object({
  token: z.string().min(10),
  responses: z.record(z.string(), z.unknown()).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  contact: z.record(z.string(), z.string()).optional(),
});
const submitSchema = z.object({ token: z.string().min(10), consent: z.boolean() });
const photoSchema = z.object({
  token: z.string().min(10),
  slot: z.string().min(1).max(64),
  mime: z.string().max(120),
  base64: z.string().min(20).max(20 * 1024 * 1024),
});

export const Route = createFileRoute("/api/public/assessment/$action")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params, request }) => {
        if (params.action !== "result") return new Response("not_found", { status: 404, headers: cors });
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        if (!token) return Response.json({ ok: false, error: "token_required" }, { status: 400, headers: cors });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("assessment_result_public", { p_public_token: token });
        if (error) return Response.json({ ok: false, error: error.message }, { status: 400, headers: cors });
        return Response.json({ ok: true, ...(data as object) }, { headers: cors });
      },
      POST: async ({ params, request }) => {
        let body: unknown;
        try { body = await request.json(); } catch {
          return Response.json({ ok: false, error: "bad_json" }, { status: 400, headers: cors });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (params.action === "start") {
          const p = startSchema.safeParse(body);
          if (!p.success) return Response.json({ ok: false, error: "invalid" }, { status: 400, headers: cors });
          const { data, error } = await supabaseAdmin.rpc("assessment_start_public", {
            p_definition_code: p.data.code,
            p_channel: "web",
            p_source: p.data.source ?? undefined,
            p_utm: (p.data.utm ?? {}) as never,
          });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 400, headers: cors });
          const row = Array.isArray(data) ? data[0] : data;
          return Response.json({ ok: true, ...(row as object) }, { headers: cors });
        }

        if (params.action === "save") {
          const p = saveSchema.safeParse(body);
          if (!p.success) return Response.json({ ok: false, error: "invalid" }, { status: 400, headers: cors });
          const { error } = await supabaseAdmin.rpc("assessment_save_public", {
            p_public_token: p.data.token,
            p_responses: (p.data.responses ?? {}) as never,
            p_progress_pct: p.data.progress ?? undefined,
            p_contact: (p.data.contact ?? {}) as never,
          });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 400, headers: cors });
          return Response.json({ ok: true }, { headers: cors });
        }

        if (params.action === "photo") {
          const p = photoSchema.safeParse(body);
          if (!p.success) return Response.json({ ok: false, error: "invalid" }, { status: 400, headers: cors });
          // Verify session by token first
          const { data: session } = await supabaseAdmin
            .from("assessment_sessions").select("id, status").eq("public_token", p.data.token).maybeSingle();
          if (!session || session.status !== "in_progress") {
            return Response.json({ ok: false, error: "session_not_open" }, { status: 400, headers: cors });
          }
          const binary = Buffer.from(p.data.base64, "base64");
          if (binary.byteLength > 8 * 1024 * 1024) {
            return Response.json({ ok: false, error: "too_large" }, { status: 413, headers: cors });
          }
          const ext = p.data.mime.includes("png") ? "png" : p.data.mime.includes("webp") ? "webp" : "jpg";
          const path = `${session.id}/${p.data.slot}-${Date.now()}.${ext}`;
          const up = await supabaseAdmin.storage.from("assessment-photos").upload(path, binary, {
            contentType: p.data.mime, upsert: true,
          });
          if (up.error) return Response.json({ ok: false, error: up.error.message }, { status: 500, headers: cors });
          const { data: row, error: insErr } = await supabaseAdmin.from("assessment_photos").insert({
            session_id: session.id, slot: p.data.slot, storage_path: path,
            mime_type: p.data.mime, size_bytes: binary.byteLength,
          }).select("id").single();
          if (insErr) return Response.json({ ok: false, error: insErr.message }, { status: 500, headers: cors });
          return Response.json({ ok: true, photo_id: row.id }, { headers: cors });
        }

        if (params.action === "submit") {
          const p = submitSchema.safeParse(body);
          if (!p.success) return Response.json({ ok: false, error: "invalid" }, { status: 400, headers: cors });
          const { data: sessionId, error } = await supabaseAdmin.rpc("assessment_submit_public", {
            p_public_token: p.data.token, p_consent: p.data.consent,
          });
          if (error) return Response.json({ ok: false, error: error.message }, { status: 400, headers: cors });

          // Kick off analysis (best-effort, in-request so result is ready)
          try {
            const { scoreByCategory, recommendationsFor } = await import("@/lib/assessment/rules");
            const { analyzeWithAi } = await import("@/lib/assessment/ai.server");
            const { data: session } = await supabaseAdmin.from("assessment_sessions").select("*").eq("id", sessionId as string).maybeSingle();
            if (session) {
              await supabaseAdmin.from("assessment_sessions").update({ status: "analyzing" }).eq("id", session.id);
              const responses = (session.responses ?? {}) as Record<string, unknown>;
              const scored = scoreByCategory(session.category, responses);
              const ai = await analyzeWithAi({ category: session.category, responses, age: session.age, gender: session.gender });
              const merged = ai?.result ? {
                ...scored,
                severity: (ai.result.severity as typeof scored.severity) ?? scored.severity,
                urgency: (ai.result.urgency as typeof scored.urgency) ?? scored.urgency,
                confidence: typeof ai.result.confidence === "number" ? ai.result.confidence : scored.confidence,
                probable_causes: Array.isArray(ai.result.probable_causes) && ai.result.probable_causes.length
                  ? ai.result.probable_causes.slice(0, 5) : scored.probable_causes,
                key_findings: Array.isArray(ai.result.key_findings) && ai.result.key_findings.length
                  ? ai.result.key_findings.slice(0, 5) : scored.key_findings,
                summary: (typeof ai.result.summary === "string" && ai.result.summary) ? ai.result.summary : scored.summary,
              } : scored;
              await supabaseAdmin.from("assessment_results").upsert({
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
              await supabaseAdmin.from("assessment_recommendations").delete().eq("session_id", session.id);
              const recs = recommendationsFor(session.category, merged, responses);
              if (recs.length) {
                await supabaseAdmin.from("assessment_recommendations").insert(recs.map((r) => ({
                  session_id: session.id,
                  kind: r.kind, title: r.title, description: r.description ?? null,
                  reason: r.reason ?? null, priority: r.priority, ref_slug: r.ref_slug ?? null,
                })));
              }
              await supabaseAdmin.from("assessment_sessions").update({
                status: "completed", completed_at: new Date().toISOString(),
              }).eq("id", session.id);
            }
          } catch {
            // leave in submitted state; admin can re-run analyze
          }

          return Response.json({ ok: true, session_id: sessionId }, { headers: cors });
        }

        return Response.json({ ok: false, error: "unknown_action" }, { status: 404, headers: cors });
      },
    },
  },
});
