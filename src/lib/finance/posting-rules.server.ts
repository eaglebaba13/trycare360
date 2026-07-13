/**
 * Phase 2.9 Stage 4 — Posting Rules (server-only helpers).
 *
 * Pure helpers that map operational events (revenue, receipts, payments,
 * vendor bills, expenses, depreciation, royalty, tax) to double-entry
 * journal-line templates using conventional Chart-of-Accounts codes.
 *
 * The AutomationEngine consumes these rules and posts through the
 * existing JournalEngine — no duplicate accounting logic lives here.
 *
 * Convention (fallback codes, overridable by tenant metadata):
 *   1100  Cash on hand
 *   1110  Bank
 *   1200  Accounts receivable
 *   1500  Fixed assets
 *   1590  Accumulated depreciation
 *   2100  Accounts payable
 *   2300  GST payable (output)
 *   2310  TDS payable
 *   2320  TCS payable
 *   2400  Royalty payable
 *   3900  Retained earnings
 *   4000  Operating revenue
 *   4100  Clinical revenue
 *   4110  Laboratory revenue
 *   4120  Radiology revenue
 *   4130  Pharmacy revenue
 *   4140  Consultation revenue
 *   4150  Membership revenue
 *   4160  Package revenue
 *   4170  Product sales
 *   4500  Insurance recovery
 *   5000  Operating expense
 *   5100  Salary expense
 *   5200  Depreciation expense
 *   5300  Inventory / purchase
 *   5400  Royalty expense
 *   6000  Tax expense
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Chart of accounts resolution
// ---------------------------------------------------------------------------

const accountCache = new Map<string, Map<string, string>>(); // tenant → code→id

async function loadAccounts(sb: SB, tenantId: string): Promise<Map<string, string>> {
  const cached = accountCache.get(tenantId);
  if (cached) return cached;
  const { data, error } = await sb
    .from("fin_chart_of_accounts")
    .select("id,code")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .limit(2000);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of data ?? []) map.set(String(r.code), r.id);
  accountCache.set(tenantId, map);
  return map;
}

export function invalidateAccountCache(tenantId?: string) {
  if (tenantId) accountCache.delete(tenantId);
  else accountCache.clear();
}

/** Resolve first matching code from an ordered fallback list. Returns null when none exist. */
export async function resolveAccountId(
  sb: SB,
  tenantId: string,
  candidates: string[],
): Promise<string | null> {
  const accounts = await loadAccounts(sb, tenantId);
  for (const c of candidates) {
    const id = accounts.get(c);
    if (id) return id;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

/** Returns an existing posted journal for (referenceType, referenceId) if one already exists. */
export async function findExistingJournalRef(
  sb: SB,
  tenantId: string,
  referenceType: string,
  referenceId: string,
): Promise<{ id: string; entry_number: string } | null> {
  const { data, error } = await sb
    .from("fin_journal_entries")
    .select("id,entry_number")
    .eq("tenant_id", tenantId)
    .eq("reference_type", referenceType)
    .eq("reference_id", referenceId)
    .neq("status", "void")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { id: string; entry_number: string } | null) ?? null;
}

// ---------------------------------------------------------------------------
// Rule map: source module → (debit, credit) account code candidates
// ---------------------------------------------------------------------------

export interface AccountPair {
  debit: string[];
  credit: string[];
}

export const REVENUE_ACCOUNTS: Record<string, string[]> = {
  clinical: ["4100", "4000"],
  laboratory: ["4110", "4000"],
  radiology: ["4120", "4000"],
  pharmacy: ["4130", "4170", "4000"],
  scheduling: ["4140", "4000"],
  consultation: ["4140", "4000"],
  membership: ["4150", "4000"],
  package: ["4160", "4000"],
  product: ["4170", "4000"],
  insurance: ["4500", "4000"],
};

export function revenueRule(sourceModule: string): AccountPair {
  const rev = REVENUE_ACCOUNTS[sourceModule] ?? ["4000"];
  return { debit: ["1200"], credit: rev };
}

export function receiptRule(method: string): AccountPair {
  const bankLike = ["card", "upi", "neft", "rtgs", "cheque"].includes(method);
  return { debit: bankLike ? ["1110", "1100"] : ["1100", "1110"], credit: ["1200"] };
}

export function paymentRule(method: string, partnerType: string): AccountPair {
  const bankLike = ["card", "upi", "neft", "rtgs", "cheque"].includes(method);
  const credit = bankLike ? ["1110", "1100"] : ["1100", "1110"];
  const debit: string[] =
    partnerType === "vendor"
      ? ["2100", "5000"]
      : partnerType === "employee"
        ? ["5100", "5000"]
        : partnerType === "tax_authority"
          ? ["2300", "2310", "2320"]
          : partnerType === "franchise"
            ? ["2400", "5400"]
            : ["5000"];
  return { debit, credit };
}

export function vendorBillRule(): AccountPair {
  return { debit: ["5300", "5000"], credit: ["2100"] };
}

export function expenseRule(category?: string | null): AccountPair {
  const cat = (category ?? "").toLowerCase();
  const debit: string[] = cat.includes("salary")
    ? ["5100", "5000"]
    : cat.includes("depreciation")
      ? ["5200", "5000"]
      : cat.includes("royalty")
        ? ["5400", "5000"]
        : cat.includes("tax")
          ? ["6000", "5000"]
          : ["5000"];
  return { debit, credit: ["2100"] };
}

export function depreciationRule(): AccountPair {
  return { debit: ["5200", "5000"], credit: ["1590"] };
}

export function royaltyAccrualRule(): AccountPair {
  return { debit: ["5400", "5000"], credit: ["2400"] };
}

export function royaltySettlementRule(): AccountPair {
  return { debit: ["2400"], credit: ["1110", "1100"] };
}

export function taxAccrualRule(taxType: string): AccountPair {
  if (taxType === "gst_output") return { debit: ["1200"], credit: ["2300"] };
  if (taxType === "gst_input") return { debit: ["2300"], credit: ["2100"] };
  if (taxType === "tds") return { debit: ["6000"], credit: ["2310"] };
  if (taxType === "tcs") return { debit: ["1200"], credit: ["2320"] };
  return { debit: ["6000"], credit: ["2300"] };
}

export function creditNoteRule(): AccountPair {
  return { debit: ["4000"], credit: ["1200"] };
}

export function debitNoteRule(): AccountPair {
  return { debit: ["2100"], credit: ["5000"] };
}

export function refundRule(method: string): AccountPair {
  const bankLike = ["card", "upi", "neft", "rtgs", "cheque"].includes(method);
  return { debit: ["1200"], credit: bankLike ? ["1110"] : ["1100"] };
}
