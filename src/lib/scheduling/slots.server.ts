/**
 * Scheduling — Slot Engine (server-only).
 *
 * `findSlots()`  — enumerate available start times for a service across a
 *                  window, honoring resource schedules, breaks, leaves,
 *                  overlapping appointments/holds/locks, and (optionally)
 *                  policies + capacity.
 * `generateSlots()` — materialize `slot_cache` rows for a branch/resource
 *                  window (used by nightly warmers).
 * `checkAvailability()` — is a specific (starts_at + duration) still free.
 *
 * Design principles:
 *   - No hardcoded business rules; slot cadence comes from service +
 *     resource schedule + scheduling_policies.
 *   - Reads `resource_schedules` (day-of-week windows), `resource_breaks`,
 *     `resource_leaves`, appointments, holds, locks.
 *   - Returns lightweight DTOs; no SDK types.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  AppointmentRepository,
  ConflictRepository,
  ResourceRepository,
  SlotRepository,
  ServiceRepository,
} from "./repositories.server";
import { CapacityEngine } from "./capacity.server";

type SB = SupabaseClient<Database>;

export type SlotCandidate = {
  starts_at: string;
  ends_at: string;
  resource_id: string;
  branch_id: string;
  doctor_id?: string | null;
  room_resource_id?: string | null;
  duration_minutes: number;
  score: number;
  notes: string[];
};

const MIN_STEP_MINUTES = 5;

function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}
function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return (
    new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(aEnd).getTime() > new Date(bStart).getTime()
  );
}

/**
 * Interpret a `resource_schedules` row as a per-day open window. The
 * table typically stores day_of_week (0-6), starts_at (HH:MM) and
 * ends_at (HH:MM). We translate that to concrete UTC windows for the
 * requested date range.
 */
function scheduleWindows(
  schedule: Array<{
    day_of_week?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    is_active?: boolean | null;
  }>,
  fromISO: string,
  toISO: string,
): Array<{ start: string; end: string }> {
  const out: Array<{ start: string; end: string }> = [];
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const dayMs = 86_400_000;
  for (let t = from.getTime(); t <= to.getTime(); t += dayMs) {
    const day = new Date(t);
    const dow = day.getUTCDay();
    for (const s of schedule) {
      if (s.is_active === false) continue;
      if (s.day_of_week != null && s.day_of_week !== dow) continue;
      const [sh, sm] = ((s.start_time ?? "09:00") as string)
        .split(":")
        .map(Number);
      const [eh, em] = ((s.end_time ?? "17:00") as string)
        .split(":")
        .map(Number);

      const start = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sh, sm),
      );
      const end = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), eh, em),
      );
      if (end > start) out.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }
  return out;
}

export class SlotEngine {
  private readonly appts: AppointmentRepository;
  private readonly resources: ResourceRepository;
  private readonly conflicts: ConflictRepository;
  private readonly slots: SlotRepository;
  private readonly services: ServiceRepository;
  private readonly capacity: CapacityEngine;

  constructor(private readonly sb: SB) {
    this.appts = new AppointmentRepository(sb);
    this.resources = new ResourceRepository(sb);
    this.conflicts = new ConflictRepository(sb);
    this.slots = new SlotRepository(sb);
    this.services = new ServiceRepository(sb);
    this.capacity = new CapacityEngine(sb);
  }

  /**
   * Fine-grained slot search across candidate resources.
   */
  async findSlots(args: {
    tenantId: string;
    serviceId: string;
    branchId?: string | null;
    doctorId?: string | null;
    resourceGroupId?: string | null;
    preferredResourceIds?: string[];
    from: string;
    to: string;
    durationMinutes?: number;
    stepMinutes?: number;
    limit?: number;
    respectCapacity?: boolean;
  }): Promise<SlotCandidate[]> {
    const service = await this.services.getById(args.serviceId);
    if (!service) throw new Error(`Service not found: ${args.serviceId}`);
    const duration =
      args.durationMinutes ??
      Number((service as unknown as { duration_minutes?: number }).duration_minutes ?? 30);
    const step = Math.max(MIN_STEP_MINUTES, args.stepMinutes ?? duration);

    // Candidate resources: doctor if given, else all active in-branch
    // resources for this service. (Detailed service→resource matching is
    // pluggable via service_resource_requirements.)
    let resources: Array<{ id: string; branch_id: string | null }> = [];
    if (args.doctorId) {
      const r = await this.resources.getById(args.doctorId);
      if (r) resources.push({ id: r.id, branch_id: r.branch_id });
    } else if (args.branchId) {
      const rs = await this.resources.listByBranch(args.tenantId, args.branchId, {
        active: true,
        includeShared: true,
      });
      resources = rs.map((r) => ({ id: r.id, branch_id: r.branch_id }));
    }
    if (args.preferredResourceIds?.length) {
      const set = new Set(args.preferredResourceIds);
      resources.sort((a, b) => Number(set.has(b.id)) - Number(set.has(a.id)));
    }

    const out: SlotCandidate[] = [];
    const limit = args.limit ?? 50;

    for (const r of resources) {
      if (out.length >= limit) break;

      const [schedule, leaves, breaks, appointments, holds, locks] =
        await Promise.all([
          this.resources.listSchedules(r.id),
          this.resources.listLeaves(r.id, args.from, args.to),
          this.resources.listBreaks(r.id),
          this.appts.findOverlapping({
            tenantId: args.tenantId,
            doctorId: r.id,
            startsAt: args.from,
            endsAt: args.to,
          }),
          this.conflicts.findActiveHolds({
            tenantId: args.tenantId,
            resourceId: r.id,
            startsAt: args.from,
            endsAt: args.to,
          }),
          this.conflicts.findActiveLocks({
            tenantId: args.tenantId,
            resourceId: r.id,
            startsAt: args.from,
            endsAt: args.to,
          }),
        ]);

      const busy: Array<{ start: string; end: string }> = [
        ...appointments.map((a) => ({ start: a.starts_at, end: a.ends_at })),
        ...holds.map((h) => ({ start: h.starts_at, end: h.ends_at })),
        ...locks.map((l) => ({ start: l.starts_at, end: l.ends_at })),
        ...leaves.map((l) => ({ start: l.starts_at, end: l.ends_at })),
      ];

      const windows = scheduleWindows(schedule, args.from, args.to);

      for (const w of windows) {
        if (out.length >= limit) break;
        let cursor = Math.max(
          new Date(w.start).getTime(),
          new Date(args.from).getTime(),
        );
        const wEnd = Math.min(
          new Date(w.end).getTime(),
          new Date(args.to).getTime(),
        );
        while (cursor + duration * 60_000 <= wEnd) {
          const startISO = new Date(cursor).toISOString();
          const endISO = new Date(cursor + duration * 60_000).toISOString();

          // Breaks are stored as day-of-week + HH:MM windows; project
          // each to today's date for the overlap check.
          const dow = new Date(startISO).getUTCDay();
          const dayStr = startISO.slice(0, 10);
          const breakClashes = breaks.some((b) => {
            if (b.day_of_week != null && b.day_of_week !== dow) return false;
            const bStart = new Date(`${dayStr}T${b.start_time}Z`).toISOString();
            const bEnd = new Date(`${dayStr}T${b.end_time}Z`).toISOString();
            return overlaps(startISO, endISO, bStart, bEnd);
          });
          const clash =
            busy.some((b) => overlaps(startISO, endISO, b.start, b.end)) ||
            breakClashes;


          if (!clash) {
            let ok = true;
            if (args.respectCapacity !== false && r.branch_id) {
              const cap = await this.capacity.checkCapacity({
                tenantId: args.tenantId,
                branchId: r.branch_id,
                dimensionCode: "appointments",
                bucketStart: startISO,
                bucketEnd: endISO,
              });
              ok = cap.ok;
            }
            if (ok) {
              out.push({
                starts_at: startISO,
                ends_at: endISO,
                resource_id: r.id,
                branch_id: (r.branch_id ?? args.branchId) as string,
                doctor_id: r.id,
                duration_minutes: duration,
                score: 100,
                notes: [],
              });
              if (out.length >= limit) break;
            }
          }
          cursor += step * 60_000;
        }
      }
    }
    return out.slice(0, limit);
  }

  /**
   * Confirm a specific slot is still bookable right now.
   */
  async checkAvailability(args: {
    tenantId: string;
    branchId: string;
    doctorId?: string | null;
    roomResourceId?: string | null;
    startsAt: string;
    durationMinutes: number;
    ignoreHoldId?: string;
    excludeAppointmentId?: string;
  }): Promise<{ ok: boolean; reason?: string }> {
    const endsAt = addMinutes(args.startsAt, args.durationMinutes);
    const overlapping = await this.appts.findOverlapping({
      tenantId: args.tenantId,
      branchId: args.branchId,
      doctorId: args.doctorId ?? undefined,
      roomResourceId: args.roomResourceId ?? undefined,
      startsAt: args.startsAt,
      endsAt,
      excludeAppointmentId: args.excludeAppointmentId,
    });
    if (overlapping.length > 0)
      return { ok: false, reason: "appointment_overlap" };
    const locks = await this.conflicts.findActiveLocks({
      tenantId: args.tenantId,
      branchId: args.branchId,
      resourceId: args.doctorId ?? args.roomResourceId ?? undefined,
      startsAt: args.startsAt,
      endsAt,
    });
    if (locks.length > 0) return { ok: false, reason: "lock_overlap" };
    const holds = await this.conflicts.findActiveHolds({
      tenantId: args.tenantId,
      resourceId: args.doctorId ?? args.roomResourceId ?? undefined,
      startsAt: args.startsAt,
      endsAt,
    });
    if (holds.some((h) => h.id !== args.ignoreHoldId))
      return { ok: false, reason: "hold_overlap" };
    return { ok: true };
  }

  /**
   * Warm `slot_cache` for a resource/branch date range. Coarse: fills in
   * schedule-driven windows and marks known appointments as `booked`.
   */
  async generateSlots(args: {
    tenantId: string;
    branchId: string;
    resourceId?: string | null;
    from: string; // YYYY-MM-DD
    to: string; // YYYY-MM-DD
    stepMinutes?: number;
  }): Promise<{ inserted: number }> {
    const step = args.stepMinutes ?? 30;
    const fromISO = new Date(`${args.from}T00:00:00Z`).toISOString();
    const toISO = new Date(`${args.to}T23:59:59Z`).toISOString();
    const resources = args.resourceId
      ? [await this.resources.getById(args.resourceId)].filter(Boolean) as Awaited<
          ReturnType<typeof this.resources.getById>
        >[]
      : await this.resources.listByBranch(args.tenantId, args.branchId, {
          active: true,
        });

    const rows: Array<{
      tenant_id: string;
      resource_id: string;
      branch_id: string;
      starts_at: string;
      ends_at: string;
      status: string;
    }> = [];

    for (const r of resources) {
      if (!r) continue;
      const schedule = await this.resources.listSchedules(r.id);
      const windows = scheduleWindows(schedule, fromISO, toISO);
      for (const w of windows) {
        let cursor = new Date(w.start).getTime();
        const wEnd = new Date(w.end).getTime();
        while (cursor + step * 60_000 <= wEnd) {
          rows.push({
            tenant_id: args.tenantId,
            resource_id: r.id,
            branch_id: args.branchId,
            starts_at: new Date(cursor).toISOString(),
            ends_at: new Date(cursor + step * 60_000).toISOString(),
            status: "available",
          });
          cursor += step * 60_000;
        }
      }
    }

    if (rows.length === 0) return { inserted: 0 };
    await this.slots.invalidate({
      tenantId: args.tenantId,
      resourceId: args.resourceId ?? undefined,
      fromISO,
      toISO,
    });
    const inserted = await this.slots.bulkUpsert(rows);
    return { inserted };
  }
}
