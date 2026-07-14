/**
 * Patient Portal — Payment server functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PaymentPortalEngine } from "./engines/payments.engine.server";
import {
  paymentLinkRequestSchema,
  paymentsListSchema,
  refundStatusSchema,
} from "./validators";

export const listMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentsListSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new PaymentPortalEngine(context.supabase);
    return { rows: await engine.listInvoices({ viewerUserId: context.userId, ...data }) };
  });

export const listMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentsListSchema.parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const engine = new PaymentPortalEngine(context.supabase);
    return { rows: await engine.listPayments({ viewerUserId: context.userId, ...data }) };
  });

export const requestPaymentLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => paymentLinkRequestSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PaymentPortalEngine(context.supabase);
    return await engine.requestPaymentLink({ viewerUserId: context.userId, ...data });
  });

export const getRefundStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => refundStatusSchema.parse(d))
  .handler(async ({ context, data }) => {
    const engine = new PaymentPortalEngine(context.supabase);
    return await engine.getRefundStatus({ viewerUserId: context.userId, ...data });
  });
