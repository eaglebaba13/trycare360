/**
 * LIS Router — decides which analyzer / external vendor / channel should
 * receive an order or a result. Pure routing rules; all side-effects go
 * through Stage 2 engines and the Integration Dispatcher.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AnalyzerRepository } from "../repositories.server";

type SB = SupabaseClient<Database>;

export interface RoutingDecision {
  target: "analyzer" | "external" | "manual";
  instrumentId?: string;
  vendorCode?: string;
  reason: string;
}

export async function routeOrderItem(args: {
  supabase: SB;
  tenantId: string;
  testCode?: string | null;
  branchId?: string | null;
  preferInstrumentId?: string | null;
}): Promise<RoutingDecision> {
  const repo = new AnalyzerRepository(args.supabase);
  const instruments = await repo.list(args.tenantId);
  const online = instruments.filter((i) => i.status === "online" && (!args.branchId || i.branch_id === args.branchId));

  if (args.preferInstrumentId) {
    const explicit = online.find((i) => i.id === args.preferInstrumentId);
    if (explicit) return { target: "analyzer", instrumentId: explicit.id, reason: "preferred_online" };
  }

  if (online.length > 0) {
    const chosen = online[0]!;
    return { target: "analyzer", instrumentId: chosen.id, reason: "first_online" };
  }

  return { target: "manual", reason: "no_online_instrument" };
}

export function routeResultDistribution(args: {
  hasEmail: boolean;
  hasPhone: boolean;
  patientPreference?: "email" | "whatsapp" | "sms" | "portal" | "print";
}): Array<"email" | "whatsapp" | "sms" | "portal" | "print"> {
  if (args.patientPreference) return [args.patientPreference];
  const out: Array<"email" | "whatsapp" | "sms" | "portal" | "print"> = ["portal"];
  if (args.hasEmail) out.push("email");
  if (args.hasPhone) out.push("whatsapp");
  return out;
}
