/**
 * SupplierEngine — preferred supplier resolution, supplier scoring
 * updates, and supplier product catalog maintenance.
 *
 * Supplier score is a rolling composite computed from delivered PO
 * performance. Stage 2 exposes the update primitive; live recomputation
 * lives in Stage 6 analytics.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import { SupplierRepository, type SupplierRow } from "../repositories.server";

type SB = SupabaseClient<Database>;

export interface SupplierScoreInputs {
  onTimeRate: number;      // 0..1
  fillRate: number;        // 0..1
  qualityRate: number;     // 0..1 (non-defective GRN ratio)
  responsivenessRate: number; // 0..1
}

export class SupplierEngine {
  private readonly suppliers: SupplierRepository;
  constructor(private readonly sb: SB) {
    this.suppliers = new SupplierRepository(sb);
  }

  async upsert(row: TablesInsert<"pharmacy_suppliers">): Promise<SupplierRow> {
    if (row.id) return this.suppliers.update(row.id, row);
    return this.suppliers.insert(row);
  }

  async resolvePreferredForDrug(tenantId: string, drugId: string) {
    const products = await this.suppliers.listProductsForDrug(tenantId, drugId);
    const preferred = products.find((p) => p.is_preferred) ?? products[0] ?? null;
    return preferred;
  }

  async listSupplierHistory(supplierId: string, limit = 50) {
    const { data, error } = await this.sb
      .from("pharmacy_purchase_orders")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("po_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  computeScore(inputs: SupplierScoreInputs): number {
    const w = { onTime: 0.35, fill: 0.30, quality: 0.25, respond: 0.10 };
    return Math.max(
      0,
      Math.min(
        1,
        inputs.onTimeRate * w.onTime +
          inputs.fillRate * w.fill +
          inputs.qualityRate * w.quality +
          inputs.responsivenessRate * w.respond,
      ),
    );
  }

  async applyScore(supplierId: string, score: number) {
    return this.suppliers.update(supplierId, { supplier_score: score });
  }
}
