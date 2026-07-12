/**
 * DistributionEngine — report distribution across channels (email, WhatsApp,
 * SMS, print, portal, FHIR, HL7). All external delivery flows through the
 * shared Integration Dispatcher — never direct fetch.
 *
 * ExternalLabEngine — outsourced test submission and inbound result
 * ingestion (reference labs).
 *
 * TurnaroundEngine — records milestones and computes TAT breach signals.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  DistributionRepository,
  ExternalLabRepository,
  TurnaroundRepository,
} from "../repositories.server";
import { emitLabEvent, writeLabAudit } from "../helpers.server";
import { LAB_EVENTS } from "../events";
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = SupabaseClient<Database>;

const CHANNEL_TO_PROVIDER: Record<string, string | null> = {
  email: "smtp",
  whatsapp: "whatsapp",
  sms: "sms",
  print: null,
  portal: null,
  fhir: "fhir",
  hl7: "hl7",
};

export class DistributionEngine {
  private readonly repo: DistributionRepository;
  constructor(private readonly sb: SB) {
    this.repo = new DistributionRepository(sb);
  }
  async send(args: {
    tenantId: string;
    orderId: string;
    channel: "email" | "whatsapp" | "sms" | "print" | "portal" | "fhir" | "hl7";
    recipient?: string | null;
    meta?: Record<string, unknown>;
    actorId: string | null;
  }) {
    let status: "sent" | "failed" | "queued" = "queued";
    let dispatchError: string | null = null;
    const provider = CHANNEL_TO_PROVIDER[args.channel];
    if (provider) {
      const res = await dispatch({
        supabase: this.sb,
        tenantId: args.tenantId,
        providerCode: provider,
        action: `lab.report.${args.channel}`,
        payload: {
          orderId: args.orderId,
          recipient: args.recipient,
          ...(args.meta ?? {}),
        },
      });
      status = res.ok ? "sent" : "failed";
      dispatchError = res.ok ? null : res.error;
    } else {
      status = "sent"; // print/portal handled inside the app
    }
    const row = await this.repo.log({
      tenant_id: args.tenantId,
      order_id: args.orderId,
      channel: args.channel,
      recipient: args.recipient ?? null,
      status,
      actor_id: args.actorId,
      sent_at: new Date().toISOString(),
      meta: { error: dispatchError, ...(args.meta ?? {}) } as never,
    });
    await emitLabEvent(
      this.sb,
      args.tenantId,
      status === "sent" ? LAB_EVENTS.ReportDelivered : LAB_EVENTS.ReportDeliveryFailed,
      { orderId: args.orderId, channel: args.channel, error: dispatchError },
    );
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_order",
      entityId: args.orderId,
      action: `distributed:${args.channel}:${status}`,
      actorId: args.actorId,
    });
    return row;
  }
}

export class ExternalLabEngine {
  private readonly repo: ExternalLabRepository;
  constructor(private readonly sb: SB) {
    this.repo = new ExternalLabRepository(sb);
  }
  async submit(args: {
    tenantId: string;
    orderId: string;
    vendorCode: string;
    cost?: number | null;
    currency?: string;
    meta?: Record<string, unknown>;
    actorId: string | null;
  }) {
    const res = await dispatch({
      supabase: this.sb,
      tenantId: args.tenantId,
      providerCode: args.vendorCode,
      action: "lab.external.submit",
      payload: { orderId: args.orderId, ...(args.meta ?? {}) },
    });
    const externalRef =
      res.ok && res.result && typeof res.result === "object" && "ref" in (res.result as object)
        ? String((res.result as { ref?: unknown }).ref ?? "")
        : null;
    const row = await this.repo.insertOrder({
      tenant_id: args.tenantId,
      order_id: args.orderId,
      vendor_code: args.vendorCode,
      external_ref: externalRef,
      cost: args.cost ?? null,
      currency: args.currency ?? "INR",
      status: res.ok ? "submitted" : "failed",
      submitted_at: new Date().toISOString(),
      created_by: args.actorId,
      updated_by: args.actorId,
      meta: (args.meta ?? {}) as never,
    });
    await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.ExternalOrderSubmitted, {
      externalOrderId: row.id,
      vendor: args.vendorCode,
      ok: res.ok,
    });
    return row;
  }
  async ingestResult(args: {
    tenantId: string;
    externalOrderId: string;
    payload: Record<string, unknown>;
    actorId: string | null;
  }) {
    const external = await this.repo.getOrder(args.externalOrderId);
    if (!external || external.tenant_id !== args.tenantId)
      throw new Error("External order not found");
    const row = await this.repo.insertResult({
      tenant_id: args.tenantId,
      external_order_id: args.externalOrderId,
      payload: args.payload as never,
      received_at: new Date().toISOString(),
      ingested: false,
      meta: {} as never,
    });
    await this.repo.updateOrder(args.externalOrderId, {
      status: "received",
      completed_at: new Date().toISOString(),
    });
    await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.ExternalResultReceived, {
      externalResultId: row.id,
      externalOrderId: args.externalOrderId,
    });
    await writeLabAudit(this.sb, {
      tenantId: args.tenantId,
      entityType: "lab_external_order",
      entityId: args.externalOrderId,
      action: "result_ingested",
      actorId: args.actorId,
    });
    return row;
  }
}

export class TurnaroundEngine {
  private readonly repo: TurnaroundRepository;
  constructor(private readonly sb: SB) {
    this.repo = new TurnaroundRepository(sb);
  }
  async logMilestone(args: {
    tenantId: string;
    orderId: string;
    orderItemId?: string | null;
    milestone: string;
    actorId?: string | null;
    meta?: Record<string, unknown>;
  }) {
    return this.repo.log({
      tenant_id: args.tenantId,
      order_id: args.orderId,
      order_item_id: args.orderItemId ?? null,
      milestone: args.milestone,
      actor_id: args.actorId ?? null,
      occurred_at: new Date().toISOString(),
      meta: (args.meta ?? {}) as never,
    });
  }
  /** Emit `lab.tat.breached` when elapsed minutes > catalog TAT. */
  async evaluateBreach(args: {
    tenantId: string;
    orderId: string;
    orderItemId?: string | null;
    catalogTatMinutes: number | null;
  }) {
    if (!args.catalogTatMinutes) return { breached: false };
    const history = await this.repo.listForOrder(args.orderId);
    const start = history[0];
    if (!start) return { breached: false };
    const elapsedMs = Date.now() - new Date(start.occurred_at).getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    if (elapsedMinutes > args.catalogTatMinutes) {
      await emitLabEvent(this.sb, args.tenantId, LAB_EVENTS.TatBreached, {
        orderId: args.orderId,
        orderItemId: args.orderItemId,
        elapsedMinutes,
        tatMinutes: args.catalogTatMinutes,
      });
      return { breached: true, elapsedMinutes };
    }
    return { breached: false, elapsedMinutes };
  }
}
