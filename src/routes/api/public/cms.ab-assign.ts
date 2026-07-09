/**
 * Sticky A/B variant assignment.
 * POST /api/public/cms/ab-assign { experiment_id, visitor_id } -> { variant }
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  experiment_id: z.string().uuid(),
  visitor_id: z.string().min(6).max(64),
});
const cors = { "access-control-allow-origin": "*" } as Record<string, string>;

export const Route = createFileRoute("/api/public/cms/ab-assign")({
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
        if (!parsed.success) return Response.json({ ok: false }, { status: 400, headers: cors });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: exp } = await supabaseAdmin
          .from("cms_ab_experiments")
          .select("id, status, traffic_split")
          .eq("id", parsed.data.experiment_id)
          .maybeSingle();
        if (!exp || exp.status !== "running") return Response.json({ variant: "A" }, { headers: cors });
        const { data: existing } = await supabaseAdmin
          .from("cms_ab_assignments")
          .select("variant")
          .eq("experiment_id", parsed.data.experiment_id)
          .eq("visitor_id", parsed.data.visitor_id)
          .maybeSingle();
        if (existing) return Response.json({ variant: existing.variant }, { headers: cors });
        const split = (exp.traffic_split as number) ?? 50;
        const variant = Math.random() * 100 < split ? "A" : "B";
        await supabaseAdmin.from("cms_ab_assignments").insert({
          experiment_id: parsed.data.experiment_id,
          visitor_id: parsed.data.visitor_id,
          variant,
        });
        return Response.json({ variant }, { headers: cors });
      },
    },
  },
});
