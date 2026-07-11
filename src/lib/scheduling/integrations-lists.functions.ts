/**
 * Scheduling — Integration Dashboard read-side server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime();

export const getIntegrationKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        from: isoDateTime,
        to: isoDateTime,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const [accounts, jobs, reminders] = await Promise.all([
      context.supabase
        .from("external_calendar_accounts")
        .select("provider,sync_enabled,last_sync_status", { count: "exact" })
        .eq("tenant_id", data.tenant_id),
      context.supabase
        .from("integration_jobs")
        .select("status,job_type")
        .eq("tenant_id", data.tenant_id)
        .like("job_type", "calendar.%")
        .gte("created_at", data.from)
        .lte("created_at", data.to),
      context.supabase
        .from("appointment_reminders")
        .select("status,channel")
        .eq("tenant_id", data.tenant_id)
        .gte("scheduled_at", data.from)
        .lte("scheduled_at", data.to),
    ]);
    if (accounts.error) throw new Error(accounts.error.message);
    if (jobs.error) throw new Error(jobs.error.message);
    if (reminders.error) throw new Error(reminders.error.message);

    const jobRows = jobs.data ?? [];
    const reminderRows = reminders.data ?? [];

    const successSyncs = jobRows.filter((r) => r.status === "succeeded").length;
    const failedSyncs = jobRows.filter((r) => r.status === "failed").length;
    const sentReminders = reminderRows.filter((r) => r.status === "sent").length;
    const failedReminders = reminderRows.filter(
      (r) => r.status === "failed",
    ).length;
    const totalReminders = reminderRows.length;

    return {
      connected_calendars: (accounts.data ?? []).length,
      enabled_calendars: (accounts.data ?? []).filter((a) => a.sync_enabled)
        .length,
      successful_syncs: successSyncs,
      failed_syncs: failedSyncs,
      reminder_success: sentReminders,
      reminder_failure: failedReminders,
      reminder_success_rate:
        totalReminders === 0
          ? 0
          : Math.round((sentReminders / totalReminders) * 1000) / 10,
    };
  });
