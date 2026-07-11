/**
 * Scheduling — Read-only list & KPI server functions.
 *
 * The UI layer NEVER queries the database directly, calculates slots,
 * capacity, conflicts, recurrence, or queue state locally, or duplicates
 * business logic. Every read that the calendar / dashboard / workspace
 * needs flows through one of the functions below, which in turn use the
 * scheduling repositories from Stage 2.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  AppointmentRepository,
  ServiceRepository,
  ResourceRepository,
} from "./repositories.server";

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime();

// ---------- KPIs -----------------------------------------------------------

export const getAppointmentKpis = createServerFn({ method: "POST" })
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
    let q = context.supabase
      .from("appointments")
      .select("status_code,starts_at", { count: "exact" })
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.day_start)
      .lte("starts_at", data.day_end);
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const counts = {
      today: rows?.length ?? 0,
      upcoming: 0,
      waiting: 0,
      in_consultation: 0,
      completed: 0,
      cancelled: 0,
      rescheduled: 0,
      no_show: 0,
    };
    const now = Date.now();
    for (const r of rows ?? []) {
      const s = String(r.status_code);
      if (s === "checked_in" || s === "waiting") counts.waiting += 1;
      else if (s === "in_progress") counts.in_consultation += 1;
      else if (s === "completed") counts.completed += 1;
      else if (s === "cancelled") counts.cancelled += 1;
      else if (s === "rescheduled" || s === "rescheduled_pending")
        counts.rescheduled += 1;
      else if (s === "no_show") counts.no_show += 1;
      else if (Date.parse(String(r.starts_at)) > now) counts.upcoming += 1;
    }
    return counts;
  });

// ---------- Appointment listings ------------------------------------------

export const listAppointments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid.nullish(),
        doctor_id: uuid.nullish(),
        resource_id: uuid.nullish(),
        person_id: uuid.nullish(),
        series_id: uuid.nullish(),
        package_id: uuid.nullish(),
        status_in: z.array(z.string()).optional(),
        from: isoDateTime,
        to: isoDateTime,
        limit: z.number().int().positive().max(500).default(200),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointments")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .gte("starts_at", data.from)
      .lte("starts_at", data.to)
      .order("starts_at", { ascending: true })
      .limit(data.limit);
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    if (data.doctor_id) q = q.eq("doctor_id", data.doctor_id);
    if (data.resource_id)
      q = q.or(
        `primary_resource_id.eq.${data.resource_id},room_resource_id.eq.${data.resource_id}`,
      );
    if (data.person_id) q = q.eq("person_id", data.person_id);
    if (data.series_id) q = q.eq("series_id", data.series_id);
    if (data.package_id) q = q.eq("package_id", data.package_id);
    if (data.status_in?.length) q = q.in("status_code", data.status_in);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ---------- Catalog: branches / services / resources -----------------------

export const listBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("branches")
      .select("id,name,code,tenant_id,org_unit_id,is_active")
      .eq("tenant_id", data.tenant_id)
      .eq("is_active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const listServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid, active_only: z.boolean().default(true) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new ServiceRepository(context.supabase);
    const rows = await repo.listByTenant(data.tenant_id, {
      active: data.active_only ? true : undefined,
    });
    return { rows };
  });

export const listResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid,
        kind: z.string().optional(),
        include_shared: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new ResourceRepository(context.supabase);
    const rows = await repo.listByBranch(data.tenant_id, data.branch_id, {
      kind: data.kind,
      includeShared: data.include_shared,
      active: true,
    });
    return { rows };
  });

// ---------- Resource utilization ------------------------------------------

export const getResourceUtilization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid,
        day_start: isoDateTime,
        day_end: isoDateTime,
        working_hours: z.number().positive().default(8),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const [{ data: resources, error: e1 }, aptRepo] = [
      await context.supabase
        .from("resources")
        .select("id,name,resource_kind,branch_id,is_shared")
        .eq("tenant_id", data.tenant_id)
        .or(`branch_id.eq.${data.branch_id},is_shared.eq.true`)
        .eq("is_active", true),
      new AppointmentRepository(context.supabase),
    ];
    if (e1) throw new Error(e1.message);

    const results: {
      id: string;
      name: string;
      kind: string;
      booked_minutes: number;
      appointment_count: number;
      utilization: number;
    }[] = [];
    for (const r of resources ?? []) {
      const overlap = await aptRepo.findOverlapping({
        tenantId: data.tenant_id,
        branchId: data.branch_id,
        doctorId: r.resource_kind === "doctor" ? r.id : undefined,
        roomResourceId: r.resource_kind === "room" ? r.id : undefined,
        startsAt: data.day_start,
        endsAt: data.day_end,
      });
      const minutes = overlap.reduce(
        (acc, a) => acc + (a.duration_minutes ?? 0),
        0,
      );
      results.push({
        id: r.id,
        name: r.name,
        kind: r.resource_kind,
        booked_minutes: minutes,
        appointment_count: overlap.length,
        utilization: Math.min(1, minutes / (data.working_hours * 60)),
      });
    }
    return { resources: results };
  });

// ---------- Series / Packages / Waitlist -----------------------------------

export const listAppointmentSeries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        person_id: uuid.nullish(),
        limit: z.number().int().positive().max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointment_series")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.person_id) q = q.eq("person_id", data.person_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const getSeriesDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid, series_id: uuid }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: series, error: e1 } = await context.supabase
      .from("appointment_series")
      .select("*")
      .eq("id", data.series_id)
      .eq("tenant_id", data.tenant_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    const { data: exceptions, error: e2 } = await context.supabase
      .from("appointment_recurrence_exceptions")
      .select("*")
      .eq("series_id", data.series_id);
    if (e2) throw new Error(e2.message);
    const { data: occurrences, error: e3 } = await context.supabase
      .from("appointments")
      .select("id,starts_at,ends_at,status_code,branch_id,doctor_id")
      .eq("series_id", data.series_id)
      .order("starts_at", { ascending: true });
    if (e3) throw new Error(e3.message);
    return { series, exceptions: exceptions ?? [], occurrences: occurrences ?? [] };
  });

export const listPackagePlans = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenant_id: uuid }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("appointment_package_plans")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("name");
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const listActiveWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        branch_id: uuid.nullish(),
        limit: z.number().int().positive().max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("appointment_waitlist")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .in("status", ["active", "notified"])
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(data.limit);
    if (data.branch_id) q = q.eq("branch_id", data.branch_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ---------- Person quick search (booking wizard) ---------------------------

export const searchPersons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tenant_id: uuid,
        q: z.string().min(1).max(100),
        limit: z.number().int().positive().max(50).default(20),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const like = `%${data.q}%`;
    const { data: rows, error } = await context.supabase
      .from("persons")
      .select("id,display_name,full_name,phone_e164,email_normalized")
      .eq("tenant_id", data.tenant_id)
      .or(
        `display_name.ilike.${like},full_name.ilike.${like},phone_e164.ilike.${like},email_normalized.ilike.${like}`,
      )
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
