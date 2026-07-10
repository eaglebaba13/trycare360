/**
 * Commission repositories (server-only).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

export type CommissionPlan = Tables<"commission_plans">;
export type CommissionRule = Tables<"commission_rules">;
export type CommissionAssignment = Tables<"commission_assignments">;
export type CommissionAccrual = Tables<"commission_accruals">;
export type CommissionAccrualInsert = TablesInsert<"commission_accruals">;

export class CommissionPlanRepository {
  constructor(private readonly sb: SB) {}
  async listActive(tenantId: string, beneficiaryType?: string): Promise<CommissionPlan[]> {
    let q = this.sb
      .from("commission_plans")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .eq("status", "active");
    if (beneficiaryType) q = q.eq("beneficiary_type", beneficiaryType);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async upsert(row: TablesInsert<"commission_plans">): Promise<CommissionPlan> {
    const { data, error } = await this.sb
      .from("commission_plans")
      .upsert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("upsert failed");
    return data;
  }
  async snapshot(plan_id: string, tenant_id: string, version: number): Promise<void> {
    const [{ data: plan }, { data: rules }, { data: asgs }] = await Promise.all([
      this.sb.from("commission_plans").select("*").eq("id", plan_id).maybeSingle(),
      this.sb.from("commission_rules").select("*").eq("plan_id", plan_id),
      this.sb.from("commission_assignments").select("*").eq("plan_id", plan_id),
    ]);
    await this.sb.from("commission_plan_versions").insert({
      tenant_id,
      plan_id,
      version,
      snapshot: { plan, rules, assignments: asgs } as never,
    });
  }
}

export class CommissionRuleRepository {
  constructor(private readonly sb: SB) {}
  async listForPlan(planId: string): Promise<CommissionRule[]> {
    const { data, error } = await this.sb
      .from("commission_rules")
      .select("*")
      .eq("plan_id", planId)
      .eq("is_active", true)
      .order("priority", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async upsert(row: TablesInsert<"commission_rules">): Promise<CommissionRule> {
    const { data, error } = await this.sb
      .from("commission_rules")
      .upsert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("upsert failed");
    return data;
  }
}

export class CommissionAssignmentRepository {
  constructor(private readonly sb: SB) {}
  async listForPlan(planId: string): Promise<CommissionAssignment[]> {
    const { data, error } = await this.sb
      .from("commission_assignments")
      .select("*")
      .eq("plan_id", planId)
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async upsert(row: TablesInsert<"commission_assignments">): Promise<CommissionAssignment> {
    const { data, error } = await this.sb
      .from("commission_assignments")
      .upsert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("upsert failed");
    return data;
  }
}

export class CommissionAccrualRepository {
  constructor(private readonly sb: SB) {}
  async insertMany(rows: CommissionAccrualInsert[]): Promise<CommissionAccrual[]> {
    if (!rows.length) return [];
    const { data, error } = await this.sb
      .from("commission_accruals")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async listByPeriod(tenantId: string, periodKey: string): Promise<CommissionAccrual[]> {
    const { data, error } = await this.sb
      .from("commission_accruals")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("period_key", periodKey)
      .order("computed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  async deleteForEvent(revenueEventId: string): Promise<void> {
    const { error } = await this.sb
      .from("commission_accruals")
      .delete()
      .eq("revenue_event_id", revenueEventId);
    if (error) throw new Error(error.message);
  }
}
