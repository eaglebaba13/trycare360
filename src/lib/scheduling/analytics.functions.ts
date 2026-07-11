/**
 * Scheduling Analytics — Stage 6.
 *
 * Every KPI here maps 1:1 to a definition in
 * `src/lib/analytics/kpi-definitions.md` (Scheduling KPI Contract).
 * Pure read-side aggregations over data already produced by Stage 2-5.
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
const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const num = (v: unknown, d = 0) =>
  typeof v === "number" ? v : v == null ? d : Number(v) || d;
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
        "id,status_code,starts_at,created_at,duration_minutes,is_walk_in,consult_started_at,consult_completed_at,branch_id",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error: ae } = await aq;
    if (ae) throw new Error(ae.message);

    const { data: tokens, error: te } = await context.supabase
      .from("queue_tokens")
      .select("status,issued_at,called_at,completed_at,served_at")
      .eq("tenant_id", data.tenant_id)
      .gte("issued_at", data.from)
      .lte("issued_at", data.to);
    if (te) throw new Error(te.message);

    const { data: reschedules } = await context.supabase
      .from("appointment_reschedule")
      .select("from_starts_at,to_starts_at,created_at")
      .eq("tenant_id", data.tenant_id)
      .gte("created_at", data.from)
      .lte("created_at", data.to);

    const rows = asRows(appts);
    const total = rows.length;
    let completed = 0,
      cancelled = 0,
      noShow = 0,
      rescheduledStatus = 0,
      checkedIn = 0,
      walkIn = 0,
      walkInCompleted = 0,
      bookedMinutes = 0,
      onTime = 0,
      started = 0,
      consultMin = 0,
      consultN = 0,
      leadSum = 0,
      leadN = 0;

    for (const a of rows) {
      const s = str(a.status_code);
      const dur = num(a.duration_minutes);
      bookedMinutes += dur;
      if (s === "completed") completed += 1;
      else if (s === "cancelled") cancelled += 1;
      else if (s === "no_show") noShow += 1;
      else if (s === "rescheduled" || s === "rescheduled_pending") rescheduledStatus += 1;
      if (["checked_in", "arrived", "in_progress", "completed"].includes(s)) checkedIn += 1;
      if (a.is_walk_in) {
        walkIn += 1;
        if (s === "completed") walkInCompleted += 1;
      }
      if (a.consult_started_at && a.starts_at) {
        started += 1;
        const delta =
          (Date.parse(str(a.consult_started_at)) - Date.parse(str(a.starts_at))) / 60000;
        if (delta <= 10) onTime += 1;
      }
      if (a.consult_started_at && a.consult_completed_at) {
        const d2 =
          (Date.parse(str(a.consult_completed_at)) -
            Date.parse(str(a.consult_started_at))) /
          60000;
        if (d2 >= 0) {
          consultMin += d2;
          consultN += 1;
        }
      }
      if (a.created_at && a.starts_at) {
        const l =
          (Date.parse(str(a.starts_at)) - Date.parse(str(a.created_at))) / 3600000;
        if (l >= 0) {
          leadSum += l;
          leadN += 1;
        }
      }
    }

    let waitSum = 0,
      waitN = 0,
      abandoned = 0;
    for (const t of asRows(tokens)) {
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
    for (const r of asRows(reschedules)) {
      if (r.to_starts_at && r.from_starts_at) {
        const d =
          (Date.parse(str(r.to_starts_at)) - Date.parse(str(r.from_starts_at))) /
          3600000;
        rDelaySum += Math.abs(d);
        rDelayN += 1;
      }
    }

    // Capacity (best-effort) — from capacity_dimensions (max_units per bucket).
    // Treat max_units as slot count with a nominal 15-min slot for a rough fill%.
    const { data: capDims } = await context.supabase
      .from("capacity_dimensions")
      .select("max_units,dimension,plan_id")
      .eq("tenant_id", data.tenant_id);
    const capacityMinutes = asRows(capDims).reduce(
      (acc, c) => acc + num(c.max_units) * 15,
      0,
    );

    return {
      total,
      completed,
      cancelled,
      rescheduled: rescheduledStatus + (reschedules?.length ?? 0),
      no_show: noShow,
      check_in_rate: rate(checkedIn, Math.max(1, total - cancelled)),
      completion_rate: rate(completed, Math.max(1, total - cancelled)),
      fill_rate: capacityMinutes > 0 ? rate(bookedMinutes, capacityMinutes) : 0,
      avg_wait_minutes: waitN ? round1(waitSum / waitN) : 0,
      avg_consultation_minutes: consultN ? round1(consultMin / consultN) : 0,
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
        "primary_resource_id,room_resource_id,doctor_id,duration_minutes,starts_at,branch_id,franchise_id,status_code",
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
      Math.ceil((Date.parse(data.to) - Date.parse(data.from)) / 86400000),
    );
    const availableMinutes = data.working_hours_per_day * 60 * days;

    const byResource = new Map<
      string,
      { minutes: number; count: number; hours: Map<number, number> }
    >();
    const byBranch = new Map<string, number>();
    const byFranchise = new Map<string, number>();
    const byKind = new Map<string, number>();
    const hourly = new Map<number, number>();

    for (const a of asRows(appts)) {
      const dur = num(a.duration_minutes);
      const hour = new Date(str(a.starts_at)).getHours();
      hourly.set(hour, (hourly.get(hour) ?? 0) + 1);
      const bkey = str(a.branch_id);
      if (bkey) byBranch.set(bkey, (byBranch.get(bkey) ?? 0) + dur);
      const fkey = str(a.franchise_id);
      if (fkey) byFranchise.set(fkey, (byFranchise.get(fkey) ?? 0) + dur);
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

    const resourceRows = asRows(resources).map((r) => {
      const row = byResource.get(str(r.id)) ?? { minutes: 0, count: 0, hours: new Map<number, number>() };
      const kind = str(r.resource_kind);
      byKind.set(kind, (byKind.get(kind) ?? 0) + row.minutes);
      let peak = 0,
        peakCount = 0;
      row.hours.forEach((c, h) => {
        if (c > peakCount) {
          peak = h;
          peakCount = c;
        }
      });
      return {
        id: str(r.id),
        name: str(r.name),
        kind,
        branch_id: str(r.branch_id),
        booked_minutes: row.minutes,
        appointment_count: row.count,
        idle_minutes: Math.max(0, availableMinutes - row.minutes),
        occupancy: rate(row.minutes, availableMinutes),
        peak_hour: peakCount > 0 ? peak : null,
      };
    });

    const denom = availableMinutes * Math.max(1, resourceRows.length);
    return {
      resources: resourceRows,
      by_branch: Array.from(byBranch, ([branch_id, minutes]) => ({
        branch_id,
        booked_minutes: minutes,
        utilization: rate(minutes, denom),
      })),
      by_franchise: Array.from(byFranchise, ([franchise_id, minutes]) => ({
        franchise_id,
        booked_minutes: minutes,
        utilization: rate(minutes, denom),
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
      .select("id,code,name,status,branch_id,effective_from,effective_to,meta")
      .eq("tenant_id", data.tenant_id);
    if (data.branch_id) cq = cq.eq("branch_id", data.branch_id);
    const { data: plans, error } = await cq;
    if (error) throw new Error(error.message);

    const { data: dims } = await context.supabase
      .from("capacity_dimensions")
      .select("plan_id,dimension,max_units,soft_max_units")
      .eq("tenant_id", data.tenant_id);

    let ac = context.supabase
      .from("appointments")
      .select("starts_at,duration_minutes,branch_id,status_code")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .neq("status_code", "cancelled");
    if (data.branch_id) ac = ac.eq("branch_id", data.branch_id);
    const { data: appts } = await ac;

    const SLOT = 15;
    const planIds = new Set(asRows(plans).map((p) => str(p.id)));
    let plannedUnits = 0,
      walkin = 0,
      emergency = 0,
      vip = 0;
    for (const d of asRows(dims)) {
      if (!planIds.has(str(d.plan_id))) continue;
      const u = num(d.max_units);
      plannedUnits += u;
      const dim = str(d.dimension).toLowerCase();
      if (dim.includes("walk")) walkin += u;
      else if (dim.includes("emerg")) emergency += u;
      else if (dim.includes("vip")) vip += u;
    }
    const plannedMinutes = plannedUnits * SLOT;
    const walkinMinutes = walkin * SLOT;
    const emergencyMinutes = emergency * SLOT;
    const vipMinutes = vip * SLOT;

    const perDay = new Map<string, { date: string; used: number; count: number }>();
    let totalUsed = 0;
    for (const a of asRows(appts)) {
      const key = str(a.starts_at).slice(0, 10);
      const row = perDay.get(key) ?? { date: key, used: 0, count: 0 };
      row.used += num(a.duration_minutes);
      row.count += 1;
      perDay.set(key, row);
      totalUsed += num(a.duration_minutes);
    }

    const days = Math.max(
      1,
      Math.ceil((Date.parse(data.to) - Date.parse(data.from)) / 86400000),
    );
    const perDayPlanned = plannedMinutes; // treated as daily capacity
    let exhaustedDays = 0;
    perDay.forEach((v) => {
      if (perDayPlanned > 0 && v.used >= perDayPlanned) exhaustedDays += 1;
    });

    return {
      totals: {
        plans: plans?.length ?? 0,
        planned_minutes_per_day: plannedMinutes,
        planned_minutes_window: plannedMinutes * days,
        used_minutes: totalUsed,
        walk_in_reserve_minutes: walkinMinutes,
        emergency_reserve_minutes: emergencyMinutes,
        vip_reserve_minutes: vipMinutes,
        exhaustion_rate: rate(exhaustedDays, days),
        utilization: rate(totalUsed, plannedMinutes * days),
      },
      daily: Array.from(perDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    };
  });

// ---------- Service analytics ---------------------------------------------

export const getServiceAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => windowInput.parse(d))
  .handler(async ({ context, data }) => {
    let aq = context.supabase
      .from("appointments")
      .select(
        "service_id,doctor_id,status_code,person_id,series_id,package_id,duration_minutes",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error } = await aq;
    if (error) throw new Error(error.message);

    // revenue_events has no service_id — link by treatment_id (service proxy) & doctor_id.
    const { data: revs } = await context.supabase
      .from("revenue_events")
      .select("amount,treatment_id,doctor_id,person_id,occurred_at,category")
      .eq("tenant_id", data.tenant_id)
      .gte("occurred_at", data.from)
      .lte("occurred_at", data.to);

    const bySvc = new Map<
      string,
      {
        service_id: string;
        count: number;
        completed: number;
        revenue: number;
        minutes: number;
      }
    >();
    const byDoc = new Map<string, { doctor_id: string; count: number; revenue: number }>();
    let recurringTotal = 0,
      recurringCompleted = 0;

    for (const a of asRows(appts)) {
      const sid = str(a.service_id) || "unknown";
      const row =
        bySvc.get(sid) ??
        { service_id: sid, count: 0, completed: 0, revenue: 0, minutes: 0 };
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
    for (const r of asRows(revs)) {
      const amt = num(r.amount);
      totalRevenue += amt;
      const sid = str(r.treatment_id);
      if (sid && bySvc.has(sid)) bySvc.get(sid)!.revenue += amt;
      const did = str(r.doctor_id);
      if (did && byDoc.has(did)) byDoc.get(did)!.revenue += amt;
    }

    // Package progress — count plans and their items via appointments with package_id.
    const { data: packs } = await context.supabase
      .from("appointment_package_plans")
      .select("id,name,code")
      .eq("tenant_id", data.tenant_id);
    const { data: packItems } = await context.supabase
      .from("appointment_package_items")
      .select("plan_id,service_id,sequence_no")
      .eq("tenant_id", data.tenant_id);
    const totalItems = packItems?.length ?? 0;
    const packageAppts = asRows(appts).filter((a) => a.package_id);
    const packageCompleted = packageAppts.filter(
      (a) => str(a.status_code) === "completed",
    ).length;

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
        plans: packs?.length ?? 0,
        total_items: totalItems,
        appointments_in_packages: packageAppts.length,
        completed: packageCompleted,
        completion_rate: rate(packageCompleted, packageAppts.length),
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
    for (const a of asRows(appts)) {
      const pid = str(a.person_id);
      if (!pid) continue;
      const r = perPerson.get(pid) ?? {
        count: 0,
        cancelled: 0,
        no_show: 0,
        rescheduled: 0,
      };
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

    const { data: feedback } = await context.supabase
      .from("appointment_feedback")
      .select("rating,nps_score,submitted_at")
      .eq("tenant_id", data.tenant_id)
      .gte("submitted_at", data.from)
      .lte("submitted_at", data.to);

    let ratingSum = 0,
      ratingN = 0,
      promoters = 0,
      detractors = 0,
      npsN = 0;
    for (const f of asRows(feedback)) {
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
      total_appointments: total,
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
      .select("status,job_type,created_at")
      .eq("tenant_id", data.tenant_id)
      .gte("created_at", data.from)
      .lte("created_at", data.to);

    let vq = context.supabase
      .from("appointments")
      .select("id,video_session_id,video_provider,starts_at,status_code,branch_id")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .not("video_session_id", "is", null);
    if (data.branch_id) vq = vq.eq("branch_id", data.branch_id);
    const { data: videos } = await vq;

    const rTotal = reminders?.length ?? 0;
    let rSent = 0,
      rFailed = 0;
    const byChannel = new Map<string, { sent: number; failed: number; total: number }>();
    for (const r of asRows(reminders)) {
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
    for (const j of asRows(jobs)) {
      const k = str(j.job_type).toLowerCase();
      if (!k.includes("calendar")) continue;
      calTotal += 1;
      const s = str(j.status);
      if (s === "completed" || s === "success") calOk += 1;
      else if (s === "failed" || s === "error") calFail += 1;
    }

    const videoRows = asRows(videos);
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
        total: videoRows.length,
        completed: videoRows.filter((v) => str(v.status_code) === "completed").length,
      },
    };
  });

// ---------- Report data (server-side rows for CSV / Excel / PDF) ----------

export const getSchedulingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    windowInput
      .extend({
        group_by: z
          .enum(["day", "branch", "doctor", "service", "franchise"])
          .default("day"),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let aq = context.supabase
      .from("appointments")
      .select(
        "starts_at,branch_id,doctor_id,service_id,franchise_id,status_code,duration_minutes",
      )
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to);
    if (data.branch_id) aq = aq.eq("branch_id", data.branch_id);
    const { data: appts, error } = await aq;
    if (error) throw new Error(error.message);

    const groups = new Map<
      string,
      {
        key: string;
        total: number;
        completed: number;
        cancelled: number;
        no_show: number;
        minutes: number;
      }
    >();
    for (const a of asRows(appts)) {
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
