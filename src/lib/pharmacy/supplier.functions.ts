/**
 * Pharmacy — Supplier server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SupplierEngine } from "./engines/supplier.engine.server";
import { SupplierRepository } from "./repositories.server";
import {
  supplierListSchema,
  supplierProductUpsertSchema,
  supplierUpsertSchema,
} from "./validators";

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supplierListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new SupplierRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        search: data.search,
        activeOnly: data.activeOnly,
      }),
    };
  });

export const upsertSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supplierUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new SupplierEngine(context.supabase);
    return {
      supplier: await engine.upsert({
        id: data.id ?? undefined,
        tenant_id: data.tenantId,
        code: data.code,
        name: data.name,
        legal_name: data.legalName ?? null,
        company_id: data.companyId ?? null,
        contact_person: data.contactPerson ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        gstin: data.gstin ?? null,
        drug_license_no: data.drugLicenseNo ?? null,
        payment_terms: data.paymentTerms ?? null,
        lead_time_days: data.leadTimeDays ?? null,
        is_active: data.isActive,
        address: (data.address ?? {}) as never,
        meta: (data.meta ?? {}) as never,
        created_by: context.userId,
        updated_by: context.userId,
      }),
    };
  });

export const upsertSupplierProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supplierProductUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new SupplierRepository(context.supabase);
    return {
      product: await repo.upsertSupplierProduct({
        id: data.id ?? undefined,
        tenant_id: data.tenantId,
        supplier_id: data.supplierId,
        drug_id: data.drugId,
        supplier_sku: data.supplierSku ?? null,
        lead_time_days: data.leadTimeDays ?? null,
        moq: data.moq ?? null,
        is_preferred: data.isPreferred,
        is_active: data.isActive,
        meta: (data.meta ?? {}) as never,
        created_by: context.userId,
        updated_by: context.userId,
      }),
    };
  });

export const resolvePreferredSupplierForDrug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tenantId: z.string().uuid(), drugId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const engine = new SupplierEngine(context.supabase);
    return { preferred: await engine.resolvePreferredForDrug(data.tenantId, data.drugId) };
  });
