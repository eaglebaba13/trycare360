/**
 * External reference-lab adapter. Delegates to ExternalLabEngine (Stage 2)
 * and the Integration Dispatcher for actual vendor transport.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { ExternalLabEngine } from "../engines/distribution.engine.server";
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = SupabaseClient<Database>;

export async function submitToVendor(args: {
  supabase: SB;
  tenantId: string;
  orderId: string;
  vendorCode: string;
  cost?: number;
  meta?: Record<string, unknown>;
  actorId: string | null;
}) {
  const engine = new ExternalLabEngine(args.supabase);
  return engine.submit(args);
}

export async function ingestVendorResult(args: {
  supabase: SB;
  tenantId: string;
  externalOrderId: string;
  payload: Record<string, unknown>;
  actorId: string | null;
}) {
  const engine = new ExternalLabEngine(args.supabase);
  return engine.ingestResult(args);
}

export async function pingVendor(args: { supabase: SB; tenantId: string; vendorCode: string }) {
  return dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.vendorCode,
    action: "lab.external.ping",
    payload: {},
  });
}
