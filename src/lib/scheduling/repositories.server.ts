/**
 * Scheduling Platform — Repositories (server-only).
 * Thin, typed wrappers over Supabase for every scheduling table. Business
 * logic (slot search, holds, policies, coordinator) lives in the engines
 * that compose these repos.
 *
 * Naming mirrors the Blueprint: AppointmentRepository, ServiceRepository,
 * ResourceRepository, SlotRepository, QueueRepository, WaitlistRepository,
 * CapacityRepository, ConflictRepository, PackageRepository,
 * RecurrenceRepository, PolicyRepository.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

function unwrap<T>(res: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined)
    throw new Error("Row not found");
  return res.data;
}
function unwrapMaybe<T>(res: {
  data: T | null;
  error: { message: string } | null;
}): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function unwrapList<T>(res: {
  data: T[] | null;
  error: { message: string } | null;
}): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

// ============ Services =====================================================

export type ServiceRow = Tables<"services">;
export type ServiceVariantRow = Tables<"service_variants">;
export type ServiceDependencyRow = Tables<"service_dependencies">;
export type ServiceResourceReqRow = Tables<"service_resource_requirements">;
export type ServiceRoomReqRow = Tables<"service_room_requirements">;

export class ServiceRepository {
  constructor(private readonly sb: SB) {}

  async getById(id: string): Promise<ServiceRow | null> {
    return unwrapMaybe(
      await this.sb.from("services").select("*").eq("id", id).maybeSingle(),
    );
  }
  async getWithRequirements(id: string): Promise<{
    service: ServiceRow;
    variants: ServiceVariantRow[];
    resource_reqs: ServiceResourceReqRow[];
    room_reqs: ServiceRoomReqRow[];
    dependencies: ServiceDependencyRow[];
  } | null> {
    const svc = await this.getById(id);
    if (!svc) return null;
    const [variants, rres, rrooms, deps] = await Promise.all([
      this.listVariants(id),
      this.listResourceRequirements(id),
      this.listRoomRequirements(id),
      this.listDependencies(id),
    ]);
    return {
      service: svc,
      variants,
      resource_reqs: rres,
      room_reqs: rrooms,
      dependencies: deps,
    };
  }
  async listByTenant(
    tenantId: string,
    opts?: { active?: boolean },
  ): Promise<ServiceRow[]> {
    let q = this.sb.from("services").select("*").eq("tenant_id", tenantId);
    if (opts?.active !== undefined) q = q.eq("is_active", opts.active);
    return unwrapList(await q.order("name", { ascending: true }));
  }
  async listVariants(serviceId: string): Promise<ServiceVariantRow[]> {
    return unwrapList(
      await this.sb
        .from("service_variants")
        .select("*")
        .eq("service_id", serviceId)
        .order("display_order", { ascending: true }),
    );
  }
  async listResourceRequirements(
    serviceId: string,
  ): Promise<ServiceResourceReqRow[]> {
    return unwrapList(
      await this.sb
        .from("service_resource_requirements")
        .select("*")
        .eq("service_id", serviceId),
    );
  }
  async listRoomRequirements(serviceId: string): Promise<ServiceRoomReqRow[]> {
    return unwrapList(
      await this.sb
        .from("service_room_requirements")
        .select("*")
        .eq("service_id", serviceId),
    );
  }
  async listDependencies(
    serviceId: string,
  ): Promise<ServiceDependencyRow[]> {
    return unwrapList(
      await this.sb
        .from("service_dependencies")
        .select("*")
        .eq("service_id", serviceId),
    );
  }
}

// ============ Resources ====================================================

export type ResourceRow = Tables<"resources">;
export type ResourceScheduleRow = Tables<"resource_schedules">;
export type ResourceLeaveRow = Tables<"resource_leaves">;
export type ResourceBreakRow = Tables<"resource_breaks">;

export class ResourceRepository {
  constructor(private readonly sb: SB) {}

  async getById(id: string): Promise<ResourceRow | null> {
    return unwrapMaybe(
      await this.sb.from("resources").select("*").eq("id", id).maybeSingle(),
    );
  }
  async listByBranch(
    tenantId: string,
    branchId: string,
    opts?: { kind?: string; active?: boolean; includeShared?: boolean },
  ): Promise<ResourceRow[]> {
    let q = this.sb.from("resources").select("*").eq("tenant_id", tenantId);
    if (opts?.includeShared) {
      q = q.or(`branch_id.eq.${branchId},is_shared.eq.true`);
    } else {
      q = q.eq("branch_id", branchId);
    }
    if (opts?.kind) q = q.eq("resource_kind", opts.kind);
    if (opts?.active !== undefined) q = q.eq("is_active", opts.active);
    return unwrapList(await q.order("name", { ascending: true }));
  }
  async listSchedules(
    resourceId: string,
  ): Promise<ResourceScheduleRow[]> {
    return unwrapList(
      await this.sb
        .from("resource_schedules")
        .select("*")
        .eq("resource_id", resourceId),
    );
  }
  async listLeaves(
    resourceId: string,
    fromISO: string,
    toISO: string,
  ): Promise<ResourceLeaveRow[]> {
    return unwrapList(
      await this.sb
        .from("resource_leaves")
        .select("*")
        .eq("resource_id", resourceId)
        .lte("starts_at", toISO)
        .gte("ends_at", fromISO),
    );
  }
  async listBreaks(resourceId: string): Promise<ResourceBreakRow[]> {
    return unwrapList(
      await this.sb
        .from("resource_breaks")
        .select("*")
        .eq("resource_id", resourceId),
    );
  }
}

// ============ Slots ========================================================
// Note: `slot_cache` is a lightweight materialization of resource open slots.
// Schema: (tenant_id, resource_id, starts_at, ends_at, status, hold_id,
// branch_id, appointment_type_id). No service_id / no is_available flag —
// `status` carries availability ("available", "held", "booked", "blocked").

export type SlotRow = Tables<"slot_cache">;
export type SlotInsert = TablesInsert<"slot_cache">;

export class SlotRepository {
  constructor(private readonly sb: SB) {}

  async list(args: {
    tenantId: string;
    branchId?: string;
    resourceId?: string;
    fromISO: string;
    toISO: string;
    status?: string | string[];
    limit?: number;
  }): Promise<SlotRow[]> {
    let q = this.sb
      .from("slot_cache")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .gte("starts_at", args.fromISO)
      .lte("starts_at", args.toISO);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    if (args.resourceId) q = q.eq("resource_id", args.resourceId);
    if (args.status) {
      q = Array.isArray(args.status)
        ? q.in("status", args.status)
        : q.eq("status", args.status);
    }
    if (args.limit) q = q.limit(args.limit);
    return unwrapList(await q.order("starts_at", { ascending: true }));
  }
  async bulkUpsert(rows: SlotInsert[]): Promise<number> {
    if (rows.length === 0) return 0;
    const { error, count } = await this.sb
      .from("slot_cache")
      .upsert(rows as never, {
        onConflict: "tenant_id,resource_id,starts_at",
        count: "exact",
      });
    if (error) throw new Error(error.message);
    return count ?? rows.length;
  }
  async invalidate(args: {
    tenantId: string;
    resourceId?: string;
    fromISO: string;
    toISO: string;
  }): Promise<void> {
    let q = this.sb
      .from("slot_cache")
      .delete()
      .eq("tenant_id", args.tenantId)
      .gte("starts_at", args.fromISO)
      .lte("starts_at", args.toISO);
    if (args.resourceId) q = q.eq("resource_id", args.resourceId);
    const { error } = await q;
    if (error) throw new Error(error.message);
  }
}


// ============ Appointments =================================================

export type AppointmentRow = Tables<"appointments">;
export type AppointmentInsert = TablesInsert<"appointments">;
export type AppointmentUpdate = TablesUpdate<"appointments">;
export type AppointmentStatusHistoryRow = Tables<"appointment_status_history">;

export class AppointmentRepository {
  constructor(private readonly sb: SB) {}

  async insert(row: AppointmentInsert): Promise<AppointmentRow> {
    return unwrap(
      await this.sb.from("appointments").insert(row).select("*").single(),
    );
  }
  async update(
    id: string,
    patch: AppointmentUpdate,
  ): Promise<AppointmentRow> {
    return unwrap(
      await this.sb
        .from("appointments")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async getById(id: string): Promise<AppointmentRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("appointments")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    );
  }
  /**
   * Overlapping appointments for a given resource/branch/doctor window.
   * Used by Conflict Engine and Slot Engine.
   */
  async findOverlapping(args: {
    tenantId: string;
    branchId?: string;
    doctorId?: string | null;
    roomResourceId?: string | null;
    resourceIds?: string[];
    startsAt: string;
    endsAt: string;
    excludeAppointmentId?: string;
    activeOnly?: boolean;
  }): Promise<AppointmentRow[]> {
    let q = this.sb
      .from("appointments")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .lt("starts_at", args.endsAt)
      .gt("ends_at", args.startsAt);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    if (args.doctorId) q = q.eq("doctor_id", args.doctorId);
    if (args.roomResourceId) q = q.eq("room_resource_id", args.roomResourceId);
    if (args.excludeAppointmentId)
      q = q.neq("id", args.excludeAppointmentId);
    if (args.activeOnly !== false)
      q = q.not(
        "status_code",
        "in",
        "(cancelled,no_show,completed,rescheduled)",
      );
    return unwrapList(await q);
  }
  async appendStatus(
    row: TablesInsert<"appointment_status_history">,
  ): Promise<AppointmentStatusHistoryRow> {
    return unwrap(
      await this.sb
        .from("appointment_status_history")
        .insert(row)
        .select("*")
        .single(),
    );
  }
  async listStatusHistory(
    appointmentId: string,
  ): Promise<AppointmentStatusHistoryRow[]> {
    return unwrapList(
      await this.sb
        .from("appointment_status_history")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("changed_at", { ascending: true }),
    );
  }
}

// ============ Queue ========================================================

export type QueueTokenRow = Tables<"queue_tokens">;
export type QueueTokenInsert = TablesInsert<"queue_tokens">;
export type QueueTokenUpdate = TablesUpdate<"queue_tokens">;
export type QueueRow = Tables<"appointment_queue">;

export class QueueRepository {
  constructor(private readonly sb: SB) {}

  async getQueueForBranch(
    tenantId: string,
    branchId: string,
  ): Promise<QueueRow[]> {
    return unwrapList(
      await this.sb
        .from("appointment_queue")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("branch_id", branchId),
    );
  }
  async issueToken(row: QueueTokenInsert): Promise<QueueTokenRow> {
    return unwrap(
      await this.sb.from("queue_tokens").insert(row).select("*").single(),
    );
  }
  async updateToken(
    id: string,
    patch: QueueTokenUpdate,
  ): Promise<QueueTokenRow> {
    return unwrap(
      await this.sb
        .from("queue_tokens")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async getToken(id: string): Promise<QueueTokenRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("queue_tokens")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    );
  }
  async listWaiting(
    tenantId: string,
    queueId: string,
  ): Promise<QueueTokenRow[]> {
    return unwrapList(
      await this.sb
        .from("queue_tokens")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("queue_id", queueId)
        .in("status", ["waiting", "recalled"])
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true }),
    );
  }
  async nextTokenNumber(queueId: string): Promise<number> {
    const { data, error } = await this.sb
      .from("queue_tokens")
      .select("token_number")
      .eq("queue_id", queueId)
      .order("token_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return ((data?.token_number as number | null) ?? 0) + 1;
  }
}

// ============ Waitlist =====================================================

export type WaitlistRow = Tables<"appointment_waitlist">;
export type WaitlistInsert = TablesInsert<"appointment_waitlist">;
export type WaitlistOfferRow = Tables<"waitlist_offers">;
export type WaitlistOfferInsert = TablesInsert<"waitlist_offers">;

export class WaitlistRepository {
  constructor(private readonly sb: SB) {}

  async insert(row: WaitlistInsert): Promise<WaitlistRow> {
    return unwrap(
      await this.sb
        .from("appointment_waitlist")
        .insert(row)
        .select("*")
        .single(),
    );
  }
  async findCandidates(args: {
    tenantId: string;
    branchId: string;
    serviceId: string;
    startsAt: string;
    endsAt: string;
    doctorId?: string | null;
    limit?: number;
  }): Promise<WaitlistRow[]> {
    let q = this.sb
      .from("appointment_waitlist")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("service_id", args.serviceId)
      .in("status", ["active", "notified"])
      .lte("earliest_from", args.endsAt)
      .gte("latest_to", args.startsAt);
    // Waitlist entries may target a specific branch or "any" (null).
    q = q.or(`branch_id.eq.${args.branchId},branch_id.is.null`);
    if (args.doctorId) {
      q = q.or(`doctor_id.eq.${args.doctorId},doctor_id.is.null`);
    }
    q = q
      .order("priority_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(args.limit ?? 5);
    return unwrapList(await q);
  }
  async offer(row: WaitlistOfferInsert): Promise<WaitlistOfferRow> {
    return unwrap(
      await this.sb
        .from("waitlist_offers")
        .insert(row)
        .select("*")
        .single(),
    );
  }
  async getOffer(id: string): Promise<WaitlistOfferRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("waitlist_offers")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    );
  }
  async updateOffer(
    id: string,
    patch: Partial<WaitlistOfferInsert>,
  ): Promise<WaitlistOfferRow> {
    return unwrap(
      await this.sb
        .from("waitlist_offers")
        .update(patch as never)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async setWaitlistStatus(
    id: string,
    status: string,
  ): Promise<WaitlistRow> {
    return unwrap(
      await this.sb
        .from("appointment_waitlist")
        .update({ status } as never)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

// ============ Capacity =====================================================

export type CapacityPlanRow = Tables<"capacity_plans">;
export type CapacityDimensionRow = Tables<"capacity_dimensions">;
export type CapacityOverrideRow = Tables<"capacity_overrides">;

export class CapacityRepository {
  constructor(private readonly sb: SB) {}

  async findPlan(args: {
    tenantId: string;
    branchId: string;
    serviceId?: string | null;
    at: string;
  }): Promise<CapacityPlanRow | null> {
    let q = this.sb
      .from("capacity_plans")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("branch_id", args.branchId)
      .lte("effective_from", args.at)
      .or(`effective_to.is.null,effective_to.gte.${args.at}`)
      .eq("is_active", true);
    if (args.serviceId) {
      q = q.or(`service_id.eq.${args.serviceId},service_id.is.null`);
    } else {
      q = q.is("service_id", null);
    }
    return unwrapMaybe(
      await q
        .order("service_id", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
    );
  }
  async listDimensions(planId: string): Promise<CapacityDimensionRow[]> {
    return unwrapList(
      await this.sb
        .from("capacity_dimensions")
        .select("*")
        .eq("plan_id", planId),
    );
  }
  async listOverrides(args: {
    tenantId: string;
    branchId: string;
    fromISO: string;
    toISO: string;
  }): Promise<CapacityOverrideRow[]> {
    return unwrapList(
      await this.sb
        .from("capacity_overrides")
        .select("*")
        .eq("tenant_id", args.tenantId)
        .eq("branch_id", args.branchId)
        .lte("bucket_start", args.toISO)
        .gte("bucket_end", args.fromISO),
    );
  }
}

// ============ Conflict ====================================================

export type ResourceLockRow = Tables<"resource_locks">;
export type ResourceLockInsert = TablesInsert<"resource_locks">;
export type ResourceHoldRow = Tables<"resource_holds">;
export type ResourceHoldInsert = TablesInsert<"resource_holds">;
export type ResourceConflictLogRow = Tables<"resource_conflict_log">;

export class ConflictRepository {
  constructor(private readonly sb: SB) {}

  async createLock(row: ResourceLockInsert): Promise<ResourceLockRow> {
    return unwrap(
      await this.sb.from("resource_locks").insert(row).select("*").single(),
    );
  }
  async createHold(row: ResourceHoldInsert): Promise<ResourceHoldRow> {
    return unwrap(
      await this.sb.from("resource_holds").insert(row).select("*").single(),
    );
  }
  async releaseHold(holdId: string): Promise<void> {
    const { error } = await this.sb
      .from("resource_holds")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
      } as never)
      .eq("id", holdId);
    if (error) throw new Error(error.message);
  }
  async findActiveHolds(args: {
    tenantId: string;
    resourceId?: string;
    startsAt: string;
    endsAt: string;
  }): Promise<ResourceHoldRow[]> {
    let q = this.sb
      .from("resource_holds")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("status", "active")
      .lt("starts_at", args.endsAt)
      .gt("ends_at", args.startsAt)
      .gt("expires_at", new Date().toISOString());
    if (args.resourceId) q = q.eq("resource_id", args.resourceId);
    return unwrapList(await q);
  }
  async findActiveLocks(args: {
    tenantId: string;
    branchId?: string;
    resourceId?: string;
    startsAt: string;
    endsAt: string;
  }): Promise<ResourceLockRow[]> {
    let q = this.sb
      .from("resource_locks")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("is_active", true)
      .lt("starts_at", args.endsAt)
      .gt("ends_at", args.startsAt);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    if (args.resourceId) q = q.eq("resource_id", args.resourceId);
    return unwrapList(await q);
  }
  async logConflict(
    row: TablesInsert<"resource_conflict_log">,
  ): Promise<ResourceConflictLogRow> {
    return unwrap(
      await this.sb
        .from("resource_conflict_log")
        .insert(row)
        .select("*")
        .single(),
    );
  }
}

// ============ Packages / Sequences ========================================

export type PackagePlanRow = Tables<"appointment_package_plans">;
export type PackageItemRow = Tables<"appointment_package_items">;
export type SequenceRow = Tables<"appointment_sequences">;
export type SequenceItemRow = Tables<"appointment_sequence_items">;

export class PackageRepository {
  constructor(private readonly sb: SB) {}

  async getPlan(id: string): Promise<PackagePlanRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("appointment_package_plans")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    );
  }
  async listPlanItems(planId: string): Promise<PackageItemRow[]> {
    return unwrapList(
      await this.sb
        .from("appointment_package_items")
        .select("*")
        .eq("plan_id", planId)
        .order("sequence_index", { ascending: true }),
    );
  }
  async createSequence(
    row: TablesInsert<"appointment_sequences">,
  ): Promise<SequenceRow> {
    return unwrap(
      await this.sb
        .from("appointment_sequences")
        .insert(row)
        .select("*")
        .single(),
    );
  }
  async createSequenceItems(
    rows: TablesInsert<"appointment_sequence_items">[],
  ): Promise<SequenceItemRow[]> {
    if (rows.length === 0) return [];
    return unwrapList(
      await this.sb
        .from("appointment_sequence_items")
        .insert(rows)
        .select("*"),
    );
  }
  async listSequenceItems(
    sequenceId: string,
  ): Promise<SequenceItemRow[]> {
    return unwrapList(
      await this.sb
        .from("appointment_sequence_items")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("sequence_index", { ascending: true }),
    );
  }
}

// ============ Recurrence ==================================================

export type SeriesRow = Tables<"appointment_series">;
export type SeriesInsert = TablesInsert<"appointment_series">;
export type SeriesExceptionRow = Tables<"appointment_recurrence_exceptions">;

export class RecurrenceRepository {
  constructor(private readonly sb: SB) {}

  async getSeries(id: string): Promise<SeriesRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("appointment_series")
        .select("*")
        .eq("id", id)
        .maybeSingle(),
    );
  }
  async createSeries(row: SeriesInsert): Promise<SeriesRow> {
    return unwrap(
      await this.sb
        .from("appointment_series")
        .insert(row)
        .select("*")
        .single(),
    );
  }
  async updateSeries(
    id: string,
    patch: Partial<SeriesInsert>,
  ): Promise<SeriesRow> {
    return unwrap(
      await this.sb
        .from("appointment_series")
        .update(patch as never)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
  async listExceptions(seriesId: string): Promise<SeriesExceptionRow[]> {
    return unwrapList(
      await this.sb
        .from("appointment_recurrence_exceptions")
        .select("*")
        .eq("series_id", seriesId),
    );
  }
  async listOccurrences(
    seriesId: string,
    fromISO: string,
    toISO: string,
  ): Promise<AppointmentRow[]> {
    return unwrapList(
      await this.sb
        .from("appointments")
        .select("*")
        .eq("series_id", seriesId)
        .gte("starts_at", fromISO)
        .lte("starts_at", toISO)
        .order("starts_at", { ascending: true }),
    );
  }
}

// ============ Policy ======================================================

export type PolicyRow = Tables<"scheduling_policies">;

export class PolicyRepository {
  constructor(private readonly sb: SB) {}

  async listApplicable(args: {
    tenantId: string;
    branchId?: string | null;
    franchiseId?: string | null;
    serviceId?: string | null;
    action?: string;
  }): Promise<PolicyRow[]> {
    let q = this.sb
      .from("scheduling_policies")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("is_active", true);
    if (args.action) q = q.contains("applies_to", [args.action] as never);
    // Scope filter: match tenant-wide policies (all nullable scopes) OR
    // policies that match this context.
    const scopes: string[] = [];
    scopes.push("branch_id.is.null");
    if (args.branchId) scopes.push(`branch_id.eq.${args.branchId}`);
    q = q.or(scopes.join(","));
    const rows = await unwrapList(
      await q.order("priority", { ascending: false }),
    );
    // Post-filter by franchise/service (nullable = wildcard).
    return rows.filter((p) => {
      const f = p.franchise_id as string | null;
      const s = p.service_id as string | null;
      if (f && args.franchiseId && f !== args.franchiseId) return false;
      if (s && args.serviceId && s !== args.serviceId) return false;
      return true;
    });
  }
}

// ============ External Calendar accounts ==================================

export type ExternalCalendarAccountRow = Tables<"external_calendar_accounts">;

export class ExternalCalendarRepository {
  constructor(private readonly sb: SB) {}

  async listForResource(
    tenantId: string,
    resourceId: string,
  ): Promise<ExternalCalendarAccountRow[]> {
    return unwrapList(
      await this.sb
        .from("external_calendar_accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("resource_id", resourceId)
        .eq("is_active", true),
    );
  }
}
