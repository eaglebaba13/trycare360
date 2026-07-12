/**
 * Laboratory — order lifecycle server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  orderCancelSchema,
  orderCreateSchema,
  orderIdSchema,
  orderListSchema,
} from "./validators";
import { OrderEngine } from "./engines/order.engine.server";
import {
  LaboratoryOrderItemRepository,
  LaboratoryOrderRepository,
} from "./repositories.server";

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new OrderEngine(context.supabase);
    return { order: await engine.place(data, context.userId) };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderCancelSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new OrderEngine(context.supabase);
    return { order: await engine.cancel(data, context.userId) };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new LaboratoryOrderRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const orders = new LaboratoryOrderRepository(context.supabase);
    const items = new LaboratoryOrderItemRepository(context.supabase);
    const order = await orders.getById(data.orderId);
    if (!order || order.tenant_id !== data.tenantId) throw new Error("Not found");
    return { order, items: await items.listByOrder(order.id) };
  });
