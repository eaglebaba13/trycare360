/**
 * Instrument driver adapter — heartbeat, status, maintenance mode.
 * Wraps AnalyzerEngine + Integration Dispatcher, never talks to the
 * device directly.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AnalyzerEngine } from "../engines/analyzer.engine.server";
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = SupabaseClient<Database>;

export async function heartbeat(args: {
  supabase: SB;
  tenantId: string;
  instrumentId: string;
  providerCode: string;
}) {
  const res = await dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.providerCode,
    action: "lab.instrument.heartbeat",
    payload: { instrumentId: args.instrumentId },
  });
  return { ok: res.ok, latencyMs: res.latencyMs };
}

export async function setMaintenanceMode(args: {
  supabase: SB;
  tenantId: string;
  instrumentId: string;
  enabled: boolean;
  actorId: string | null;
}) {
  const engine = new AnalyzerEngine(args.supabase);
  return args.enabled
    ? engine.markOffline(args.tenantId, args.instrumentId)
    : engine.upsertInstrument({
        tenantId: args.tenantId,
        id: args.instrumentId,
        code: "",
        name: "",
        status: "online",
        actorId: args.actorId,
      });
}
