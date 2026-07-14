import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { assertFamilyPermission, resolvePatientIdentity } from "../helpers.server";
import { dispatch } from "@/lib/integrations/dispatcher.server";

// biome-ignore lint/suspicious/noExplicitAny: escape from deep generics
type SB = SupabaseClient<Database> | any;

/**
 * Payment portal engine — patient view over invoices, payments and
 * refunds. Actual payment-gateway calls flow through the Integration
 * Dispatcher; this engine never uses `fetch()` directly. Pricing,
 * invoice line calculation and refund policy live in the Billing /
 * Payments / Finance modules.
 */
export class PaymentPortalEngine {
  constructor(private readonly sb: SB) {}

  private async target(viewerUserId: string, targetUserId?: string, capability: "view" | "pay" = "view") {
    const target = targetUserId ?? viewerUserId;
    if (target !== viewerUserId) {
      await assertFamilyPermission(this.sb, { viewerUserId, targetUserId: target, capability });
    }
    return resolvePatientIdentity(this.sb, target);
  }

  async listInvoices(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("revenue_events")
      .select("id, amount, occurred_at, category, source_module, meta")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .order("occurred_at", { ascending: false })
      .limit(args.limit ?? 100);
    return data ?? [];
  }

  async listPayments(args: { viewerUserId: string; targetUserId?: string; limit?: number }) {
    const identity = await this.target(args.viewerUserId, args.targetUserId);
    if (!identity.tenantId || !identity.personId) return [];
    const { data } = await this.sb
      .from("revenue_events")
      .select("id, amount, occurred_at, category, source_module, meta")
      .eq("tenant_id", identity.tenantId)
      .eq("person_id", identity.personId)
      .contains("meta", { kind: "payment" })
      .order("occurred_at", { ascending: false })
      .limit(args.limit ?? 100);
    return data ?? [];
  }

  async requestPaymentLink(args: {
    viewerUserId: string;
    invoiceId: string;
    amount: number;
    currency?: string;
    meta?: Record<string, unknown>;
  }) {
    const identity = await resolvePatientIdentity(this.sb, args.viewerUserId);
    if (!identity.tenantId) throw new Error("Patient not registered");
    // Delegate to the payment provider configured for this tenant via the Integration Dispatcher.
    return dispatch({
      supabase: this.sb,
      tenantId: identity.tenantId,
      providerCode: "payments",
      action: "create_payment_link",
      payload: {
        invoiceId: args.invoiceId,
        amount: args.amount,
        currency: args.currency ?? "INR",
        patient_user_id: args.viewerUserId,
        meta: args.meta ?? {},
      },
      idempotencyKey: `payment-link:${args.invoiceId}:${args.amount}`,
    });
  }

  async getRefundStatus(args: { viewerUserId: string; paymentId: string }) {
    const identity = await resolvePatientIdentity(this.sb, args.viewerUserId);
    if (!identity.tenantId) throw new Error("Patient not registered");
    return dispatch({
      supabase: this.sb,
      tenantId: identity.tenantId,
      providerCode: "payments",
      action: "get_refund_status",
      payload: { paymentId: args.paymentId, patient_user_id: args.viewerUserId },
    });
  }
}
