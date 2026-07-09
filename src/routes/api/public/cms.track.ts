/**
 * Marketing tracking beacon.
 * POST /api/public/cms/track  { page_id?, event_type, utm?, session_id?, visitor_id?, meta? }
 * Writes to cms_tracking_events. Non-blocking; returns 204.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createHash } from "crypto";

const schema = z.object({
  page_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  event_type: z.enum(["page_view", "cta_click", "form_view", "lead_submit", "ab_view", "ab_convert", "custom"]),
  session_id: z.string().max(64).optional(),
  visitor_id: z.string().max(64).optional(),
  path: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
  first_touch: z.record(z.string(), z.string()).optional(),
  last_touch: z.record(z.string(), z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/cms/track")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "access-control-allow-origin": "*" } as Record<string, string>;
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("bad json", { status: 400, headers: cors });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return new Response("invalid", { status: 400, headers: cors });
        const d = parsed.data;
        const ipHeader =
          request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "";
        const ipHash = ipHeader ? createHash("sha256").update(ipHeader).digest("hex").slice(0, 32) : null;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let tenant_id = d.tenant_id ?? null;
          if (!tenant_id && d.page_id) {
            const { data: page } = await supabaseAdmin
              .from("cms_pages")
              .select("tenant_id")
              .eq("id", d.page_id)
              .maybeSingle();
            tenant_id = (page?.tenant_id as string) ?? null;
          }
          await supabaseAdmin.from("cms_tracking_events").insert({
            tenant_id,
            page_id: d.page_id ?? null,
            event_type: d.event_type,
            session_id: d.session_id ?? null,
            visitor_id: d.visitor_id ?? null,
            path: d.path ?? null,
            referrer: d.referrer ?? null,
            utm_source: d.utm?.utm_source ?? null,
            utm_medium: d.utm?.utm_medium ?? null,
            utm_campaign: d.utm?.utm_campaign ?? null,
            utm_content: d.utm?.utm_content ?? null,
            utm_term: d.utm?.utm_term ?? null,
            first_touch: (d.first_touch ?? null) as never,
            last_touch: (d.last_touch ?? null) as never,
            meta: (d.meta ?? {}) as never,
            user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
            ip_hash: ipHash,
          });
        } catch {
          // never leak errors from a tracking beacon
        }
        return new Response(null, { status: 204, headers: cors });
      },
    },
  },
});
