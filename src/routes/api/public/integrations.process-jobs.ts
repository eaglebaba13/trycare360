/**
 * Job worker — pulls pending integration_jobs and dispatches them.
 * Called by pg_cron using the Supabase anon key in the `apikey` header.
 * URL: /api/public/integrations/process-jobs
 */
import { createFileRoute } from "@tanstack/react-router";
import { dispatch } from "@/lib/integrations/dispatcher.server";

const BATCH_SIZE = 25;

export const Route = createFileRoute("/api/public/integrations/process-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        const provided = request.headers.get("apikey");
        if (!anon || provided !== anon) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();

        const { data: jobs } = await supabaseAdmin
          .from("integration_jobs")
          .select("*")
          .in("status", ["pending", "failed"])
          .lte("next_run_at", nowIso)
          .order("next_run_at", { ascending: true })
          .limit(BATCH_SIZE);

        const jobList = (jobs ?? []) as Array<{
          id: string;
          tenant_id: string;
          provider_code: string;
          job_type: string;
          payload: Record<string, unknown>;
          attempts: number;
          max_attempts: number;
        }>;

        let processed = 0;
        let succeeded = 0;
        let failed = 0;

        for (const job of jobList) {
          await supabaseAdmin.from("integration_jobs").update({ status: "running", attempts: job.attempts + 1 }).eq("id", job.id);
          const result = await dispatch({
            supabase: supabaseAdmin,
            tenantId: job.tenant_id,
            providerCode: job.provider_code,
            action: job.job_type,
            payload: job.payload,
          });
          processed++;
          if (result.ok) {
            succeeded++;
            await supabaseAdmin
              .from("integration_jobs")
              .update({ status: "success", result: result.result as never, last_error: null })
              .eq("id", job.id);
          } else {
            failed++;
            const attempts = job.attempts + 1;
            const isDead = !result.retryable || attempts >= job.max_attempts;
            const backoffMs = Math.min(3600_000, 1000 * 2 ** attempts);
            await supabaseAdmin
              .from("integration_jobs")
              .update({
                status: isDead ? "dead" : "failed",
                last_error: result.error,
                next_run_at: new Date(Date.now() + backoffMs).toISOString(),
              })
              .eq("id", job.id);
          }
        }

        return Response.json({ processed, succeeded, failed });
      },
    },
  },
});
