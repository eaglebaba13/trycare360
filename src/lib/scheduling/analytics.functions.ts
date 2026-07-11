/**
 * Scheduling Analytics — Stage 6.
 *
 * Every KPI here maps 1:1 to a definition in
 * `src/lib/analytics/kpi-definitions.md` (Scheduling KPI Contract).
 * These are pure read-side aggregations over data already produced by
 * Stage 2-5 (appointments, queue_tokens, capacity_plans, revenue_events,
 * appointment_feedback, appointment_reminders, integration_jobs,
 * appointment_reschedule, appointment_package_plans, appointment_series).
 *
 * No new business logic. UI never queries the database directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();
const iso = z.string().datetime();

const windowInput = z.object({
  tenant_id: uuid,
  branch_id: uuid.nullish(),
  from: iso,
  to: iso,
});

type Row = Record<string, unknown>;
const num = (v: unknown, d = 0) => (typeof v === "number" ? v : v == null ? d : Number(v) || d);
const str = (v: unknown) => (v == null ? "" : String(v));
const round1 = (n: number) => Math.round(n * 10) / 10;
const rate = (n: number, d: number) => (d > 0 ? n / d : 0);

// ---------- Executive dashboard -------------------------------------------

export const getSchedulingExecutiveKpis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowInput.parse(d))
  .handler(async ({ context, data }) => {
    let aq = context.supabase
      .from("appointments")
      .select(
        "id,status_code,starts_at,created_at,duration_minutes,is_walk_in,started_at,completed_at",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error: ae } = await aq;
    if (ae) throw new Error(ae.message);

    let tq = context.supabase
      .from("queue_tokens")
      .select("status,issued_at,called_at,completed_at,served_at")
      .eq("tenant_id", data.tenant_id)
      .gte("issued_at", data.from)
      .lte("issued_at", data.to);
    const { data: tokens, error: te } = await tq;
    if (te) throw new Error(te.message);

    let rq = context.supabase
      .from("appointment_reschedule")
      .select("original_starts_at,new_starts_at,created_at")
      .eq("tenant_id", data.tenant_id)
      .gte("created_at", data.from)
      .lte("created_at", data.to);
    const { data: reschedules } = await rq;

    const rows = (appts ?? []) as Row[];
    const total = rows.length;
    let completed = 0,
      cancelled = 0,
      noShow = 0,
      rescheduled = 0,
      checkedIn = 0,
      walkIn = 0,
      walkInCompleted = 0,
      bookedMinutes = 0,
      onTime = 0,
      started = 0,
      consultationMinutes = 0,
      consultationN = 0,
      leadSum = 0,
      leadN = 0;

    for (const a of rows) {
      const s = str(a.status_code);
      const dur = num(a.duration_minutes);
      bookedMinutes += dur;
      if (s === "completed") completed += 1;
      else if (s === "cancelled") cancelled += 1;
      else if (s === "no_show") noShow += 1;
      else if (s === "rescheduled" || s === "rescheduled_pending") rescheduled += 1;
      if (
        s === "checked_in" ||
        s === "arrived" ||
        s === "in_progress" ||
        s === "completed"
      )
        checkedIn += 1;
      if (a.is_walk_in) {
        walkIn += 1;
        if (s === "completed") walkInCompleted += 1;
      }
      if (a.started_at && a.starts_at) {
        started += 1;
        const delta =
          (Date.parse(str(a.started_at)) - Date.parse(str(a.starts_at))) / 60000;
        if (delta <= 10) onTime += 1;
      }
      if (a.started_at && a.completed_at) {
        const d2 =
          (Date.parse(str(a.completed_at)) - Date.parse(str(a.started_at))) /
          60000;
        if (d2 >= 0) {
          consultationMinutes += d2;
          consultationN += 1;
        }
      }
      if (a.created_at && a.starts_at) {
        const l =
          (Date.parse(str(a.starts_at)) - Date.parse(str(a.created_at))) /
          3600000;
        if (l >= 0) {
          leadSum += l;
          leadN += 1;
        }
      }
    }

    let waitSum = 0,
      waitN = 0,
      abandoned = 0;
    for (const t of (tokens ?? []) as Row[]) {
      const s = str(t.status);
      if (s === "abandoned" || s === "no_show") abandoned += 1;
      if (t.called_at && t.issued_at) {
        const w =
          (Date.parse(str(t.called_at)) - Date.parse(str(t.issued_at))) / 60000;
        if (w >= 0) {
          waitSum += w;
          waitN += 1;
        }
      }
    }

    let rDelaySum = 0,
      rDelayN = 0;
    for (const r of (reschedules ?? []) as Row[]) {
      if (r.new_starts_at && r.original_starts_at) {
        const d =
          (Date.parse(str(r.new_starts_at)) -
            Date.parse(str(r.original_starts_at))) /
          3600000;
        rDelaySum += Math.abs(d);
        rDelayN += 1;
      }
    }

    // Capacity minutes (best-effort — from capacity_plans if present)
    let cq = context.supabase
      .from("capacity_plans")
      .select("total_slots,slot_duration_minutes,plan_date")
      .eq("tenant_id", data.tenant_id)
      .gte("plan_date", data.from.slice(0, 10))
      .lte("plan_date", data.to.slice(0, 10));
    if (data.branch_id) cq = cq.eq("branch_id", data.branch_id);
    const { data: capRows } = await cq;
    const capacityMinutes = (capRows ?? []).reduce(
      (acc, c) =>
        acc + num((c as Row).total_slots) * num((c as Row).slot_duration_minutes, 15),
      0,
    );

    return {
      total,
      completed,
      cancelled,
      rescheduled: rescheduled + (reschedules?.length ?? 0),
      no_show: noShow,
      check_in_rate: rate(checkedIn, Math.max(1, total - cancelled)),
      completion_rate: rate(completed, Math.max(1, total - cancelled)),
      fill_rate: capacityMinutes > 0 ? rate(bookedMinutes, capacityMinutes) : 0,
      avg_wait_minutes: waitN ? round1(waitSum / waitN) : 0,
      avg_consultation_minutes: consultationN
        ? round1(consultationMinutes / consultationN)
        : 0,
      on_time_rate: rate(onTime, started),
      avg_lead_time_hours: leadN ? round1(leadSum / leadN) : 0,
      avg_reschedule_delay_hours: rDelayN ? round1(rDelaySum / rDelayN) : 0,
      walk_in_conversion_rate: rate(walkInCompleted, walkIn),
      queue_abandonment_rate: rate(abandoned, tokens?.length ?? 0),
    };
  });

// ---------- Resource analytics --------------------------------------------

export const getResourceAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    windowInput.extend({ working_hours_per_day: z.number().positive().default(8) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    let rq = context.supabase
      .from("resources")
      .select("id,name,resource_kind,branch_id,is_shared")
      .eq("tenant_id", data.tenant_id)
      .eq("is_active", true);
    if (data.branch_id) rq = rq.or(`branch_id.eq.${data.branch_id},is_shared.eq.true`);
    const { data: resources, error: re } = await rq;
    if (re) throw new Error(re.message);

    let aq = context.supabase
      .from("appointments")
      .select(
        "primary_resource_id,room_resource_id,doctor_id,duration_minutes,starts_at,branch_id",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .neq("status_code", "cancelled");
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error: ae } = await aq;
    if (ae) throw new Error(ae.message);

    const days = Math.max(
      1,
      Math.ceil(
        (Date.parse(data.to) - Date.parse(data.from)) / 86400000,
      ),
    );
    const availableMinutes = data.working_hours_per_day * 60 * days;

    const byResource = new Map<
      string,
      { minutes: number; count: number; hours: Map<number, number> }
    >();
    const byBranch = new Map<string, number>();
    const byKind = new Map<string, number>();
    const hourly = new Map<number, number>();

    for (const a of (appts ?? []) as Row[]) {
      const dur = num(a.duration_minutes);
      const hour = new Date(str(a.starts_at)).getHours();
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
      byBranch.set(str(a.branch_id), (byBranch.get(str(a.branch_id)) ?? 0) + dur);
      for (const key of ["primary_resource_id", "room_resource_id"] as const) {
        const id = a[key] ? str(a[key]) : "";
        if (!id) continue;
        const row = byResource.get(id) ?? { minutes: 0, count: 0, hours: new Map() };
        row.minutes += dur;
        row.count += 1;
        row.hours.set(hour, (row.hours.get(hour) ?? 0) + 1);
        byResource.set(id, row);
      }
    }

    const resourceRows = (resources ?? []).map((r) => {
      const row = byResource.get(str((r as Row).id)) ?? { minutes: 0, count: 0, hours: new Map() };
      byKind.set(
        str((r as Row).resource_kind),
        (byKind.get(str((r as Row).resource_kind)) ?? 0) + row.minutes,
      );
      let peak = 0,
        peakCount = 0;
      row.hours.forEach((c, h) => {
        if (c > peakCount) {
          peak = h;
          peakCount = c;
        }
      });
      return {
        id: str((r as Row).id),
        name: str((r as Row).name),
        kind: str((r as Row).resource_kind),
        branch_id: str((r as Row).branch_id),
        booked_minutes: row.minutes,
        appointment_count: row.count,
        idle_minutes: Math.max(0, availableMinutes - row.minutes),
        occupancy: rate(row.minutes, availableMinutes),
        peak_hour: peakCount > 0 ? peak : null,
      };
    });

    return {
      resources: resourceRows,
      by_branch: Array.from(byBranch, ([branch_id, minutes]) => ({
        branch_id,
        booked_minutes: minutes,
        utilization: rate(minutes, availableMinutes * Math.max(1, resourceRows.length)),
      })),
      by_kind: Array.from(byKind, ([kind, minutes]) => ({ kind, booked_minutes: minutes })),
      hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourly.get(h) ?? 0 })),
      available_minutes: availableMinutes,
    };
  });

// ---------- Capacity analytics --------------------------------------------

export const getCapacityAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowInput.parse(d))
  .handler(async ({ context, data }) => {
    let cq = context.supabase
      .from("capacity_plans")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .gte("plan_date", data.from.slice(0, 10))
      .lte("plan_date", data.to.slice(0, 10));
    if (data.branch_id) cq = cq.eq("branch_id", data.branch_id);
    const { data: plans, error } = await cq;
    if (error) throw new Error(error.message);

    let ac = context.supabase
      .from("appointments")
      .select("starts_at,duration_minutes,branch_id,status_code")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .neq("status_code", "cancelled");
    if (data.branch_id) ac = ac.eq("branch_id", data.branch_id);
    const { data: appts } = await ac;

    const perDay = new Map<
      string,
      { planned: number; used: number; walkin: number; emergency: number; vip: number }
    >();
    let totalPlanned = 0,
      totalUsed = 0,
      totalWalkin = 0,
      totalEmergency = 0,
      totalVip = 0,
      exhaustedDays = 0;
    const days = new Set<string>();

    for (const p of (plans ?? []) as Row[]) {
      const key = str(p.plan_date);
      const slot = num(p.slot_duration_minutes, 15);
      const planned = num(p.total_slots) * slot;
      const walkin = num(p.walk_in_reserve) * slot;
      const emergency = num(p.emergency_reserve) * slot;
      const vip = num(p.vip_reserve) * slot;
      const row = perDay.get(key) ?? { planned: 0, used: 0, walkin: 0, emergency: 0, vip: 0 };
      row.planned += planned;
      row.walkin += walkin;
      row.emergency += emergency;
      row.vip += vip;
      perDay.set(key, row);
      totalPlanned += planned;
      totalWalkin += walkin;
      totalEmergency += emergency;
      totalVip += vip;
      days.add(key);
    }
    for (const a of (appts ?? []) as Row[]) {
      const key = str(a.starts_at).slice(0, 10);
      const row = perDay.get(key) ?? { planned: 0, used: 0, walkin: 0, emergency: 0, vip: 0 };
      row.used += num(a.duration_minutes);
      perDay.set(key, row);
      totalUsed += num(a.duration_minutes);
      days.add(key);
    }
    perDay.forEach((v) => {
      if (v.planned > 0 && v.used >= v.planned) exhaustedDays += 1;
    });

    return {
      totals: {
        planned_minutes: totalPlanned,
        used_minutes: totalUsed,
        walk_in_reserve_minutes: totalWalkin,
        emergency_reserve_minutes: totalEmergency,
        vip_reserve_minutes: totalVip,
        exhaustion_rate: rate(exhaustedDays, days.size),
        utilization: rate(totalUsed, totalPlanned),
      },
      daily: Array.from(perDay, ([date, v]) => ({ date, ...v })).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  });

// ---------- Service analytics ---------------------------------------------

export const getServiceAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowInput.parse(d))
  .handler(async ({ context, data }) => {
    let aq = context.supabase
      .from("appointments")
      .select("service_id,doctor_id,status_code,person_id,series_id,package_id,duration_minutes")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error } = await aq;
    if (error) throw new Error(error.message);

    let rq = context.supabase
      .from("revenue_events")
      .select("amount,service_id,doctor_id,person_id,event_at,category")
      .eq("tenant_id", data.tenant_id)
      .gte("event_at", data.from)
      .lte("event_at", data.to);
    const { data: revs } = await rq;

    const bySvc = new Map<
      string,
      { service_id: string; count: number; completed: number; revenue: number; minutes: number }
    >();
    const byDoc = new Map<string, { doctor_id: string; count: number; revenue: number }>();
    let recurringTotal = 0,
      recurringCompleted = 0;

    for (const a of (appts ?? []) as Row[]) {
      const sid = str(a.service_id) || "unknown";
      const row = bySvc.get(sid) ?? {
        service_id: sid,
        count: 0,
        completed: 0,
        revenue: 0,
        minutes: 0,
      };
      row.count += 1;
      row.minutes += num(a.duration_minutes);
      if (str(a.status_code) === "completed") row.completed += 1;
      bySvc.set(sid, row);

      const did = str(a.doctor_id);
      if (did) {
        const d = byDoc.get(did) ?? { doctor_id: did, count: 0, revenue: 0 };
        d.count += 1;
        byDoc.set(did, d);
      }
      if (a.series_id) {
        recurringTotal += 1;
        if (str(a.status_code) === "completed") recurringCompleted += 1;
      }
    }
    let totalRevenue = 0;
    for (const r of (revs ?? []) as Row[]) {
      const amt = num(r.amount);
      totalRevenue += amt;
      const sid = str(r.service_id);
      if (sid && bySvc.has(sid)) bySvc.get(sid)!.revenue += amt;
      const did = str(r.doctor_id);
      if (did && byDoc.has(did)) byDoc.get(did)!.revenue += amt;
    }

    // Package progress
    let pq = context.supabase
      .from("appointment_package_plans")
      .select("*")
      .eq("tenant_id", data.tenant_id);
    const { data: packs } = await pq;
    let packTotal = 0,
      packDone = 0;
    for (const p of (packs ?? []) as Row[]) {
      packTotal += num((p as Row).total_sessions ?? (p as Row).sessions_total);
      packDone += num((p as Row).completed_sessions ?? (p as Row).sessions_completed);
    }

    return {
      services: Array.from(bySvc.values()).map((s) => ({
        ...s,
        completion_rate: rate(s.completed, s.count),
        revenue_per_appointment: rate(s.revenue, s.count),
      })),
      doctors: Array.from(byDoc.values()),
      revenue_total: totalRevenue,
      revenue_per_appointment: rate(totalRevenue, (appts ?? []).length),
      package_progress: {
        total_sessions: packTotal,
        completed_sessions: packDone,
        completion_rate: rate(packDone, packTotal),
      },
      recurring: {
        total: recurringTotal,
        completed: recurringCompleted,
        adherence: rate(recurringCompleted, recurringTotal),
      },
    };
  });

// ---------- Patient analytics ---------------------------------------------

export const getPatientAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowInput.parse(d))
  .handler(async ({ context, data }) => {
    let aq = context.supabase
      .from("appointments")
      .select("person_id,status_code")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts } = await aq;

    const perPerson = new Map<
      string,
      { count: number; cancelled: number; no_show: number; rescheduled: number }
    >();
    for (const a of (appts ?? []) as Row[]) {
      const pid = str(a.person_id);
      if (!pid) continue;
      const r = perPerson.get(pid) ?? { count: 0, cancelled: 0, no_show: 0, rescheduled: 0 };
      r.count += 1;
      const s = str(a.status_code);
      if (s === "cancelled") r.cancelled += 1;
      else if (s === "no_show") r.no_show += 1;
      else if (s === "rescheduled" || s === "rescheduled_pending") r.rescheduled += 1;
      perPerson.set(pid, r);
    }
    const persons = perPerson.size;
    let repeat = 0,
      cancelled = 0,
      noShow = 0,
      rescheduled = 0,
      total = 0;
    perPerson.forEach((r) => {
      if (r.count > 1) repeat += 1;
      cancelled += r.cancelled;
      noShow += r.no_show;
      rescheduled += r.rescheduled;
      total += r.count;
    });

    let fq = context.supabase
      .from("appointment_feedback")
      .select("rating,nps_score,created_at")
      .eq("tenant_id", data.tenant_id)
      .gte("created_at", data.from)
      .lte("created_at", data.to);
    const { data: feedback } = await fq;

    let ratingSum = 0,
      ratingN = 0,
      promoters = 0,
      detractors = 0,
      npsN = 0;
    for (const f of (feedback ?? []) as Row[]) {
      const r = num(f.rating);
      if (r > 0) {
        ratingSum += r;
        ratingN += 1;
      }
      const n = num(f.nps_score, -1);
      if (n >= 0) {
        npsN += 1;
        if (n >= 9) promoters += 1;
        else if (n <= 6) detractors += 1;
      }
    }

    return {
      distinct_patients: persons,
      repeat_visit_rate: rate(repeat, persons),
      cancellation_rate: rate(cancelled, total),
      no_show_rate: rate(noShow, total),
      reschedule_rate: rate(rescheduled, total),
      feedback_count: feedback?.length ?? 0,
      feedback_avg_rating: ratingN ? round1(ratingSum / ratingN) : 0,
      nps: npsN ? round1(((promoters - detractors) / npsN) * 100) : 0,
    };
  });

// ---------- Calendar & Communication analytics ----------------------------

export const getCommunicationAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowInput.parse(d))
  .handler(async ({ context, data }) => {
    const { data: reminders } = await context.supabase
      .from("appointment_reminders")
      .select("status,channel,scheduled_at,sent_at")
      .eq("tenant_id", data.tenant_id)
      .gte("scheduled_at", data.from)
      .lte("scheduled_at", data.to);

    const { data: jobs } = await context.supabase
      .from("integration_jobs")
      .select("status,kind,created_at")
      .eq("tenant_id", data.tenant_id)
      .gte("created_at", data.from)
      .lte("created_at", data.to);

    let vq = context.supabase
      .from("appointments")
      .select("id,video_url,video_provider,starts_at,status_code")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .not("video_url", "is", null);
    if (data.branch_id) vq = vq.eq("branch_id", data.branch_id);
    const { data: videos } = await vq;

    const rTotal = reminders?.length ?? 0;
    let rSent = 0,
      rFailed = 0;
    const byChannel = new Map<string, { sent: number; failed: number; total: number }>();
    for (const r of (reminders ?? []) as Row[]) {
      const s = str(r.status);
      const ch = str(r.channel) || "unknown";
      const row = byChannel.get(ch) ?? { sent: 0, failed: 0, total: 0 };
      row.total += 1;
      if (s === "sent" || s === "delivered") {
        rSent += 1;
        row.sent += 1;
      } else if (s === "failed" || s === "error") {
        rFailed += 1;
        row.failed += 1;
      }
      byChannel.set(ch, row);
    }

    let calTotal = 0,
      calOk = 0,
      calFail = 0;
    for (const j of (jobs ?? []) as Row[]) {
      const k = str(j.kind);
      if (!k.toLowerCase().includes("calendar")) continue;
      calTotal += 1;
      const s = str(j.status);
      if (s === "completed" || s === "success") calOk += 1;
      else if (s === "failed" || s === "error") calFail += 1;
    }

    return {
      reminders: {
        total: rTotal,
        sent: rSent,
        failed: rFailed,
        delivery_rate: rate(rSent, rTotal),
        failure_rate: rate(rFailed, rTotal),
        by_channel: Array.from(byChannel, ([channel, v]) => ({ channel, ...v })),
      },
      calendar_sync: {
        total: calTotal,
        success: calOk,
        failed: calFail,
        success_rate: rate(calOk, calTotal),
        failure_rate: rate(calFail, calTotal),
      },
      video: {
        total: videos?.length ?? 0,
        completed: (videos ?? []).filter((v) => str((v as Row).status_code) === "completed").length,
      },
    };
  });

// ---------- Report data (server-side rows for CSV/Excel/PDF) --------------

export const getSchedulingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    windowInput
      .extend({
        group_by: z.enum(["day", "branch", "doctor", "service", "franchise"]).default("day"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let aq = context.supabase
      .from("appointments")
      .select(
        "starts_at,branch_id,doctor_id,service_id,status_code,duration_minutes,franchise_id",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error } = await aq;
    if (error) throw new Error(error.message);

    const groups = new Map<
      string,
      { key: string; total: number; completed: number; cancelled: number; no_show: number; minutes: number }
    >();
    for (const a of (appts ?? []) as Row[]) {
      let k = "";
      if (data.group_by === "day") k = str(a.starts_at).slice(0, 10);
      else k = str(a[`${data.group_by}_id` as keyof Row]) || "unknown";
      const row =
        groups.get(k) ??
        { key: k, total: 0, completed: 0, cancelled: 0, no_show: 0, minutes: 0 };
      row.total += 1;
      row.minutes += num(a.duration_minutes);
      const s = str(a.status_code);
      if (s === "completed") row.completed += 1;
      else if (s === "cancelled") row.cancelled += 1;
      else if (s === "no_show") row.no_show += 1;
      groups.set(k, row);
    }
    return {
      group_by: data.group_by,
      rows: Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key)),
    };
  });
