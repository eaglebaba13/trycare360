/**
 * Pharmacy — Purchase Order + GRN server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  grnPostSchema,
  poCreateSchema,
  poIdSchema,
  poListSchema,
} from "./validators";
import { PurchaseEngine } from "./engines/purchase.engine.server";
import { PurchaseOrderRepository } from "./repositories.server";

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PurchaseEngine(context.supabase);
    return { po: await engine.createPo(data, context.userId) };
  });

export const approvePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PurchaseEngine(context.supabase);
    return { po: await engine.approve(data.tenantId, data.poId, context.userId) };
  });

export const markPurchaseOrderSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PurchaseEngine(context.supabase);
    return { po: await engine.markSent(data.tenantId, data.poId, context.userId) };
  });

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PurchaseOrderRepository(context.supabase);
    return {
      rows: await repo.list({
        tenantId: data.tenantId,
        supplierId: data.supplierId ?? null,
        status: data.status ?? null,
        limit: data.limit,
      }),
    };
  });

export const getPurchaseOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => poIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new PurchaseOrderRepository(context.supabase);
    const po = await repo.getById(data.poId);
    if (!po || po.tenant_id !== data.tenantId) throw new Error("Not found");
    const items = await repo.listItems(po.id);
    return { po, items };
  });

export const postGoodsReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => grnPostSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PurchaseEngine(context.supabase);
    return { grn: await engine.postGrn(data, context.userId) };
  });
