/**
 * Scheduling — Calendar Integration server functions (Stage 5).
 *
 * All account management, sync push/update/cancel and retry queue reads
 * go through here. Provider adapters live in `calendar.server.ts` and
 * are called from the sync job runner in the Integration Center.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CALENDAR_EVENTS } from "./events";

const uuid = z.string().uuid();

export const listCalendarAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("external_calendar_accounts")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const connectCalendarAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        provider: z.enum(["google", "outlook"]),
        provider_account_id: z.string().min(1),
        display_name: z.string().nullish(),
        owner_resource_id: uuid.nullish(),
        connection_id: uuid.nullish(),
        sync_direction: z.enum(["push", "pull", "two_way"]).default("push"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("external_calendar_accounts")
      .insert({
        tenant_id: data.tenant_id,
        provider: data.provider,
        provider_account_id: data.provider_account_id,
        display_name: data.display_name ?? null,
        owner_user_id: context.userId,
        owner_resource_id: data.owner_resource_id ?? null,
        connection_id: data.connection_id ?? null,
        sync_direction: data.sync_direction,
        sync_enabled: true,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type: CALENDAR_EVENTS.ACCOUNT_CONNECTED,
      _payload: {
        account_id: (row as { id: string }).id,
        provider: data.provider,
      } as never,
      _entity_ref: {
        type: "external_calendar_account",
        id: (row as { id: string }).id,
      } as never,
    });
    return { account: row };
  });

export const setCalendarSyncEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid, enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("external_calendar_accounts")
      .update({ sync_enabled: data.enabled } as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { account: row };
  });

export const disconnectCalendarAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("external_calendar_accounts")
      .select("tenant_id")
      .eq("id", data.id)
      .single();
    const { error } = await context.supabase
      .from("external_calendar_accounts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing) {
      await context.supabase.rpc("emit_automation_event", {
        _tenant_id: (existing as { tenant_id: string }).tenant_id,
        _event_type: CALENDAR_EVENTS.ACCOUNT_DISCONNECTED,
        _payload: { account_id: data.id } as never,
        _entity_ref: {
          type: "external_calendar_account",
          id: data.id,
        } as never,
      });
    }
    return { ok: true };
  });

/**
 * Enqueue a sync job through the existing integration_jobs retry queue.
 * Actual provider dispatch is handled by the shared job runner.
 */
export const queueCalendarSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        account_id: uuid,
        appointment_id: uuid,
        action: z.enum(["create", "update", "cancel", "delete"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: acct, error: acctErr } = await context.supabase
      .from("external_calendar_accounts")
      .select("provider,connection_id")
      .eq("id", data.account_id)
      .single();
    if (acctErr) throw new Error(acctErr.message);

    const { data: job, error } = await context.supabase
      .from("integration_jobs")
      .insert({
        tenant_id: data.tenant_id,
        provider_code: (acct as { provider: string }).provider,
        connection_id: (acct as { connection_id: string | null }).connection_id,
        job_type: `calendar.${data.action}`,
        payload: {
          account_id: data.account_id,
          appointment_id: data.appointment_id,
          action: data.action,
        } as never,
        status: "queued",
        next_run_at: new Date().toISOString(),
        idempotency_key: `${data.account_id}:${data.appointment_id}:${data.action}`,
      } as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { job };
  });

export const listCalendarSyncJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        status: z.string().nullish(),
        limit: z.number().int().positive().max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("integration_jobs")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .like("job_type", "calendar.%")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const markCalendarSyncResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        account_id: uuid,
        job_id: uuid,
        status: z.enum(["success", "failed"]),
        error: z.string().nullish(),
        external_ref: z.string().nullish(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("integration_jobs")
      .update({
        status: data.status === "success" ? "succeeded" : "failed",
        result: {
          external_ref: data.external_ref ?? null,
          error: data.error ?? null,
        } as never,
        last_error: data.error ?? null,
      } as never)
      .eq("id", data.job_id);
    await context.supabase
      .from("external_calendar_accounts")
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: data.status,
      } as never)
      .eq("id", data.account_id);
    await context.supabase.rpc("emit_automation_event", {
      _tenant_id: data.tenant_id,
      _event_type:
        data.status === "success"
          ? CALENDAR_EVENTS.SYNCED
          : CALENDAR_EVENTS.SYNC_FAILED,
      _payload: {
        job_id: data.job_id,
        account_id: data.account_id,
        error: data.error ?? null,
      } as never,
      _entity_ref: {
        type: "external_calendar_account",
        id: data.account_id,
      } as never,
    });
    return { ok: true };
  });
