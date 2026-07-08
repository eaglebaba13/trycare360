/**
 * Integration provider registry.
 * The list of providers is DB-driven (integration_providers table).
 * This file only holds the local TS types + config schema shape used by the UI.
 */
import { z } from "zod";

export const providerConfigFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["text", "number", "boolean", "select", "textarea"]),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  readonly: z.boolean().optional(),
  options: z.array(z.string()).optional(),
});
export type ProviderConfigField = z.infer<typeof providerConfigFieldSchema>;

export const providerConfigSchema = z.object({
  fields: z.array(providerConfigFieldSchema).default([]),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

export const CONNECTION_STATUS = ["pending", "connected", "error", "disconnected"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUS)[number];

export const JOB_STATUS = ["pending", "running", "success", "failed", "dead"] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

/**
 * Every module must go through dispatch() — never call third-party APIs directly.
 * This union documents the well-known actions per provider.
 */
export type DispatchAction =
  | { providerCode: "meta"; action: "postToPage" | "syncLeadForms" | "fetchAdInsights"; payload: Record<string, unknown> }
  | { providerCode: "google"; action: "createCalendarEvent" | "sendGmail" | "uploadToDrive" | "fetchAnalytics"; payload: Record<string, unknown> }
  | { providerCode: "whatsapp"; action: "sendTemplate" | "sendText" | "sendMedia"; payload: Record<string, unknown> }
  | { providerCode: "razorpay"; action: "createPaymentLink" | "createOrder" | "refund"; payload: Record<string, unknown> }
  | { providerCode: "smtp"; action: "sendEmail"; payload: Record<string, unknown> }
  | { providerCode: "sms_gateway"; action: "sendSms"; payload: Record<string, unknown> }
  | { providerCode: "push"; action: "sendPush"; payload: Record<string, unknown> }
  | { providerCode: "openai"; action: "chat" | "embed" | "ocr" | "analyzeImage"; payload: Record<string, unknown> }
  | { providerCode: "courier"; action: "bookShipment" | "trackShipment"; payload: Record<string, unknown> };

export type DispatchResult =
  | { ok: true; result: unknown; latencyMs: number }
  | { ok: false; error: string; retryable: boolean; latencyMs: number };
