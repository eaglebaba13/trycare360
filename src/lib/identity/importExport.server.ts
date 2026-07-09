/**
 * Import / Export Services (Stage E).
 *
 * CSV import + validation + duplicate preview + export. Excel is fed
 * through the same code path after the caller converts the sheet to a
 * `{ headers, rows }` shape (the frontend does the .xlsx → JSON step
 * with SheetJS in Stage E's UI phase).
 *
 * The importer never writes rows itself — it emits a `PreviewReport`
 * that the caller reviews before invoking `commit=true`, at which
 * point rows flow through `createPerson()` so all normalization,
 * dedup, and event emission stay consistent with the standard write
 * path.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeEmail, normalizePhone } from "./validators";

type SB = SupabaseClient<Database>;

export interface ImportRowIssue {
  row: number;
  field: string;
  message: string;
}

export interface ImportPreviewReport {
  total: number;
  valid: number;
  invalid: number;
  probable_duplicates: number;
  issues: ImportRowIssue[];
  sample_duplicates: Array<{ row: number; matched_person_id: string; reason: string }>;
}

export interface NormalizedImportRow {
  row: number;
  tenant_id: string;
  full_name: string;
  phone_e164: string | null;
  email_normalized: string | null;
  dob: string | null;
  gender: string | null;
  raw: Record<string, string>;
}

const REQUIRED = ["full_name"] as const;
const OPTIONAL = ["phone", "email", "dob", "gender", "default_dial"] as const;

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (c === '"') {
          inQ = false;
        } else cur += c;
      } else {
        if (c === ",") {
          out.push(cur);
          cur = "";
        } else if (c === '"') inQ = true;
        else cur += c;
      }
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export class ImportService {
  constructor(private readonly sb: SB) {}

  normalize(
    tenantId: string,
    headers: string[],
    rows: string[][],
  ): { normalized: NormalizedImportRow[]; issues: ImportRowIssue[] } {
    const idx = (name: string) => headers.indexOf(name);
    const issues: ImportRowIssue[] = [];
    const normalized: NormalizedImportRow[] = [];

    for (const req of REQUIRED) {
      if (idx(req) === -1) {
        issues.push({ row: 0, field: req, message: `Missing required column: ${req}` });
      }
    }
    if (issues.length > 0) return { normalized, issues };

    rows.forEach((cells, i) => {
      const row = i + 2; // header + 1-index
      const get = (name: (typeof REQUIRED)[number] | (typeof OPTIONAL)[number]) => {
        const j = idx(name);
        return j >= 0 ? (cells[j] ?? "").trim() : "";
      };
      const raw: Record<string, string> = {};
      for (const h of headers) {
        const j = headers.indexOf(h);
        raw[h] = (cells[j] ?? "").trim();
      }
      const full_name = get("full_name");
      if (!full_name) {
        issues.push({ row, field: "full_name", message: "Empty full_name" });
        return;
      }
      const phoneRaw = get("phone");
      const emailRaw = get("email");
      const dob = get("dob") || null;
      const gender = get("gender") || null;
      const defaultDial = get("default_dial") || undefined;
      const phone = normalizePhone(phoneRaw || null, { defaultDial });
      const email = normalizeEmail(emailRaw || null);
      if (phoneRaw && !phone) {
        issues.push({ row, field: "phone", message: "Unrecognized phone format" });
      }
      if (emailRaw && !email) {
        issues.push({ row, field: "email", message: "Invalid email address" });
      }
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        issues.push({ row, field: "dob", message: "Expected YYYY-MM-DD" });
      }
      normalized.push({
        row,
        tenant_id: tenantId,
        full_name,
        phone_e164: phone,
        email_normalized: email,
        dob,
        gender,
        raw,
      });
    });
    return { normalized, issues };
  }

  async preview(
    tenantId: string,
    headers: string[],
    rows: string[][],
  ): Promise<{ report: ImportPreviewReport; normalized: NormalizedImportRow[] }> {
    const { normalized, issues } = this.normalize(tenantId, headers, rows);

    const phones = normalized.map((r) => r.phone_e164).filter((v): v is string => !!v);
    const emails = normalized.map((r) => r.email_normalized).filter((v): v is string => !!v);

    let dupRows: Array<{ id: string; phone_e164: string | null; email_normalized: string | null }> = [];
    if (phones.length > 0 || emails.length > 0) {
      // OR clause across the two normalized identifier columns.
      const filters: string[] = [];
      if (phones.length > 0) filters.push(`phone_e164.in.(${phones.map((p) => `"${p}"`).join(",")})`);
      if (emails.length > 0) filters.push(`email_normalized.in.(${emails.map((e) => `"${e}"`).join(",")})`);
      const { data } = await this.sb
        .from("persons")
        .select("id, phone_e164, email_normalized")
        .eq("tenant_id", tenantId)
        .or(filters.join(","))
        .limit(2000);
      dupRows = data ?? [];
    }

    const byPhone = new Map<string, string>();
    const byEmail = new Map<string, string>();
    for (const r of dupRows) {
      if (r.phone_e164) byPhone.set(r.phone_e164, r.id);
      if (r.email_normalized) byEmail.set(r.email_normalized, r.id);
    }

    const sample_duplicates: ImportPreviewReport["sample_duplicates"] = [];
    let probableDuplicates = 0;
    for (const r of normalized) {
      const p = r.phone_e164 ? byPhone.get(r.phone_e164) : undefined;
      const e = r.email_normalized ? byEmail.get(r.email_normalized) : undefined;
      const matched = p ?? e;
      if (matched) {
        probableDuplicates++;
        if (sample_duplicates.length < 25) {
          sample_duplicates.push({
            row: r.row,
            matched_person_id: matched,
            reason: p ? "phone match" : "email match",
          });
        }
      }
    }

    const invalidRows = new Set(issues.map((i) => i.row));
    const report: ImportPreviewReport = {
      total: rows.length,
      valid: normalized.length - invalidRows.size,
      invalid: invalidRows.size,
      probable_duplicates: probableDuplicates,
      issues,
      sample_duplicates,
    };
    return { report, normalized };
  }
}

export class ExportService {
  constructor(private readonly sb: SB) {}

  async personsCsv(tenantId: string, limit = 10_000): Promise<string> {
    const { data, error } = await this.sb
      .from("persons")
      .select(
        "id, full_name, phone_e164, email_normalized, gender, dob, identity_status, vip_flag, created_at",
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const headers = [
      "id",
      "full_name",
      "phone_e164",
      "email_normalized",
      "gender",
      "dob",
      "identity_status",
      "vip_flag",
      "created_at",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows
      .map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(","))
      .join("\n");
    return `${headers.join(",")}\n${body}`;
  }
}
