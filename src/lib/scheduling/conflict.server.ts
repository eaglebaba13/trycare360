/**
 * Scheduling — Conflict Engine (server-only).
 *
 * Owns:
 *   - createLock()      — hard blocks (leaves, maintenance, black-outs)
 *   - createHold()      — soft reservations with TTL, used by holdSlot()
 *   - releaseHold()     — release a specific hold
 *   - resolveConflict() — detect appointment/hold/lock collisions
 *   - overrideConflict() — audit-logged manual override for supervisors
 *
 * Reuses:
 *   - AppointmentRepository.findOverlapping (appointments in the window)
 *   - resource_locks / resource_holds tables (via ConflictRepository)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  AppointmentRepository,
  ConflictRepository,
  type ResourceHoldInsert,
  type ResourceLockInsert,
} from "./repositories.server";
import { RESOURCE_EVENTS } from "./events";

type SB = SupabaseClient<Database>;

export type ConflictKind =
  | "appointment_overlap"
  | "hold_overlap"
  | "lock_overlap";

export type Conflict = {
  kind: ConflictKind;
  resource_id?: string | null;
  branch_id?: string | null;
  starts_at: string;
  ends_at: string;
  ref_id: string;
  meta?: Record<string, unknown>;
};

export type ConflictReport = {
  conflicts: Conflict[];
  clean: boolean;
};

export class ConflictEngine {
  private readonly conflicts: ConflictRepository;
  private readonly appts: AppointmentRepository;
  constructor(private readonly sb: SB) {
    this.conflicts = new ConflictRepository(sb);
    this.appts = new AppointmentRepository(sb);
  }

  async createLock(args: {
    row: ResourceLockInsert;
    tenantId: string;
    actorUserId?: string | null;
  }) {
    const lock = await this.conflicts.createLock(args.row);
    await this.sb.rpc("emit_automation_event", {
      _tenant_id: args.tenantId,
      _event_type: RESOURCE_EVENTS.LOCKED,
      _payload: {
        lock_id: lock.id,
        resource_id: lock.resource_id,
        starts_at: lock.starts_at,
        ends_at: lock.ends_at,
        reason_code: lock.reason_code,
      } as never,
      _entity_ref: { type: "resource_lock", id: lock.id } as never,
    });
    return lock;
  }

  async createHold(args: {
    row: ResourceHoldInsert;
  }) {
    return this.conflicts.createHold(args.row);
  }

  async releaseHold(holdId: string) {
    await this.conflicts.releaseHold(holdId);
  }

  /**
   * Run the full conflict sweep for a proposed booking window across the
   * given resources (doctor + room + any extras).
   */
  async resolveConflict(args: {
    tenantId: string;
    branchId?: string | null;
    doctorId?: string | null;
    roomResourceId?: string | null;
    resourceIds?: string[];
    startsAt: string;
    endsAt: string;
    excludeAppointmentId?: string;
    ignoreHoldId?: string;
  }): Promise<ConflictReport> {
    const conflicts: Conflict[] = [];

    // 1. appointment overlaps
    const overlapping = await this.appts.findOverlapping({
      tenantId: args.tenantId,
      branchId: args.branchId ?? undefined,
      doctorId: args.doctorId ?? undefined,
      roomResourceId: args.roomResourceId ?? undefined,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      excludeAppointmentId: args.excludeAppointmentId,
    });
    for (const a of overlapping) {
      conflicts.push({
        kind: "appointment_overlap",
        resource_id: a.doctor_id ?? a.room_resource_id ?? a.primary_resource_id,
        branch_id: a.branch_id,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        ref_id: a.id,
        meta: { status_code: a.status_code, appointment_code: a.appointment_code },
      });
    }

    // 2. locks
    const resourceIds = [
      ...(args.resourceIds ?? []),
      ...(args.doctorId ? [args.doctorId] : []),
      ...(args.roomResourceId ? [args.roomResourceId] : []),
    ].filter(Boolean) as string[];

    for (const rid of resourceIds.length ? resourceIds : [undefined]) {
      const locks = await this.conflicts.findActiveLocks({
        tenantId: args.tenantId,
        branchId: args.branchId ?? undefined,
        resourceId: rid,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
      });
      for (const l of locks) {
        conflicts.push({
          kind: "lock_overlap",
          resource_id: l.resource_id,
          branch_id: l.branch_id,
          starts_at: l.starts_at,
          ends_at: l.ends_at,
          ref_id: l.id,
          meta: {
            reason_code: l.reason_code,
            override_allowed: l.override_allowed,
          },
        });
      }
    }

    // 3. holds (excluding the caller's own hold if provided)
    for (const rid of resourceIds.length ? resourceIds : [undefined]) {
      const holds = await this.conflicts.findActiveHolds({
        tenantId: args.tenantId,
        resourceId: rid,
        startsAt: args.startsAt,
        endsAt: args.endsAt,
      });
      for (const h of holds) {
        if (args.ignoreHoldId && h.id === args.ignoreHoldId) continue;
        conflicts.push({
          kind: "hold_overlap",
          resource_id: h.resource_id,
          branch_id: h.branch_id,
          starts_at: h.starts_at,
          ends_at: h.ends_at,
          ref_id: h.id,
          meta: { expires_at: h.expires_at, held_by: h.held_by },
        });
      }
    }

    return { conflicts, clean: conflicts.length === 0 };
  }

  /**
   * Log an audit trail entry when an operator forces past a conflict.
   * Does not remove the conflicting row(s); the booking that follows is
   * the caller's decision.
   */
  async overrideConflict(args: {
    tenantId: string;
    conflict: Conflict;
    actorUserId?: string | null;
    reason: string;
    appointmentId?: string | null;
  }) {
    return this.conflicts.logConflict({
      tenant_id: args.tenantId,
      resource_id:
        (args.conflict.resource_id as string | null) ??
        // resource_id is NOT NULL in the schema; fall back to a sentinel if
        // the conflict is branch-level only (should not normally happen).
        "00000000-0000-0000-0000-000000000000",
      conflict_type: args.conflict.kind,
      appointment_id: args.appointmentId ?? null,
      actor: args.actorUserId ?? null,
      resolution: `override: ${args.reason}`,
      resolved_at: new Date().toISOString(),
      detail: {
        starts_at: args.conflict.starts_at,
        ends_at: args.conflict.ends_at,
        ref_id: args.conflict.ref_id,
        branch_id: args.conflict.branch_id,
        reason: args.reason,
        ...(args.conflict.meta ?? {}),
      } as Json,
    });
  }

}
