/**
 * Lead Platform — Repositories (server-only).
 * Thin, typed wrappers around Supabase table access. Business logic
 * (events, scoring, assignment rules, SLA start) lives in services and
 * server functions that compose these repos.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("Row not found");
  return res.data;
}
function unwrapMaybe<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function unwrapList<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

// ---------- Lead ---------------------------------------------------------

export type LeadRow = Tables<"leads">;
export type LeadInsert = TablesInsert<"leads">;
export type LeadUpdate = TablesUpdate<"leads">;

export class LeadRepository {
  constructor(private readonly sb: SB) {}

  insert(row: LeadInsert): Promise<LeadRow> {
    return this.sb.from("leads").insert(row).select("*").single().then(unwrap);
  }
  update(id: string, patch: LeadUpdate): Promise<LeadRow> {
    return this.sb.from("leads").update(patch).eq("id", id).select("*").single().then(unwrap);
  }
  getById(id: string): Promise<LeadRow | null> {
    return this.sb.from("leads").select("*").eq("id", id).maybeSingle().then(unwrapMaybe);
  }
  async countOpenByOwner(tenantId: string, ownerId: string): Promise<number> {
    const { count, error } = await this.sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("owner_id", ownerId)
      .in("status", ["open"]);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  async findByExternalRef(tenantId: string, externalRef: string): Promise<LeadRow | null> {
    return unwrapMaybe(
      await this.sb
        .from("leads")
        .select("*")
        .eq("tenant_id", tenantId)
        .contains("meta", { external_ref: externalRef } as never)
        .maybeSingle(),
    );
  }
}

// ---------- Lead Assignment history -------------------------------------

export type LeadAssignmentRow = Tables<"lead_assignments">;
export type LeadAssignmentInsert = TablesInsert<"lead_assignments">;

export class AssignmentRepository {
  constructor(private readonly sb: SB) {}

  insert(row: LeadAssignmentInsert): Promise<LeadAssignmentRow> {
    return this.sb.from("lead_assignments").insert(row).select("*").single().then(unwrap);
  }
  async closeOpen(leadId: string): Promise<void> {
    const { error } = await this.sb
      .from("lead_assignments")
      .update({ ended_at: new Date().toISOString() })
      .eq("lead_id", leadId)
      .is("ended_at", null);
    if (error) throw new Error(error.message);
  }
  async listByLead(leadId: string): Promise<LeadAssignmentRow[]> {
    return unwrapList(
      await this.sb
        .from("lead_assignments")
        .select("*")
        .eq("lead_id", leadId)
        .order("effective_at", { ascending: false }),
    );
  }
}

// ---------- Follow-up queue ---------------------------------------------

export type FollowUpRow = Tables<"lead_follow_ups">;
export type FollowUpInsert = TablesInsert<"lead_follow_ups">;
export type FollowUpUpdate = TablesUpdate<"lead_follow_ups">;

export class FollowUpRepository {
  constructor(private readonly sb: SB) {}
  insert(row: FollowUpInsert): Promise<FollowUpRow> {
    return this.sb.from("lead_follow_ups").insert(row).select("*").single().then(unwrap);
  }
  update(id: string, patch: FollowUpUpdate): Promise<FollowUpRow> {
    return this.sb.from("lead_follow_ups").update(patch).eq("id", id).select("*").single().then(unwrap);
  }
  async listDue(args: {
    tenantId: string;
    ownerId?: string | null;
    before?: string;
    limit: number;
    offset: number;
  }): Promise<FollowUpRow[]> {
    let q = this.sb
      .from("lead_follow_ups")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .range(args.offset, args.offset + args.limit - 1);
    if (args.ownerId) q = q.eq("owner_id", args.ownerId);
    if (args.before) q = q.lte("due_at", args.before);
    return unwrapList(await q);
  }
}

// ---------- Scoring events ----------------------------------------------

export type ScoringEventInsert = TablesInsert<"lead_scoring_events">;

export class ScoringEventRepository {
  constructor(private readonly sb: SB) {}
  insert(row: ScoringEventInsert): Promise<void> {
    return this.sb.from("lead_scoring_events").insert(row).then((r) => {
      if (r.error) throw new Error(r.error.message);
    });
  }
  async sumByKind(leadId: string): Promise<Record<string, number>> {
    const { data, error } = await this.sb
      .from("lead_scoring_events")
      .select("kind, delta")
      .eq("lead_id", leadId);
    if (error) throw new Error(error.message);
    const totals: Record<string, number> = {};
    for (const r of data ?? []) {
      totals[r.kind] = (totals[r.kind] ?? 0) + Number(r.delta ?? 0);
    }
    return totals;
  }
}
