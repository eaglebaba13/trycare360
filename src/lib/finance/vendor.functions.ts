/**
 * Vendor bill / AP server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  vendorBillCreateSchema,
  vendorBillIdSchema,
  vendorBillListSchema,
  vendorPaymentSchema,
} from "./validators";
import { VendorEngine } from "./engines/vendor.engine.server";
import { VendorBillRepository } from "./repositories.server";

export const createVendorBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorBillCreateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new VendorEngine(context.supabase);
    return { bill: await engine.createBill(data, context.userId) };
  });

export const approveVendorBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorBillIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new VendorEngine(context.supabase);
    return { bill: await engine.approve(data, context.userId) };
  });

export const recordVendorPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorPaymentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new VendorEngine(context.supabase);
    return await engine.recordPayment(data, context.userId);
  });

export const listVendorBills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorBillListSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new VendorBillRepository(context.supabase);
    return { rows: await repo.list(data) };
  });

export const getVendorBill = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorBillIdSchema.parse(d))
  .handler(async ({ context, data }) => {
    const repo = new VendorBillRepository(context.supabase);
    const bill = await repo.getById(data.billId);
    if (!bill || bill.tenant_id !== data.tenantId) throw new Error("Not found");
    return { bill, items: await repo.listItems(bill.id) };
  });
