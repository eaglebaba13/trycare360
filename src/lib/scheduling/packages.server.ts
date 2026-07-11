/**
 * Scheduling — Package / Sequence Engine (server-only).
 *
 * Turns an `appointment_package_plan` (e.g. "6-session PRP course") into
 * an `appointment_sequence` for a specific patient, populated with
 * `appointment_sequence_items`. Individual appointments are booked later
 * via the Coordinator; the sequence tracks the intended cadence, gaps,
 * and dependencies.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PackageRepository, ServiceRepository } from "./repositories.server";

type SB = SupabaseClient<Database>;

export class PackageEngine {
  private readonly repo: PackageRepository;
  private readonly services: ServiceRepository;
  constructor(private readonly sb: SB) {
    this.repo = new PackageRepository(sb);
    this.services = new ServiceRepository(sb);
  }

  async createPackageSequence(args: {
    tenantId: string;
    personId: string;
    packagePlanId: string;
    branchId: string;
    doctorId?: string | null;
    startDate: string;
    meta?: Record<string, unknown>;
  }) {
    const plan = await this.repo.getPlan(args.packagePlanId);
    if (!plan) throw new Error(`Package plan not found: ${args.packagePlanId}`);
    const items = await this.repo.listPlanItems(args.packagePlanId);

    const sequence = await this.repo.createSequence({
      tenant_id: args.tenantId,
      person_id: args.personId,
      package_plan_id: args.packagePlanId,
      branch_id: args.branchId,
      doctor_id: args.doctorId ?? null,
      start_date: args.startDate,
      status: "active",
      meta: (args.meta ?? {}) as never,
    } as never);

    const baseDate = new Date(`${args.startDate}T00:00:00Z`);
    const rows = items.map((item) => {
      const gap = Number(
        (item as unknown as { gap_days?: number }).gap_days ?? 0,
      );
      const scheduled = new Date(baseDate.getTime() + gap * 86_400_000);
      return {
        tenant_id: args.tenantId,
        sequence_id: sequence.id,
        plan_item_id: item.id,
        sequence_index: (item as unknown as { sequence_index: number })
          .sequence_index,
        service_id: (item as unknown as { service_id: string | null })
          .service_id,
        target_date: scheduled.toISOString().slice(0, 10),
        status: "pending",
      };
    });
    const seqItems = await this.repo.createSequenceItems(rows as never);
    return { sequence, items: seqItems };
  }

  /**
   * Verify a would-be booking against the service's dependency graph.
   * `service_dependencies` rows encode prerequisites (e.g. consult must
   * precede procedure) and cooldowns (min gap between two services).
   */
  async validateDependencies(args: {
    tenantId: string;
    personId: string;
    serviceId: string;
    startsAt: string;
  }): Promise<{
    ok: boolean;
    missing: string[];
    cooldown_conflicts: string[];
    notes: string[];
  }> {
    const deps = await this.services.listDependencies(args.serviceId);
    const missing: string[] = [];
    const cooldown_conflicts: string[] = [];
    const notes: string[] = [];

    for (const d of deps) {
      const depServiceId = (d as unknown as { depends_on_service_id: string })
        .depends_on_service_id;
      const kind = (d as unknown as { dependency_kind: string }).dependency_kind;
      const minGapDays = Number(
        (d as unknown as { min_gap_days?: number | null }).min_gap_days ?? 0,
      );

      const { data, error } = await this.sb
        .from("appointments")
        .select("id, starts_at, status_code")
        .eq("tenant_id", args.tenantId)
        .eq("person_id", args.personId)
        .eq("service_id", depServiceId)
        .in("status_code", ["completed", "scheduled", "checked_in", "in_progress"])
        .order("starts_at", { ascending: false });
      if (error) throw new Error(error.message);
      const rows = data ?? [];

      if (kind === "prerequisite") {
        const done = rows.find((r) => r.status_code === "completed");
        if (!done) missing.push(depServiceId);
      }
      if (kind === "cooldown" && rows.length > 0) {
        const last = rows[0];
        const gap =
          (new Date(args.startsAt).getTime() -
            new Date(last.starts_at).getTime()) /
          86_400_000;
        if (gap < minGapDays) {
          cooldown_conflicts.push(depServiceId);
          notes.push(
            `Service ${depServiceId} cooldown of ${minGapDays}d not met (${gap.toFixed(1)}d).`,
          );
        }
      }
    }
    return {
      ok: missing.length === 0 && cooldown_conflicts.length === 0,
      missing,
      cooldown_conflicts,
      notes,
    };
  }
}
