/**
 * Public webhook receiver — routes any provider callback into integration_webhook_events.
 * URL: /api/public/webhooks/:slug
 * - Signature verification is best-effort using per-webhook secret_ref (Lovable secret).
 * - Always records the event; signature_valid flag captures verification result.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

export const Route = createFileRoute("/api/public/webhooks/$slug")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const rawBody = await request.text();
        const headersObj: Record<string, string> = {};
        request.headers.forEach((v, k) => (headersObj[k] = v));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: webhook } = await supabaseAdmin
          .from("integration_webhooks")
          .select("id, tenant_id, secret_ref, is_active, event_types")
          .eq("url_slug", params.slug)
          .maybeSingle();

        if (!webhook || !webhook.is_active) {
          return new Response("not_found", { status: 404 });
        }

        // Signature verification (generic: check common header names against HMAC-SHA256).
        let signatureValid = false;
        if (webhook.secret_ref) {
          const secret = process.env[webhook.secret_ref];
          if (secret) {
            const provided =
              request.headers.get("x-signature") ??
              request.headers.get("x-hub-signature-256") ??
              request.headers.get("x-razorpay-signature") ??
              "";
            const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
            const cleaned = provided.replace(/^sha256=/, "");
            try {
              signatureValid =
                cleaned.length === expected.length &&
                timingSafeEqual(Buffer.from(cleaned), Buffer.from(expected));
            } catch {
              signatureValid = false;
            }
          }
        } else {
          // No secret configured → accept but flag as unverified.
          signatureValid = false;
        }

        let payload: unknown = {};
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = { _raw: rawBody.slice(0, 8000) };
        }
        const eventType =
          (typeof payload === "object" && payload && "event" in payload
            ? String((payload as { event: unknown }).event)
            : null) ??
          request.headers.get("x-event-type") ??
          null;

        await supabaseAdmin.from("integration_webhook_events").insert({
          tenant_id: webhook.tenant_id,
          webhook_id: webhook.id,
          event_type: eventType,
          // biome-ignore lint/suspicious/noExplicitAny: JSON payload
          payload: payload as any,
          headers: headersObj,
          signature_valid: signatureValid,
          processed_at: new Date().toISOString(),
        });

        return Response.json({ ok: true, verified: signatureValid });
      },
    },
  },
});
