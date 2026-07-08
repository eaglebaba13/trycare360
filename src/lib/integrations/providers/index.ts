/**
 * Provider adapters. Each is a thin, isolated implementation.
 * All return `not_configured` until a live connection exists — so importing
 * business modules can call them today and light up once credentials land.
 */
import type { DispatchResult } from "../registry";

export type AdapterContext = {
  credentialsRef: string | null;
  config: Record<string, unknown>;
  scopes: string[];
};

export type Adapter = (
  action: string,
  payload: Record<string, unknown>,
  ctx: AdapterContext,
) => Promise<unknown>;

function notConfigured(provider: string): never {
  throw new Error(`${provider}_not_configured: link credentials in Settings → Integrations`);
}

export const metaAdapter: Adapter = async (_action, _payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("meta");
  return { queued: true, note: "Meta live wiring lands with Marketing module" };
};

export const googleAdapter: Adapter = async (_action, _payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("google");
  return { queued: true, note: "Google live wiring lands with Calendar/Analytics module" };
};

export const whatsappAdapter: Adapter = async (action, payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("whatsapp");
  const token = process.env[ctx.credentialsRef];
  if (!token) throw new Error("whatsapp_secret_missing");
  const phoneId = ctx.config.phone_number_id;
  if (!phoneId) throw new Error("whatsapp_phone_number_id_missing");
  // Real Meta Graph endpoint. Live-testable once secret is set.
  const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildWhatsappBody(action, payload, ctx.config)),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`whatsapp_${res.status}: ${JSON.stringify(body)}`);
  return body;
};

function buildWhatsappBody(action: string, p: Record<string, unknown>, cfg: Record<string, unknown>) {
  if (action === "sendText") {
    return { messaging_product: "whatsapp", to: p.to, type: "text", text: { body: p.text } };
  }
  if (action === "sendTemplate") {
    return {
      messaging_product: "whatsapp",
      to: p.to,
      type: "template",
      template: { name: p.template ?? cfg.default_template, language: { code: p.lang ?? "en_US" } },
    };
  }
  return { messaging_product: "whatsapp", to: p.to, type: "text", text: { body: JSON.stringify(p) } };
}

export const razorpayAdapter: Adapter = async (action, payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("razorpay");
  const secret = process.env[ctx.credentialsRef];
  const keyId = ctx.config.key_id as string | undefined;
  if (!secret || !keyId) throw new Error("razorpay_credentials_missing");
  const auth = Buffer.from(`${keyId}:${secret}`).toString("base64");
  const paths: Record<string, string> = {
    createPaymentLink: "/v1/payment_links",
    createOrder: "/v1/orders",
    refund: `/v1/payments/${payload.paymentId}/refund`,
  };
  const path = paths[action];
  if (!path) throw new Error(`razorpay_unknown_action_${action}`);
  const res = await fetch(`https://api.razorpay.com${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`razorpay_${res.status}: ${JSON.stringify(body)}`);
  return body;
};

export const smtpAdapter: Adapter = async (_action, payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("smtp");
  // Nodemailer is Node-only and not Worker-safe. Placeholder that queues
  // to integration_jobs; a follow-up worker (or Resend connector) delivers.
  return { queued: true, to: payload.to, subject: payload.subject };
};

export const smsAdapter: Adapter = async (_action, payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("sms_gateway");
  return { queued: true, to: payload.to };
};

export const pushAdapter: Adapter = async (_action, payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("push");
  return { queued: true, to: payload.to };
};

export const openaiAdapter: Adapter = async (action, payload, ctx) => {
  // OpenAI routes through Lovable AI Gateway — no per-tenant secret needed.
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("lovable_api_key_missing");
  if (action === "chat") {
    const model = (payload.model as string) ?? (ctx.config.default_chat_model as string) ?? "google/gemini-2.5-flash";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: payload.messages ?? [{ role: "user", content: String(payload.prompt ?? "") }] }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`openai_${res.status}: ${JSON.stringify(body)}`);
    return body;
  }
  return { note: `${action} adapter stubbed — Lovable Gateway call pending payload spec` };
};

export const courierAdapter: Adapter = async (_action, payload, ctx) => {
  if (!ctx.credentialsRef) notConfigured("courier");
  return { queued: true, awb: null, payload };
};

export const ADAPTERS: Record<string, Adapter> = {
  meta: metaAdapter,
  google: googleAdapter,
  whatsapp: whatsappAdapter,
  razorpay: razorpayAdapter,
  smtp: smtpAdapter,
  sms_gateway: smsAdapter,
  push: pushAdapter,
  openai: openaiAdapter,
  courier: courierAdapter,
};
