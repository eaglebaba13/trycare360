import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assertFamilyPermission, resolvePatientIdentity } from "../helpers.server";
import { ClinicalContextLoader } from "@/lib/clinical/context-loader.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Patient records engine — read-only aggregation over the platform
 * clinical, laboratory, radiology, pathology, pharmacy, and billing
 * tables. Delegates to `ClinicalContextLoader` for the SOAP-scoped
 * summary and only issues additional list queries for surface data
 * the loader does not include.
 */
export class PatientRecordsEngine {
  constructor(private readonly sb: SB) {}

  private async target(viewerUserId: string, targetUserId?: string, capability: "view" | "manage" = "view") {
    const target = targetUserId ?? viewerUserId;
    if (target !== viewerUserId) {
      await assertFamilyPermission(this.sb, { viewerUserId, targetUserId: target, capability });
    }
    return resolvePatientIdentity(this.sb, target);
  }

  async clinicalSummary(args: { viewerUserId: string; targetUserId?: string }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) {
      return null;
    }
    const loader = new ClinicalContextLoader(this.sb);
    return loader.getClinicalContext({
      tenantId: identity.tenantId,
      personId: identity.personId,
      userId: args.viewerUserId,
      historyLimit: 20,
    });
  }

  private async list(
    args: { viewerUserId: string; targetUserId?: string; limit?: number },
    table: string,
    orderColumn: string,
  ) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data, error } = await this.sb
      .from(table)
      .select("*")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .order(orderColumn, { ascending: false })
      .limit(args.limit ?? 50);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  listEncounters(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    return this.list(args, "clinical_encounters", "encounter_at");
  }
  listPrescriptions(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    return this.list(args, "clinical_prescriptions", "created_at");
  }
  listTreatmentPlans(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    return this.list(args, "clinical_treatment_plans", "created_at");
  }
  listLabReports(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    return this.list(args, "lab_orders", "created_at");
  }
  async listRadiologyReports(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    // Radiology reports use lab_orders with category=radiology in this platform.
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("lab_orders")
      .select("*")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .contains("meta", { category: "radiology" })
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 50);
    return data ?? [];
  }
  async listPathologyReports(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("lab_orders")
      .select("*")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .contains("meta", { category: "pathology" })
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 50);
    return data ?? [];
  }
  async listPharmacyOrders(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("pharmacy_dispenses")
      .select("*")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .order("created_at", { ascending: false })
      .limit(args.limit ?? 50);
    return data ?? [];
  }
  async listInvoices(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("revenue_events")
      .select("*")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .order("occurred_at", { ascending: false })
      .limit(args.limit ?? 50);
    return data ?? [];
  }
  async listPayments(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("revenue_events")
      .select("*")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .contains("meta", { kind: "payment" })
      .order("occurred_at", { ascending: false })
      .limit(args.limit ?? 50);
    return data ?? [];
  }
}
