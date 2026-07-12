/**
 * Phase 2.8 Laboratory — Stage 2 Repositories (server-only).
 *
 * Thin typed wrappers over the Stage 1 lab_/rad_ tables. Repositories
 * contain NO business logic — they only read and write rows.
 * All orchestration (accession numbering, workflow events, timeline,
 * search indexing, revenue, verification, release, QC, delta checks,
 * critical values) lives in the engines under ./engines/*.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import type {
  PostgrestMaybeSingleResponse,
  PostgrestResponse,
  PostgrestSingleResponse,
} from "@supabase/supabase-js";

type SB = SupabaseClient<Database>;

function unwrap<T>(res: PostgrestSingleResponse<T>): T {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("Row not found");
  return res.data as T;
}
function unwrapMaybe<T>(res: PostgrestMaybeSingleResponse<T>): T | null {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? null) as T | null;
}
function unwrapList<T>(res: PostgrestResponse<T>): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export type LabOrderRow = Tables<"lab_orders">;
export type LabOrderItemRow = Tables<"lab_order_items">;

export class LaboratoryOrderRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_orders").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"lab_orders">) {
    return unwrap(await this.sb.from("lab_orders").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_orders">) {
    return unwrap(
      await this.sb.from("lab_orders").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    status?: string | null;
    branchId?: string | null;
    personId?: string | null;
    from?: string | null;
    to?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("lab_orders")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("ordered_at", { ascending: false });
    if (args.status) q = q.eq("status", args.status);
    if (args.branchId) q = q.eq("branch_id", args.branchId);
    if (args.personId) q = q.eq("person_id", args.personId);
    if (args.from) q = q.gte("ordered_at", args.from);
    if (args.to) q = q.lte("ordered_at", args.to);
    return unwrapList(await q.limit(args.limit ?? 100));
  }
}

export class LaboratoryOrderItemRepository {
  constructor(private readonly sb: SB) {}
  async insertMany(rows: TablesInsert<"lab_order_items">[]) {
    if (!rows.length) return [] as LabOrderItemRow[];
    return unwrapList(await this.sb.from("lab_order_items").insert(rows).select("*"));
  }
  async listByOrder(orderId: string) {
    return unwrapList(
      await this.sb
        .from("lab_order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true }),
    );
  }
  async update(id: string, patch: TablesUpdate<"lab_order_items">) {
    return unwrap(
      await this.sb.from("lab_order_items").update(patch).eq("id", id).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Catalog: tests, panels, reference ranges, delta, critical, masters
// ---------------------------------------------------------------------------
export type TestCatalogRow = Tables<"lab_test_catalog">;
export class TestCatalogRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_test_catalog").select("*").eq("id", id).maybeSingle(),
    );
  }
  async getByCode(tenantId: string, code: string) {
    return unwrapMaybe(
      await this.sb
        .from("lab_test_catalog")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("code", code)
        .maybeSingle(),
    );
  }
  async list(args: { tenantId: string; search?: string; activeOnly?: boolean; limit?: number }) {
    let q = this.sb
      .from("lab_test_catalog")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("name", { ascending: true });
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    if (args.search?.trim()) {
      const s = args.search.trim();
      q = q.or(`name.ilike.%${s}%,code.ilike.%${s}%,short_name.ilike.%${s}%`);
    }
    return unwrapList(await q.limit(args.limit ?? 100));
  }
  async insert(row: TablesInsert<"lab_test_catalog">) {
    return unwrap(await this.sb.from("lab_test_catalog").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_test_catalog">) {
    return unwrap(
      await this.sb.from("lab_test_catalog").update(patch).eq("id", id).select("*").single(),
    );
  }
}

export type PanelRow = Tables<"lab_panels">;
export type PanelTestRow = Tables<"lab_panel_tests">;
export class PanelRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(await this.sb.from("lab_panels").select("*").eq("id", id).maybeSingle());
  }
  async list(args: { tenantId: string; activeOnly?: boolean; limit?: number }) {
    let q = this.sb
      .from("lab_panels")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("name", { ascending: true });
    if (args.activeOnly !== false) q = q.eq("is_active", true);
    return unwrapList(await q.limit(args.limit ?? 100));
  }
  async insert(row: TablesInsert<"lab_panels">) {
    return unwrap(await this.sb.from("lab_panels").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_panels">) {
    return unwrap(await this.sb.from("lab_panels").update(patch).eq("id", id).select("*").single());
  }
  async listTests(panelId: string) {
    return unwrapList(
      await this.sb
        .from("lab_panel_tests")
        .select("*")
        .eq("panel_id", panelId)
        .order("sequence", { ascending: true }),
    );
  }
  async replaceTests(tenantId: string, panelId: string, rows: TablesInsert<"lab_panel_tests">[]) {
    const del = await this.sb.from("lab_panel_tests").delete().eq("panel_id", panelId);
    if (del.error) throw new Error(del.error.message);
    if (!rows.length) return [] as PanelTestRow[];
    return unwrapList(
      await this.sb
        .from("lab_panel_tests")
        .insert(rows.map((r) => ({ ...r, tenant_id: tenantId, panel_id: panelId })))
        .select("*"),
    );
  }
}

export class ReferenceRangeRepository {
  constructor(private readonly sb: SB) {}
  async listForTest(testId: string) {
    return unwrapList(
      await this.sb
        .from("lab_reference_ranges")
        .select("*")
        .eq("test_id", testId)
        .eq("is_active", true),
    );
  }
  async upsert(row: TablesInsert<"lab_reference_ranges">) {
    return unwrap(await this.sb.from("lab_reference_ranges").upsert(row).select("*").single());
  }
}

export class DeltaCheckRepository {
  constructor(private readonly sb: SB) {}
  async getForTest(tenantId: string, testId: string) {
    return unwrapMaybe(
      await this.sb
        .from("lab_delta_check_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("test_id", testId)
        .eq("is_active", true)
        .maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"lab_delta_check_rules">) {
    return unwrap(await this.sb.from("lab_delta_check_rules").upsert(row).select("*").single());
  }
}

export class CriticalValueRepository {
  constructor(private readonly sb: SB) {}
  async getForTest(tenantId: string, testId: string) {
    return unwrapMaybe(
      await this.sb
        .from("lab_critical_value_rules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("test_id", testId)
        .eq("is_active", true)
        .maybeSingle(),
    );
  }
  async upsert(row: TablesInsert<"lab_critical_value_rules">) {
    return unwrap(await this.sb.from("lab_critical_value_rules").upsert(row).select("*").single());
  }
}

// ---------------------------------------------------------------------------
// Specimens
// ---------------------------------------------------------------------------
export type SpecimenRow = Tables<"lab_specimens">;
export class SpecimenRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_specimens").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"lab_specimens">) {
    return unwrap(await this.sb.from("lab_specimens").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_specimens">) {
    return unwrap(
      await this.sb.from("lab_specimens").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listByOrder(orderId: string) {
    return unwrapList(
      await this.sb.from("lab_specimens").select("*").eq("order_id", orderId),
    );
  }
  async insertContainer(row: TablesInsert<"lab_specimen_containers">) {
    return unwrap(
      await this.sb.from("lab_specimen_containers").insert(row).select("*").single(),
    );
  }
  async listContainers(specimenId: string) {
    return unwrapList(
      await this.sb.from("lab_specimen_containers").select("*").eq("specimen_id", specimenId),
    );
  }
}

export class SpecimenTrackingRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"lab_specimen_tracking">) {
    return unwrap(
      await this.sb.from("lab_specimen_tracking").insert(row).select("*").single(),
    );
  }
  async listForSpecimen(specimenId: string) {
    return unwrapList(
      await this.sb
        .from("lab_specimen_tracking")
        .select("*")
        .eq("specimen_id", specimenId)
        .order("occurred_at", { ascending: true }),
    );
  }
}

export class BarcodeRepository {
  constructor(private readonly sb: SB) {}
  async findByValue(tenantId: string, value: string) {
    return unwrapMaybe(
      await this.sb
        .from("lab_specimen_barcodes")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("barcode_value", value)
        .maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"lab_specimen_barcodes">) {
    return unwrap(
      await this.sb.from("lab_specimen_barcodes").insert(row).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Accessioning
// ---------------------------------------------------------------------------
export type AccessionRow = Tables<"lab_accessions">;
export class AccessionRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_accessions").select("*").eq("id", id).maybeSingle(),
    );
  }
  async getByNumber(tenantId: string, accessionNo: string) {
    return unwrapMaybe(
      await this.sb
        .from("lab_accessions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("accession_no", accessionNo)
        .maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"lab_accessions">) {
    return unwrap(await this.sb.from("lab_accessions").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_accessions">) {
    return unwrap(
      await this.sb.from("lab_accessions").update(patch).eq("id", id).select("*").single(),
    );
  }
}

// ---------------------------------------------------------------------------
// Analyzers / QC / Calibration
// ---------------------------------------------------------------------------
export type InstrumentRow = Tables<"lab_analyzer_instruments">;
export class AnalyzerRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_analyzer_instruments").select("*").eq("id", id).maybeSingle(),
    );
  }
  async list(tenantId: string) {
    return unwrapList(
      await this.sb
        .from("lab_analyzer_instruments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name"),
    );
  }
  async upsert(row: TablesInsert<"lab_analyzer_instruments">) {
    return unwrap(
      await this.sb.from("lab_analyzer_instruments").upsert(row).select("*").single(),
    );
  }
  async setStatus(id: string, status: string) {
    return unwrap(
      await this.sb
        .from("lab_analyzer_instruments")
        .update({ status, last_online_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

export class AnalyzerQueueRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"lab_analyzer_queues">) {
    return unwrap(await this.sb.from("lab_analyzer_queues").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_analyzer_queues">) {
    return unwrap(
      await this.sb.from("lab_analyzer_queues").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listByInstrument(instrumentId: string, status?: string) {
    let q = this.sb
      .from("lab_analyzer_queues")
      .select("*")
      .eq("instrument_id", instrumentId)
      .order("queued_at", { ascending: true });
    if (status) q = q.eq("status", status);
    return unwrapList(await q.limit(200));
  }
}

export class AnalyzerResultRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"lab_analyzer_results">) {
    return unwrap(await this.sb.from("lab_analyzer_results").insert(row).select("*").single());
  }
  async listForQueue(queueId: string) {
    return unwrapList(
      await this.sb.from("lab_analyzer_results").select("*").eq("queue_id", queueId),
    );
  }
}

export class QCRepository {
  constructor(private readonly sb: SB) {}
  async insertRun(row: TablesInsert<"lab_qc_runs">) {
    return unwrap(await this.sb.from("lab_qc_runs").insert(row).select("*").single());
  }
  async recentForTest(tenantId: string, testId: string, limit = 20) {
    return unwrapList(
      await this.sb
        .from("lab_qc_runs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("test_id", testId)
        .order("run_at", { ascending: false })
        .limit(limit),
    );
  }
  async listRules(tenantId: string, testId?: string) {
    let q = this.sb
      .from("lab_qc_rules")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    if (testId) q = q.or(`test_id.eq.${testId},test_id.is.null`);
    return unwrapList(await q);
  }
  async listMaterials(tenantId: string) {
    return unwrapList(
      await this.sb
        .from("lab_qc_materials")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true),
    );
  }
}

export class CalibrationRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"lab_calibration_records">) {
    return unwrap(
      await this.sb.from("lab_calibration_records").insert(row).select("*").single(),
    );
  }
  async listForInstrument(instrumentId: string) {
    return unwrapList(
      await this.sb
        .from("lab_calibration_records")
        .select("*")
        .eq("instrument_id", instrumentId)
        .order("calibrated_at", { ascending: false })
        .limit(50),
    );
  }
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
export type ResultRow = Tables<"lab_results">;
export class ResultRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(await this.sb.from("lab_results").select("*").eq("id", id).maybeSingle());
  }
  async findLatestForPersonTest(
    tenantId: string,
    testId: string,
    orderId: string | null,
  ): Promise<ResultRow | null> {
    // For delta checks: fetch the most recent non-current result for the same
    // patient / test. We resolve via the parent order's person_id.
    if (!orderId) return null;
    const order = unwrapMaybe(
      await this.sb.from("lab_orders").select("person_id").eq("id", orderId).maybeSingle(),
    ) as { person_id: string | null } | null;
    if (!order?.person_id) return null;
    const rows = unwrapList(
      await this.sb
        .from("lab_results")
        .select("*, lab_orders!inner(person_id)")
        .eq("tenant_id", tenantId)
        .eq("test_id", testId)
        .eq("lab_orders.person_id", order.person_id)
        .neq("status", "amended")
        .order("performed_at", { ascending: false })
        .limit(2),
    ) as ResultRow[];
    return rows[1] ?? null;
  }
  async insert(row: TablesInsert<"lab_results">) {
    return unwrap(await this.sb.from("lab_results").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_results">) {
    return unwrap(
      await this.sb.from("lab_results").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(args: {
    tenantId: string;
    orderId?: string | null;
    status?: string | null;
    limit?: number;
  }) {
    let q = this.sb
      .from("lab_results")
      .select("*")
      .eq("tenant_id", args.tenantId)
      .order("performed_at", { ascending: false });
    if (args.orderId) q = q.eq("order_id", args.orderId);
    if (args.status) q = q.eq("status", args.status);
    return unwrapList(await q.limit(args.limit ?? 200));
  }
}

export class ResultVersionRepository {
  constructor(private readonly sb: SB) {}
  async listForResult(resultId: string) {
    return unwrapList(
      await this.sb
        .from("lab_result_versions")
        .select("*")
        .eq("result_id", resultId)
        .order("version", { ascending: false }),
    );
  }
  async insert(row: TablesInsert<"lab_result_versions">) {
    return unwrap(await this.sb.from("lab_result_versions").insert(row).select("*").single());
  }
  async nextVersion(resultId: string): Promise<number> {
    const last = unwrapMaybe(
      await this.sb
        .from("lab_result_versions")
        .select("version")
        .eq("result_id", resultId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ) as { version: number } | null;
    return (last?.version ?? 0) + 1;
  }
}

// ---------------------------------------------------------------------------
// Microbiology
// ---------------------------------------------------------------------------
export class MicrobiologyRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_microbiology_orders").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"lab_microbiology_orders">) {
    return unwrap(
      await this.sb.from("lab_microbiology_orders").insert(row).select("*").single(),
    );
  }
  async update(id: string, patch: TablesUpdate<"lab_microbiology_orders">) {
    return unwrap(
      await this.sb
        .from("lab_microbiology_orders")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single(),
    );
  }
}

export class CultureRepository {
  constructor(private readonly sb: SB) {}
  async insert(row: TablesInsert<"lab_cultures">) {
    return unwrap(await this.sb.from("lab_cultures").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_cultures">) {
    return unwrap(
      await this.sb.from("lab_cultures").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listForMicroOrder(microOrderId: string) {
    return unwrapList(
      await this.sb
        .from("lab_cultures")
        .select("*")
        .eq("microbiology_order_id", microOrderId)
        .order("created_at", { ascending: true }),
    );
  }
}

export class SensitivityRepository {
  constructor(private readonly sb: SB) {}
  async insertMany(rows: TablesInsert<"lab_sensitivity_panels">[]) {
    if (!rows.length) return [];
    return unwrapList(await this.sb.from("lab_sensitivity_panels").insert(rows).select("*"));
  }
  async listForCulture(cultureId: string) {
    return unwrapList(
      await this.sb.from("lab_sensitivity_panels").select("*").eq("culture_id", cultureId),
    );
  }
}

// ---------------------------------------------------------------------------
// Pathology
// ---------------------------------------------------------------------------
export type PathologyCaseRow = Tables<"lab_pathology_cases">;
export class PathologyRepository {
  constructor(private readonly sb: SB) {}
  async getById(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_pathology_cases").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insert(row: TablesInsert<"lab_pathology_cases">) {
    return unwrap(await this.sb.from("lab_pathology_cases").insert(row).select("*").single());
  }
  async update(id: string, patch: TablesUpdate<"lab_pathology_cases">) {
    return unwrap(
      await this.sb.from("lab_pathology_cases").update(patch).eq("id", id).select("*").single(),
    );
  }
  async list(tenantId: string, status?: string) {
    let q = this.sb
      .from("lab_pathology_cases")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    return unwrapList(await q.limit(200));
  }
}

// ---------------------------------------------------------------------------
// Radiology / Imaging
// ---------------------------------------------------------------------------
export type RadOrderRow = Tables<"rad_orders">;
export type RadStudyRow = Tables<"rad_imaging_studies">;
export class RadiologyRepository {
  constructor(private readonly sb: SB) {}
  async getOrder(id: string) {
    return unwrapMaybe(await this.sb.from("rad_orders").select("*").eq("id", id).maybeSingle());
  }
  async insertOrder(row: TablesInsert<"rad_orders">) {
    return unwrap(await this.sb.from("rad_orders").insert(row).select("*").single());
  }
  async updateOrder(id: string, patch: TablesUpdate<"rad_orders">) {
    return unwrap(
      await this.sb.from("rad_orders").update(patch).eq("id", id).select("*").single(),
    );
  }
  async listOrders(tenantId: string, status?: string) {
    let q = this.sb
      .from("rad_orders")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("ordered_at", { ascending: false });
    if (status) q = q.eq("status", status);
    return unwrapList(await q.limit(200));
  }
}

export class ImagingRepository {
  constructor(private readonly sb: SB) {}
  async getStudy(id: string) {
    return unwrapMaybe(
      await this.sb.from("rad_imaging_studies").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insertStudy(row: TablesInsert<"rad_imaging_studies">) {
    return unwrap(await this.sb.from("rad_imaging_studies").insert(row).select("*").single());
  }
  async updateStudy(id: string, patch: TablesUpdate<"rad_imaging_studies">) {
    return unwrap(
      await this.sb.from("rad_imaging_studies").update(patch).eq("id", id).select("*").single(),
    );
  }
  async insertMetadata(row: TablesInsert<"rad_image_metadata">) {
    return unwrap(await this.sb.from("rad_image_metadata").insert(row).select("*").single());
  }
  async listMetadata(studyId: string) {
    return unwrapList(
      await this.sb.from("rad_image_metadata").select("*").eq("study_id", studyId),
    );
  }
}

// ---------------------------------------------------------------------------
// Distribution / External Lab / Turnaround / Audit
// ---------------------------------------------------------------------------
export class DistributionRepository {
  constructor(private readonly sb: SB) {}
  async log(row: TablesInsert<"lab_distribution_logs">) {
    return unwrap(await this.sb.from("lab_distribution_logs").insert(row).select("*").single());
  }
  async listForOrder(orderId: string) {
    return unwrapList(
      await this.sb
        .from("lab_distribution_logs")
        .select("*")
        .eq("order_id", orderId)
        .order("sent_at", { ascending: false }),
    );
  }
}

export class ExternalLabRepository {
  constructor(private readonly sb: SB) {}
  async insertOrder(row: TablesInsert<"lab_external_orders">) {
    return unwrap(await this.sb.from("lab_external_orders").insert(row).select("*").single());
  }
  async updateOrder(id: string, patch: TablesUpdate<"lab_external_orders">) {
    return unwrap(
      await this.sb.from("lab_external_orders").update(patch).eq("id", id).select("*").single(),
    );
  }
  async getOrder(id: string) {
    return unwrapMaybe(
      await this.sb.from("lab_external_orders").select("*").eq("id", id).maybeSingle(),
    );
  }
  async insertResult(row: TablesInsert<"lab_external_results">) {
    return unwrap(await this.sb.from("lab_external_results").insert(row).select("*").single());
  }
}

export class TurnaroundRepository {
  constructor(private readonly sb: SB) {}
  async log(row: TablesInsert<"lab_turnaround_logs">) {
    return unwrap(await this.sb.from("lab_turnaround_logs").insert(row).select("*").single());
  }
  async listForOrder(orderId: string) {
    return unwrapList(
      await this.sb
        .from("lab_turnaround_logs")
        .select("*")
        .eq("order_id", orderId)
        .order("occurred_at", { ascending: true }),
    );
  }
}

export class AuditRepository {
  constructor(private readonly sb: SB) {}
  async listForEntity(tenantId: string, entityType: string, entityId: string) {
    return unwrapList(
      await this.sb
        .from("lab_audit")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("occurred_at", { ascending: false })
        .limit(200),
    );
  }
}
