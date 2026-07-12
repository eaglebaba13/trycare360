/**
 * HL7 v2 adapter (ORM^O01, ORU^R01).
 *
 * Thin serialiser + dispatcher. All wire traffic goes through the shared
 * Integration Dispatcher — never a direct fetch(). Business logic stays
 * inside the Stage 2 engines; this file only builds/parses HL7 messages.
 */
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = Parameters<typeof dispatch>[0]["supabase"];

const FS = "|";
const CR = "\r";

function seg(...fields: (string | number | null | undefined)[]) {
  return fields.map((f) => (f == null ? "" : String(f))).join(FS);
}

export interface HL7OrmInput {
  tenantId: string;
  messageControlId: string;
  sendingApp?: string;
  receivingApp?: string;
  patient: { id: string; family?: string; given?: string; dob?: string; sex?: string };
  order: { placerOrderNumber: string; universalServiceId: string; universalServiceText?: string; priority?: string };
}

export function buildOrm(input: HL7OrmInput): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  return [
    seg("MSH", "^~\\&", input.sendingApp ?? "LOVABLE_LIS", "LOVABLE", input.receivingApp ?? "ANALYZER", "SITE", ts, "", "ORM^O01", input.messageControlId, "P", "2.5"),
    seg("PID", "1", "", input.patient.id, "", `${input.patient.family ?? ""}^${input.patient.given ?? ""}`, "", input.patient.dob ?? "", input.patient.sex ?? ""),
    seg("ORC", "NW", input.order.placerOrderNumber),
    seg("OBR", "1", input.order.placerOrderNumber, "", `${input.order.universalServiceId}^${input.order.universalServiceText ?? ""}`, input.order.priority ?? "R"),
  ].join(CR);
}

export interface HL7OruSegment {
  observationId: string;
  observationText?: string;
  value: string | number;
  units?: string;
  refRange?: string;
  abnormalFlag?: string;
  status?: "P" | "C" | "F";
}

export function buildOru(args: {
  tenantId: string;
  messageControlId: string;
  patientId: string;
  fillerOrderNumber: string;
  observations: HL7OruSegment[];
  sendingApp?: string;
  receivingApp?: string;
}): string {
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const segments: string[] = [
    seg("MSH", "^~\\&", args.sendingApp ?? "LOVABLE_LIS", "LOVABLE", args.receivingApp ?? "EMR", "SITE", ts, "", "ORU^R01", args.messageControlId, "P", "2.5"),
    seg("PID", "1", "", args.patientId),
    seg("OBR", "1", "", args.fillerOrderNumber),
  ];
  args.observations.forEach((o, idx) => {
    segments.push(
      seg(
        "OBX",
        String(idx + 1),
        typeof o.value === "number" ? "NM" : "ST",
        `${o.observationId}^${o.observationText ?? ""}`,
        "",
        String(o.value),
        o.units ?? "",
        o.refRange ?? "",
        o.abnormalFlag ?? "",
        "",
        "",
        o.status ?? "F",
      ),
    );
  });
  return segments.join(CR);
}

/** Very small ORU parser — enough to feed AnalyzerEngine.ingestResult(). */
export function parseOru(msg: string): { patientId: string | null; observations: HL7OruSegment[] } {
  const segs = msg.split(/\r|\n/).filter(Boolean);
  let patientId: string | null = null;
  const observations: HL7OruSegment[] = [];
  for (const s of segs) {
    const parts = s.split(FS);
    if (parts[0] === "PID") patientId = parts[3] ?? null;
    if (parts[0] === "OBX") {
      const [id, text] = (parts[3] ?? "").split("^");
      observations.push({
        observationId: id ?? "",
        observationText: text,
        value: parts[5] ?? "",
        units: parts[6],
        refRange: parts[7],
        abnormalFlag: parts[8],
        status: (parts[11] as "P" | "C" | "F") ?? "F",
      });
    }
  }
  return { patientId, observations };
}

export async function sendHl7(args: {
  supabase: SB;
  tenantId: string;
  providerCode?: string;
  action: "orm" | "oru";
  message: string;
  meta?: Record<string, unknown>;
}) {
  return dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.providerCode ?? "hl7",
    action: `lab.hl7.${args.action}`,
    payload: { message: args.message, ...(args.meta ?? {}) },
  });
}
