/**
 * Analyzer high-level orchestrator. Wraps AnalyzerEngine + HL7/ASTM helpers
 * so the UI/automation surface has one entry point per driver.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { AnalyzerEngine } from "../engines/analyzer.engine.server";
import { buildOrm, buildOru, parseOru, sendHl7 } from "./hl7.server";
import { encodeAstm, parseAstm, sendAstm, type AstmRecord } from "./astm.server";

type SB = SupabaseClient<Database>;

export type AnalyzerProtocol = "hl7" | "astm" | "rest";

export async function dispatchOrder(args: {
  supabase: SB;
  tenantId: string;
  instrumentId: string;
  protocol: AnalyzerProtocol;
  providerCode: string;
  orderItemId: string;
  patientId: string;
  placerOrderNumber: string;
  serviceCode: string;
  serviceText?: string;
  actorId: string | null;
}) {
  const engine = new AnalyzerEngine(args.supabase);
  const queue = await engine.enqueue({
    tenantId: args.tenantId,
    instrumentId: args.instrumentId,
    orderItemId: args.orderItemId,
  });
  if (args.protocol === "hl7") {
    const msg = buildOrm({
      tenantId: args.tenantId,
      messageControlId: queue.id,
      patient: { id: args.patientId },
      order: {
        placerOrderNumber: args.placerOrderNumber,
        universalServiceId: args.serviceCode,
        universalServiceText: args.serviceText,
      },
    });
    await sendHl7({
      supabase: args.supabase,
      tenantId: args.tenantId,
      providerCode: args.providerCode,
      action: "orm",
      message: msg,
    });
  } else if (args.protocol === "astm") {
    const records: AstmRecord[] = [
      { type: "H", fields: ["\\^&", queue.id, "LOVABLE", "ANALYZER"] },
      { type: "P", fields: [args.patientId] },
      { type: "O", fields: [args.placerOrderNumber, args.serviceCode] },
      { type: "L", fields: ["N"] },
    ];
    await sendAstm({
      supabase: args.supabase,
      tenantId: args.tenantId,
      providerCode: args.providerCode,
      records,
    });
  }
  return queue;
}

export async function ingestFromHl7(args: {
  supabase: SB;
  tenantId: string;
  instrumentId: string;
  message: string;
}) {
  const engine = new AnalyzerEngine(args.supabase);
  const parsed = parseOru(args.message);
  const results = [];
  for (const obs of parsed.observations) {
    const numeric = Number(obs.value);
    const isNum = !Number.isNaN(numeric) && obs.value !== "";
    results.push(
      await engine.ingestResult({
        tenantId: args.tenantId,
        instrumentId: args.instrumentId,
        numericValue: isNum ? numeric : null,
        textValue: isNum ? null : String(obs.value),
        unitCode: obs.units ?? null,
        flag: obs.abnormalFlag ?? null,
        rawPayload: { hl7: obs },
      }),
    );
  }
  return { ingested: results.length, results };
}

export async function ingestFromAstm(args: {
  supabase: SB;
  tenantId: string;
  instrumentId: string;
  payload: string;
}) {
  const engine = new AnalyzerEngine(args.supabase);
  const recs = parseAstm(args.payload);
  const results = [];
  for (const r of recs.filter((x) => x.type === "R")) {
    const value = r.fields[1];
    const numeric = Number(value);
    const isNum = !Number.isNaN(numeric) && value !== "" && value != null;
    results.push(
      await engine.ingestResult({
        tenantId: args.tenantId,
        instrumentId: args.instrumentId,
        numericValue: isNum ? numeric : null,
        textValue: isNum ? null : String(value ?? ""),
        unitCode: (r.fields[2] as string) ?? null,
        flag: (r.fields[3] as string) ?? null,
        rawPayload: { astm: r },
      }),
    );
  }
  return { ingested: results.length, results };
}

export { buildOru };
