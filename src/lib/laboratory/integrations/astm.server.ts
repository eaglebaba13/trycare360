/**
 * ASTM E1381/E1394 adapter for analyzer serial/TCP driver traffic.
 * Encoding + dispatch only. Business logic lives in AnalyzerEngine.
 */
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = Parameters<typeof dispatch>[0]["supabase"];

const STX = "\x02";
const ETX = "\x03";
const CR = "\r";
const LF = "\n";

export interface AstmRecord {
  type: "H" | "P" | "O" | "R" | "L";
  fields: (string | number | null | undefined)[];
}

export function encodeAstm(records: AstmRecord[]): string {
  return records
    .map((r, idx) => {
      const body = [r.type, String(idx + 1), ...r.fields.map((f) => (f == null ? "" : String(f)))].join("|");
      const frame = `${STX}${idx + 1}${body}${CR}${ETX}`;
      return frame + LF;
    })
    .join("");
}

export function parseAstm(payload: string): AstmRecord[] {
  const lines = payload.split(/\r|\n/).filter(Boolean);
  return lines
    .map((raw) => raw.replace(STX, "").replace(ETX, ""))
    .map((line) => line.replace(/^\d+/, "").split("|"))
    .filter((parts) => parts.length > 1)
    .map<AstmRecord>((parts) => ({
      type: (parts[0] as AstmRecord["type"]) ?? "H",
      fields: parts.slice(2),
    }));
}

export async function sendAstm(args: {
  supabase: SB;
  tenantId: string;
  providerCode: string;
  records: AstmRecord[];
  meta?: Record<string, unknown>;
}) {
  return dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.providerCode,
    action: "lab.astm.send",
    payload: { frame: encodeAstm(args.records), ...(args.meta ?? {}) },
  });
}
