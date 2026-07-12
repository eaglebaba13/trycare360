/**
 * LedgerEngine — projections & summaries over the immutable journal
 * lines and sub-ledgers (AR/AP/Cash/Tax/Royalty/Revenue/Expense).
 *
 * Posting mutations flow through JournalEngine — this engine is read-only
 * except for sub-ledger inserts triggered by other engines.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import {
  AccountsPayableRepository,
  AccountsReceivableRepository,
} from "../repositories.server";

type SB = SupabaseClient<Database>;

export class LedgerEngine {
  private readonly ar: AccountsReceivableRepository;
  private readonly ap: AccountsPayableRepository;
  constructor(private readonly sb: SB) {
    this.ar = new AccountsReceivableRepository(sb);
    this.ap = new AccountsPayableRepository(sb);
  }

  async postAr(row: TablesInsert<"fin_ar_ledger">) {
    return this.ar.insert(row);
  }
  async postAp(row: TablesInsert<"fin_ap_ledger">) {
    return this.ap.insert(row);
  }
  async listAr(tenantId: string) {
    return this.ar.list(tenantId);
  }
  async listAp(tenantId: string) {
    return this.ap.list(tenantId);
  }

  /** Trial balance projection: sum debits/credits per account inside a date window. */
  async trialBalance(args: { tenantId: string; from: string; to: string }) {
    const { data, error } = await this.sb
      .from("fin_journal_lines")
      .select("account_id,debit,credit,journal_entry_id,fin_journal_entries!inner(entry_date,tenant_id,status)")
      .eq("tenant_id", args.tenantId)
      .eq("fin_journal_entries.tenant_id", args.tenantId)
      .eq("fin_journal_entries.status", "posted")
      .gte("fin_journal_entries.entry_date", args.from)
      .lte("fin_journal_entries.entry_date", args.to);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<{ account_id: string; debit: number; credit: number }>;
    const byAccount = new Map<string, { debit: number; credit: number }>();
    for (const r of rows) {
      const cur = byAccount.get(r.account_id) ?? { debit: 0, credit: 0 };
      cur.debit += Number(r.debit ?? 0);
      cur.credit += Number(r.credit ?? 0);
      byAccount.set(r.account_id, cur);
    }
    return Array.from(byAccount.entries()).map(([accountId, v]) => ({
      accountId,
      debit: Math.round(v.debit * 100) / 100,
      credit: Math.round(v.credit * 100) / 100,
      balance: Math.round((v.debit - v.credit) * 100) / 100,
    }));
  }
}
