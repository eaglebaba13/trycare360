/**
 * Public Lead Intake — /api/public/leads/intake/$provider
 *
 * Providers: meta | google | whatsapp | web_form | ai_consultation
 *
 * Security model:
 *   1. Caller passes ?tenant=<uuid> query param.
 *   2. Caller signs the raw request body with a per-tenant secret and
 *      passes the HMAC-SHA256 hex digest in `X-Intake-Signature`.
 *   3. Secret name resolved from lead_channel_mappings.meta.intake_secret_ref
 *      (`process.env[<secret_ref>]`), falling back to
 *      `LEAD_INTAKE_SECRET_<TENANT>`.
 *   4. Every raw payload is stored to integration_webhook_events for audit.
 *   5. Body normalized by provider adapter and passed to the same
 *      `intakeLead()` service used by internal callers — one code path,
 *      one identity dedup, one assignment rule engine, one SLA start.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

type Provider = "meta" | "google" | "whatsapp" | "web_form" | "ai_consultation";

const PROVIDERS: readonly Provider[] = ["meta", "google", "whatsapp", "web_form", "ai_consultation"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function resolveSecret(
  supabaseAdmin: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          a: string,
          v: string,
        ) => {
          eq: (
            a: string,
            v: string,
          ) => { maybeSingle: () => Promise<{ data: { meta: Record<string, unknown> } | null }> };
        };
      };
    };
  },
  tenantId: string,
  provider: Provider,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("lead_channel_mappings")
    .select("meta")
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .maybeSingle();
  const ref = (data?.meta as Record<string, unknown> | undefined)?.intake_secret_ref;
  if (typeof ref === "string" && ref && process.env[ref]) return process.env[ref] as string;
  const fallback = `LEAD_INTAKE_SECRET_${tenantId.replace(/-/g, "").toUpperCase()}`;
  return process.env[fallback] ?? null;
}

function verify(rawBody: string, provided: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const clean = provided.replace(/^sha256=/, "");
  if (clean.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(clean), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/leads/intake/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider as Provider;
        if (!PROVIDERS.includes(provider)) return json({ error: "unknown_provider" }, 404);

        const url = new URL(request.url);
        const tenantId = url.searchParams.get("tenant") ?? "";
        if (!tenantId) return json({ error: "missing_tenant" }, 400);

        const rawBody = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Signature verification (best-effort; some providers only send HMAC
        // in a specific header, so we accept several common names).
        const provided =
          request.headers.get("x-intake-signature") ??
          request.headers.get("x-hub-signature-256") ??
          request.headers.get("x-goog-signature") ??
          request.headers.get("x-signature") ??
          "";
        // biome-ignore lint/suspicious/noExplicitAny: dynamic admin client
        const secret = await resolveSecret(supabaseAdmin as any, tenantId, provider);
        const signatureValid = !!secret && !!provided && verify(rawBody, provided, secret);

        // Audit BEFORE work so failures still leave a trace.
        const headersObj: Record<string, string> = {};
        request.headers.forEach((v, k) => (headersObj[k] = v));
        // biome-ignore lint/suspicious/noExplicitAny: dynamic admin client
        await (supabaseAdmin as any).from("integration_webhook_events").insert({
          tenant_id: tenantId,
          event_type: `lead.intake.${provider}`,
          payload,
          headers: headersObj,
          signature_valid: signatureValid,
        });

        if (secret && !signatureValid) {
          return json({ error: "invalid_signature" }, 401);
        }

        const {
          normalizeMetaLead,
          normalizeGoogleLead,
          normalizeWhatsAppLead,
          normalizeWebFormLead,
          normalizeAiConsultationLead,
          intakeLead,
        } = await import("@/lib/leads/intake.server");

        let normalized;
        switch (provider) {
          case "meta":
            normalized = normalizeMetaLead(tenantId, payload);
            break;
          case "google":
            normalized = normalizeGoogleLead(tenantId, payload);
            break;
          case "whatsapp":
            normalized = normalizeWhatsAppLead(tenantId, payload);
            break;
          case "web_form":
            normalized = normalizeWebFormLead(tenantId, payload);
            break;
          case "ai_consultation":
            normalized = normalizeAiConsultationLead(tenantId, payload);
            break;
        }

        try {
          // biome-ignore lint/suspicious/noExplicitAny: dynamic admin client
          const result = await intakeLead(supabaseAdmin as any, normalized);
          return json({ ok: true, ...result });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return json({ ok: false, error: msg }, 500);
        }
      },
    },
  },
});
