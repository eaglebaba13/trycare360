/**
 * Scheduling — Queue read-side server functions (Stage 4).
 *
 * These are pure reads that power the queue dashboard, monitor, reception,
 * check-in workspace, token display and analytics screens. All write paths
 * remain in `queue.functions.ts` and `appointments.functions.ts` — no
 * business logic is duplicated here.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime();

const tenantBranch = z.object({
  tenant_id: uuid,
  branch_id: uuid.nullish(),
});

// ---------- Queues ---------------------------------------------------------

export const listQueues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    tenantBranch
      .extend({
        queue_date: z.string().optional(),
        queue_type: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointment_queue")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("name");
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    if (data.queue_date) q = q.eq("queue_date", data.queue_date);
    if (data.queue_type) q = q.eq("queue_type", data.queue_type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ---------- Tokens ---------------------------------------------------------

export const listQueueTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        queue_id: uuid.nullish(),
        branch_id: uuid.nullish(),
        statuses: z.array(z.string()).nullish(),
        limit: z.number().int().positive().max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("queue_tokens")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("priority", { ascending: false })
      .order("token_number", { ascending: true })
      .limit(data.limit);
    if (data.queue_id) q = q.eq("queue_id", data.queue_id);
    if (data.statuses && data.statuses.length)
      q = q.in("status", data.statuses);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ---------- Queue KPIs -----------------------------------------------------

export const getQueueKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid.nullish(),
        day_start: isoDateTime,
        day_end: isoDateTime,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // Tokens in the window
    let tq = context.supabase
      .from("queue_tokens")
      .select("status,issued_at,called_at,served_at,completed_at,queue_id")
      .eq("tenant_id", data.tenant_id)
      .gte("issued_at", data.day_start)
      .lte("issued_at", data.day_end);
    const { data: tokens, error: te } = await tq;
    if (te) throw new Error(te.message);

    // Appointment status counts (for no-show + in_consultation cross-check)
    let aq = context.supabase
      .from("appointments")
      .select("status_code,branch_id")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.day_start)
      .lte("starts_at", data.day_end);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error: ae } = await aq;
    if (ae) throw new Error(ae.message);

    const counts = {
      waiting: 0,
      called: 0,
      in_consultation: 0,
      completed: 0,
      no_show: 0,
      sla_alerts: 0,
      avg_wait_minutes: 0,
    };

    let waitSum = 0;
    let waitN = 0;
    for (const t of tokens ?? []) {
      const s = String(t.status);
      if (s === "waiting" || s === "recalled") counts.waiting += 1;
      else if (s === "called") counts.called += 1;
      else if (s === "in_service" || s === "in_consultation")
        counts.in_consultation += 1;
      else if (s === "completed" || s === "served") counts.completed += 1;

      if (t.called_at && t.issued_at) {
        const w =
          (Date.parse(String(t.called_at)) -
            Date.parse(String(t.issued_at))) /
          60000;
        if (w >= 0) {
          waitSum += w;
          waitN += 1;
          if (w >= 30) counts.sla_alerts += 1;
        }
      }
    }
    counts.avg_wait_minutes = waitN
      ? Math.round((waitSum / waitN) * 10) / 10
      : 0;

    for (const a of appts ?? []) {
      const s = String(a.status_code);
      if (s === "no_show") counts.no_show += 1;
      else if (s === "in_progress") counts.in_consultation += 1;
    }

    return counts;
  });

// ---------- Reception: upcoming/expected patients --------------------------

export const listExpectedArrivals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid.nullish(),
        window_start: isoDateTime,
        window_end: isoDateTime,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointments")
      .select(
        "id,appointment_code,starts_at,duration_minutes,status_code,person_id,doctor_id,branch_id,is_walk_in,is_vip,is_emergency",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.window_start)
      .lte("starts_at", data.window_end)
      .in("status_code", [
        "booked",
        "scheduled",
        "confirmed",
        "arrived",
        "checked_in",
      ])
      .order("starts_at");
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ---------- No-show list ---------------------------------------------------

export const listRecentNoShows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid.nullish(),
        from: isoDateTime,
        to: isoDateTime,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointments")
      .select(
        "id,appointment_code,person_id,doctor_id,branch_id,starts_at,no_show_at,status_code",
      )
      .eq("tenant_id", data.tenant_id)
      .eq("status_code", "no_show")
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .order("no_show_at", { ascending: false });
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ---------- Queue analytics ------------------------------------------------

export const getQueueAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid.nullish(),
        from: isoDateTime,
        to: isoDateTime,
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: tokens, error } = await context.supabase
      .from("queue_tokens")
      .select("queue_id,status,issued_at,called_at,served_at,completed_at")
      .eq("tenant_id", data.tenant_id)
      .gte("issued_at", data.from)
      .lte("issued_at", data.to);
    if (error) throw new Error(error.message);

    const perQueue = new Map<
      string,
      {
        queue_id: string;
        total: number;
        waiting_now: number;
        avg_wait: number;
        avg_service: number;
        sla_breaches: number;
      }
    >();
    let totalWait = 0;
    let waitN = 0;
    let totalService = 0;
    let serviceN = 0;

    for (const t of tokens ?? []) {
      const id = String(t.queue_id);
      const row =
        perQueue.get(id) ??
        {
          queue_id: id,
          total: 0,
          waiting_now: 0,
          avg_wait: 0,
          avg_service: 0,
          sla_breaches: 0,
        };
      row.total += 1;
      const s = String(t.status);
      if (s === "waiting" || s === "recalled") row.waiting_now += 1;

      if (t.called_at && t.issued_at) {
        const w =
          (Date.parse(String(t.called_at)) -
            Date.parse(String(t.issued_at))) /
          60000;
        if (w >= 0) {
          row.avg_wait = (row.avg_wait * (row.total - 1) + w) / row.total;
          totalWait += w;
          waitN += 1;
          if (w >= 30) row.sla_breaches += 1;
        }
      }
      const finish = t.completed_at ?? t.served_at;
      if (finish && t.called_at) {
        const s2 =
          (Date.parse(String(finish)) - Date.parse(String(t.called_at))) /
          60000;
        if (s2 >= 0) {
          row.avg_service =
            (row.avg_service * (row.total - 1) + s2) / row.total;
          totalService += s2;
          serviceN += 1;
        }
      }
      perQueue.set(id, row);
    }

    return {
      queues: Array.from(perQueue.values()).map((r) => ({
        ...r,
        avg_wait: Math.round(r.avg_wait * 10) / 10,
        avg_service: Math.round(r.avg_service * 10) / 10,
      })),
      overall: {
        avg_wait_minutes: waitN ? Math.round((totalWait / waitN) * 10) / 10 : 0,
        avg_service_minutes: serviceN
          ? Math.round((totalService / serviceN) * 10) / 10
          : 0,
        total_tokens: tokens?.length ?? 0,
      },
    };
  });
