/**
 * Pharmacy — Warehouse, Location, and Bin server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WarehouseEngine } from "./engines/warehouse.engine.server";
import { WarehouseRepository } from "./repositories.server";
import {
  warehouseBinUpsertSchema,
  warehouseListSchema,
  warehouseLocationUpsertSchema,
  warehouseUpsertSchema,
} from "./validators";
import { z } from "zod";

export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => warehouseListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new WarehouseRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        branchId: data.branchId ?? null,
        activeOnly: data.activeOnly,
      }),
    };
  });

export const upsertWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => warehouseUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new WarehouseEngine(context.supabase);
    return {
      warehouse: await engine.upsertWarehouse({
        id: data.id ?? undefined,
        tenant_id: data.tenantId,
        code: data.code,
        name: data.name,
        warehouse_type: data.warehouseType,
        parent_id: data.parentId ?? null,
        branch_id: data.branchId ?? null,
        address: (data.address ?? {}) as never,
        gstin: data.gstin ?? null,
        drug_license_no: data.drugLicenseNo ?? null,
        is_active: data.isActive,
        created_by: context.userId,
        updated_by: context.userId,
        meta: (data.meta ?? {}) as never,
      }),
    };
  });

export const listWarehouseLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ warehouseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new WarehouseRepository(context.supabase);
    return { rows: await repo.listLocations(data.warehouseId) };
  });

export const upsertWarehouseLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => warehouseLocationUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new WarehouseRepository(context.supabase);
    return {
      location: await repo.upsertLocation({
        id: data.id ?? undefined,
        tenant_id: data.tenantId,
        warehouse_id: data.warehouseId,
        code: data.code,
        name: data.name,
        location_type: data.locationType,
        temperature_min_c: data.temperatureMinC ?? null,
        temperature_max_c: data.temperatureMaxC ?? null,
        is_active: data.isActive,
        created_by: context.userId,
        updated_by: context.userId,
        meta: (data.meta ?? {}) as never,
      }),
    };
  });

export const listWarehouseBins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ warehouseId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const repo = new WarehouseRepository(context.supabase);
    return { rows: await repo.listBins(data.warehouseId) };
  });

export const upsertWarehouseBin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => warehouseBinUpsertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new WarehouseRepository(context.supabase);
    return {
      bin: await repo.upsertBin({
        id: data.id ?? undefined,
        tenant_id: data.tenantId,
        warehouse_id: data.warehouseId,
        location_id: data.locationId ?? null,
        code: data.code,
        rack: data.rack ?? null,
        shelf: data.shelf ?? null,
        bin: data.bin ?? null,
        capacity: data.capacity ?? null,
        is_active: data.isActive,
        created_by: context.userId,
        updated_by: context.userId,
        meta: (data.meta ?? {}) as never,
      }),
    };
  });
