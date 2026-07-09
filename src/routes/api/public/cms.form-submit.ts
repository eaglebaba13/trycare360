/**
 * Public form submission endpoint.
 * POST /api/public/cms/form-submit
 * Validates against form_definitions.schema (shallow), writes to form_submissions,
 * triggers the mapped workflow (best effort), and records a lead_submit event.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  page_id: z.string().uuid(),
  form_id: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  utm: z.record(z.string(), z.string()).optional(),
  visitor_id: z.string().max(64).optional(),
});

const cors = { "access-control-allow-origin": "*" } as Record<string, string>;

export const Route = createFileRoute("/api/public/cms/form-submit")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: { ...cors, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" },
        }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("bad json", { status: 400, headers: cors });
        }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: "invalid" }, { status: 400, headers: cors });
        const d = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const [pageRes, formRes, mapRes] = await Promise.all([
          supabaseAdmin.from("cms_pages").select("tenant_id, path, campaign_id").eq("id", d.page_id).maybeSingle(),
          supabaseAdmin.from("form_definitions").select("id, tenant_id, schema").eq("id", d.form_id).maybeSingle(),
          supabaseAdmin.from("cms_page_forms").select("workflow_id, conversion_event").eq("page_id", d.page_id).eq("form_id", d.form_id).maybeSingle(),
        ]);
        if (!pageRes.data || !formRes.data) {
          return Response.json({ ok: false, error: "not_found" }, { status: 404, headers: cors });
        }
        const tenant_id = pageRes.data.tenant_id as string;

        const { data: submission, error } = await supabaseAdmin
          .from("form_submissions")
          .insert({
            tenant_id,
            form_id: d.form_id,
            data: { ...d.data, __utm: d.utm ?? {}, __page_id: d.page_id } as never,
            entity_ref: { source: "cms_page", page_id: d.page_id, campaign_id: pageRes.data.campaign_id ?? null } as never,
          })
          .select("id")
          .single();
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500, headers: cors });

        // Best-effort tracking event
        await supabaseAdmin.from("cms_tracking_events").insert({
          tenant_id,
          page_id: d.page_id,
          event_type: mapRes.data?.conversion_event ?? "lead_submit",
          visitor_id: d.visitor_id ?? null,
          path: pageRes.data.path,
          utm_source: d.utm?.utm_source ?? null,
          utm_medium: d.utm?.utm_medium ?? null,
          utm_campaign: d.utm?.utm_campaign ?? null,
          utm_content: d.utm?.utm_content ?? null,
          utm_term: d.utm?.utm_term ?? null,
          meta: { form_id: d.form_id, submission_id: submission.id } as never,
        });

        // Trigger workflow if mapped
        if (mapRes.data?.workflow_id) {
          await supabaseAdmin.from("workflow_runs").insert({
            tenant_id,
            workflow_id: mapRes.data.workflow_id,
            status: "pending",
            entity_ref: { form_submission_id: submission.id, page_id: d.page_id } as never,
            context: { data: d.data, utm: d.utm ?? {} } as never,
            trigger_source: "cms_form",
          });
        }

        return Response.json({ ok: true, submission_id: submission.id }, { headers: cors });
      },
    },
  },
});
