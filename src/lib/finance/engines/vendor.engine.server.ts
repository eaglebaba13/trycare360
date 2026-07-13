/**
 * VendorEngine — vendor bills, approvals and payment linkage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PaymentRepository, VendorBillRepository } from "../repositories.server";
import {
  emitFinanceEvent,
  indexFinanceSearch,
  nextFinanceNumber,
  writeFinanceAudit,
} from "../helpers.server";
import { FINANCE_EVENTS } from "../events";
import { AutomationEngine } from "./automation.engine.server";
import type {
  vendorBillCreateSchema,
  vendorBillIdSchema,
  vendorPaymentSchema,
} from "../validators";
import type { z } from "zod";

type SB = SupabaseClient<Database>;

export class VendorEngine {
  private readonly bills: VendorBillRepository;
  private readonly payments: PaymentRepository;
  constructor(private readonly sb: SB) {
    this.bills = new VendorBillRepository(sb);
    this.payments = new PaymentRepository(sb);
  }

  async createBill(input: z.infer<typeof vendorBillCreateSchema>, actorId: string) {
    const number = await nextFinanceNumber(this.sb, input.tenantId, "vendor_bill", "VB");
    const subtotal = input.items.reduce(
      (s, i) => s + Number(i.quantity) * Number(i.unitPrice),
      0,
    );
    const tax = input.items.reduce((s, i) => s + Number(i.taxAmount ?? 0), 0);
    const total = subtotal + tax - Number(input.discountAmount);

    const bill = await this.bills.insert({
      tenant_id: input.tenantId,
      org_unit_id: input.orgUnitId ?? null,
      branch_id: input.branchId ?? null,
      vendor_id: input.vendorId ?? null,
      bill_number: number,
      vendor_invoice_ref: input.vendorInvoiceRef ?? null,
      bill_date: input.billDate,
      due_date: input.dueDate ?? null,
      currency: input.currency,
      subtotal: Math.round(subtotal * 100) / 100,
      tax_amount: Math.round(tax * 100) / 100,
      discount_amount: input.discountAmount,
      total_amount: Math.round(total * 100) / 100,
      paid_amount: 0,
      balance_amount: Math.round(total * 100) / 100,
      status: "received",
      source_module: input.sourceModule ?? null,
      source_reference_id: input.sourceReferenceId ?? null,
      notes: input.notes ?? null,
      created_by: actorId,
    });
    await this.bills.insertItems(
      input.items.map((it, idx) => ({
        tenant_id: input.tenantId,
        org_unit_id: input.orgUnitId ?? null,
        bill_id: bill.id,
        line_number: idx + 1,
        account_id: it.accountId ?? null,
        cost_center_id: it.costCenterId ?? null,
        description: it.description ?? null,
        quantity: it.quantity,
        unit_price: it.unitPrice,
        tax_code: it.taxCode ?? null,
        tax_amount: it.taxAmount,
        amount: Math.round(it.quantity * it.unitPrice * 100) / 100,
      })),
    );
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.VendorBillReceived, {
      billId: bill.id,
      total,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "vendor_bill",
      entityId: bill.id,
      action: "receive",
      eventType: FINANCE_EVENTS.VendorBillReceived,
      actorId,
      after: bill as never,
    });
    await indexFinanceSearch(this.sb, {
      tenantId: input.tenantId,
      entityType: "finance_vendor_bill",
      entityId: bill.id,
      title: `Bill ${number}`,
      subtitle: `${input.currency} ${total}`,
      keywords: `vendor bill ${number}`,
    });
    return bill;
  }

  async approve(input: z.infer<typeof vendorBillIdSchema>, actorId: string) {
    const bill = await this.bills.getById(input.billId);
    if (!bill || bill.tenant_id !== input.tenantId) throw new Error("Bill not found");
    if (bill.status !== "received" && bill.status !== "submitted")
      throw new Error(`Cannot approve bill in status ${bill.status}`);
    const updated = await this.bills.update(bill.id, { status: "approved" });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.VendorBillApproved, {
      billId: bill.id,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "vendor_bill",
      entityId: bill.id,
      action: "approve",
      eventType: FINANCE_EVENTS.VendorBillApproved,
      actorId,
      before: bill as never,
      after: updated as never,
    });
    await new AutomationEngine(this.sb).postVendorBill(
      {
        tenantId: input.tenantId,
        orgUnitId: bill.org_unit_id,
        branchId: bill.branch_id,
        entryDate: bill.bill_date,
        amount: Number(bill.total_amount),
        currency: bill.currency,
        billId: bill.id,
        vendorId: bill.vendor_id,
      },
      actorId,
    );
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.VendorBillPosted, {
      billId: bill.id,
    });
    return updated;
  }

  async recordPayment(input: z.infer<typeof vendorPaymentSchema>, actorId: string) {
    const bill = await this.bills.getById(input.billId);
    if (!bill || bill.tenant_id !== input.tenantId) throw new Error("Bill not found");
    if (bill.status !== "approved" && bill.status !== "partially_paid")
      throw new Error(`Bill not in a payable status (${bill.status})`);

    const number = await nextFinanceNumber(this.sb, input.tenantId, "payment", "PAY");
    const payment = await this.payments.insert({
      tenant_id: input.tenantId,
      org_unit_id: bill.org_unit_id,
      branch_id: bill.branch_id,
      payment_number: number,
      payment_date: input.paymentDate,
      bank_account_id: input.bankAccountId ?? null,
      partner_type: "vendor",
      partner_id: bill.vendor_id,
      method: input.method,
      reference: input.reference ?? null,
      amount: input.amount,
      currency: bill.currency,
      status: "recorded",
      source_module: "finance_vendor_bill",
      source_reference_id: bill.id,
      created_by: actorId,
    });
    const paid = Number(bill.paid_amount) + Number(input.amount);
    const balance = Math.max(0, Number(bill.total_amount) - paid);
    const newStatus = balance <= 0 ? "paid" : "partially_paid";
    const updatedBill = await this.bills.update(bill.id, {
      paid_amount: Math.round(paid * 100) / 100,
      balance_amount: Math.round(balance * 100) / 100,
      status: newStatus,
    });
    await emitFinanceEvent(this.sb, input.tenantId, FINANCE_EVENTS.VendorBillPaid, {
      billId: bill.id,
      paymentId: payment.id,
      amount: input.amount,
    });
    await writeFinanceAudit(this.sb, {
      tenantId: input.tenantId,
      entityType: "vendor_bill",
      entityId: bill.id,
      action: "pay",
      eventType: FINANCE_EVENTS.VendorBillPaid,
      actorId,
      before: bill as never,
      after: updatedBill as never,
      metadata: { paymentId: payment.id },
    });
    return { bill: updatedBill, payment };
  }
}
