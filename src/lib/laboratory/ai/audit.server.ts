/**
 * Laboratory AI audit — reuses the shared `writeLabAudit` helper. Every
 * assistant turn writes a `lab_ai:<purpose>` action so compliance can
 * replay who asked what and how the recommendation was resolved.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { writeLabAudit } from "../helpers.server";

type SB = SupabaseClient<Database>;

export async function auditAiTurn(
  sb: SB,
  args: {
    tenantId: string;
    purpose: string;
    turnId: string;
    actorId: string | null;
    ok: boolean;
    latencyMs: number;
    tokensIn?: number | null;
    tokensOut?: number | null;
    model: string;
  },
): Promise<void> {
  await writeLabAudit(sb, {
    tenantId: args.tenantId,
    entityType: "lab_ai_turn",
    entityId: args.turnId,
    action: `lab_ai:${args.purpose}:${args.ok ? "ok" : "error"}`,
    actorId: args.actorId,
    diff: {
      latencyMs: args.latencyMs,
      tokensIn: args.tokensIn ?? null,
      tokensOut: args.tokensOut ?? null,
      model: args.model,
    },
  });
}

export async function auditAiStatusChange(
  sb: SB,
  args: {
    tenantId: string;
    turnId: string;
    actorId: string | null;
    status: string;
    reason?: string | null;
  },
): Promise<void> {
  await writeLabAudit(sb, {
    tenantId: args.tenantId,
    entityType: "lab_ai_turn",
    entityId: args.turnId,
    action: `lab_ai_status:${args.status}`,
    actorId: args.actorId,
    reason: args.reason ?? null,
  });
}
