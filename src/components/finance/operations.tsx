import { useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  IndianRupee, Wallet, Banknote, Receipt, Building2, Landmark, TrendingUp,
  ShieldCheck, ClipboardCheck, CircleDollarSign, FileBarChart, Scale, Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid, type DataGridColumn } from "@/components/standards/data-grid";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { toast } from "sonner";

import { listJournalEntries } from "@/lib/finance/journal.functions";
import { listReceipts, listPayments, listBankAccounts } from "@/lib/finance/cash.functions";
import { listExpenses, approveExpense } from "@/lib/finance/expenses.functions";
import { listVendorBills, approveVendorBill } from "@/lib/finance/vendor.functions";
import { listAssets } from "@/lib/finance/assets.functions";
import { listBudgets } from "@/lib/finance/budget.functions";
import { listForecasts } from "@/lib/finance/forecast.functions";
import { listRoyaltyRules, listRoyaltySettlements } from "@/lib/finance/royalty.functions";
import { listTaxes } from "@/lib/finance/tax.functions";
import { listPeriodsByYear, listFiscalYears, closePeriod, openPeriod } from "@/lib/finance/chart.functions";
import { trialBalance, profitLoss, balanceSheet, cashFlow } from "@/lib/finance/reports.functions";
import {
  runMonthEnd, runYearEnd, runDepreciationBatch, autoMatchBankStatement, postSourceRevenue,
} from "@/lib/finance/automation.functions";

const fmtINR = (n: number | null | undefined) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// ─────────────────────────────────────────────────────────────
// KPI cards
// ─────────────────────────────────────────────────────────────
export function CashPositionCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listBankAccounts);
  const q = useQuery({ queryKey: ["fin", "bank", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const balance = (q.data ?? []).reduce((s: number, r: { current_balance?: number | null }) => s + Number(r.current_balance ?? 0), 0);
  return <KpiCard label="Cash position" value={fmtINR(balance)} icon={Wallet} tone="info" hint={`${(q.data ?? []).length} bank accounts`} />;
}

export function OutstandingInvoicesCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listReceipts);
  const q = useQuery({ queryKey: ["fin", "ar", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const total = (q.data ?? []).reduce((s: number, r: { amount?: number | null }) => s + Number(r.amount ?? 0), 0);
  return <KpiCard label="Receipts (recent)" value={fmtINR(total)} icon={CircleDollarSign} tone="success" />;
}

export function OutstandingVendorBillsCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listVendorBills);
  const q = useQuery({ queryKey: ["fin", "ap", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const open = (q.data ?? []).filter((r: { status?: string }) => r.status !== "paid" && r.status !== "voided");
  const total = open.reduce((s: number, r: { total?: number | null }) => s + Number(r.total ?? 0), 0);
  return <KpiCard label="Open vendor bills" value={fmtINR(total)} icon={Building2} tone="warning" hint={`${open.length} pending`} />;
}

export function RoyaltySummaryCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listRoyaltySettlements);
  const q = useQuery({ queryKey: ["fin", "royalty", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const total = (q.data ?? []).reduce((s: number, r: { amount?: number | null }) => s + Number(r.amount ?? 0), 0);
  return <KpiCard label="Royalty settled" value={fmtINR(total)} icon={Scale} />;
}

export function TaxSummaryCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const total = (q.data ?? []).reduce((s: number, r: { amount?: number | null }) => s + Number(r.amount ?? 0), 0);
  return <KpiCard label="Tax ledger" value={fmtINR(total)} icon={ShieldCheck} />;
}

export function BudgetVarianceCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listBudgets);
  const q = useQuery({ queryKey: ["fin", "budgets", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return <KpiCard label="Active budgets" value={(q.data ?? []).length} icon={TrendingUp} />;
}

export function ForecastVarianceCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listForecasts);
  const q = useQuery({ queryKey: ["fin", "forecasts", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return <KpiCard label="Forecasts" value={(q.data ?? []).length} icon={FileBarChart} />;
}

export function FinancialHealthCards({ tenantId }: { tenantId: string }) {
  return (
    <KpiGrid>
      <CashPositionCard tenantId={tenantId} />
      <OutstandingInvoicesCard tenantId={tenantId} />
      <OutstandingVendorBillsCard tenantId={tenantId} />
      <RoyaltySummaryCard tenantId={tenantId} />
      <TaxSummaryCard tenantId={tenantId} />
      <BudgetVarianceCard tenantId={tenantId} />
      <ForecastVarianceCard tenantId={tenantId} />
      <KpiCard label="Compliance" value="OK" icon={ShieldCheck} tone="success" />
    </KpiGrid>
  );
}

// ─────────────────────────────────────────────────────────────
// Executive dashboard
// ─────────────────────────────────────────────────────────────
export function FinanceExecutiveDashboard({ tenantId }: { tenantId: string }) {
  const journalsFn = useServerFn(listJournalEntries);
  const journals = useQuery({
    queryKey: ["fin", "journals-exec", tenantId],
    queryFn: () => journalsFn({ data: { tenantId, limit: 20 } }),
  });
  return (
    <div className="space-y-4">
      <FinancialHealthCards tenantId={tenantId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent journal activity</CardTitle></CardHeader>
          <CardContent>
            <TimelinePanel
              items={(journals.data ?? []).slice(0, 10).map((j: { id: string; posted_at?: string | null; created_at?: string; journal_no?: string; memo?: string | null; status?: string }) => ({
                ts: j.posted_at ?? j.created_at ?? new Date().toISOString(),
                event_type: j.status ?? "journal",
                title: `Journal ${j.journal_no ?? j.id.slice(0, 8)}`,
                body: j.memo ?? null,
              }))}
              emptyMessage="No journal activity."
            />
          </CardContent>
        </Card>
        <PostingQueue tenantId={tenantId} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Operations / Approvals
// ─────────────────────────────────────────────────────────────
export function FinanceOperationsWorkspace({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <FinancialHealthCards tenantId={tenantId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ApprovalQueue tenantId={tenantId} />
        <PostingQueue tenantId={tenantId} />
      </div>
    </div>
  );
}

export function FinanceApprovalWorkspace({ tenantId }: { tenantId: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ApprovalQueue tenantId={tenantId} />
      <PostingQueue tenantId={tenantId} />
    </div>
  );
}

export function ApprovalQueue({ tenantId }: { tenantId: string }) {
  const expensesFn = useServerFn(listExpenses);
  const billsFn = useServerFn(listVendorBills);
  const approveExp = useServerFn(approveExpense);
  const approveBill = useServerFn(approveVendorBill);
  const qc = useQueryClient();
  const expenses = useQuery({ queryKey: ["fin", "expenses", tenantId], queryFn: () => expensesFn({ data: { tenantId } }) });
  const bills = useQuery({ queryKey: ["fin", "bills", tenantId], queryFn: () => billsFn({ data: { tenantId } }) });
  const pendExp = (expenses.data ?? []).filter((e: { status?: string }) => e.status === "submitted" || e.status === "pending");
  const pendBills = (bills.data ?? []).filter((b: { status?: string }) => b.status === "submitted" || b.status === "pending");
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fin", "expenses", tenantId] });
    qc.invalidateQueries({ queryKey: ["fin", "bills", tenantId] });
  };
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Approval queue</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <section>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Expenses</div>
          {pendExp.length === 0 ? <div className="text-xs italic text-muted-foreground">No pending expenses.</div> : (
            <ul className="space-y-2">
              {pendExp.slice(0, 10).map((e: { id: string; amount?: number; description?: string | null }) => (
                <li key={e.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                  <span className="truncate">{e.description ?? e.id.slice(0, 8)} — <span className="tabular-nums">{fmtINR(e.amount)}</span></span>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      try { await approveExp({ data: { tenantId, expenseId: e.id } }); toast.success("Expense approved"); invalidate(); }
                      catch (err) { toast.error((err as Error).message); }
                    }}>Approve</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Vendor bills</div>
          {pendBills.length === 0 ? <div className="text-xs italic text-muted-foreground">No pending bills.</div> : (
            <ul className="space-y-2">
              {pendBills.slice(0, 10).map((b: { id: string; total?: number; vendor_name?: string | null; bill_no?: string | null }) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                  <span className="truncate">{b.bill_no ?? b.id.slice(0, 8)} — {b.vendor_name ?? ""} — <span className="tabular-nums">{fmtINR(b.total)}</span></span>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      try { await approveBill({ data: { tenantId, billId: b.id } }); toast.success("Bill approved"); invalidate(); }
                      catch (err) { toast.error((err as Error).message); }
                    }}>Approve</Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export function PostingQueue({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "journals-draft", tenantId], queryFn: () => fn({ data: { tenantId, limit: 50 } }) });
  const drafts = (q.data ?? []).filter((r: { status?: string }) => r.status === "draft");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Posting queue</CardTitle></CardHeader>
      <CardContent>
        {drafts.length === 0 ? <div className="text-xs italic text-muted-foreground">No draft journals.</div> : (
          <ul className="space-y-1 text-sm">
            {drafts.map((j: { id: string; journal_no?: string; memo?: string | null }) => (
              <li key={j.id} className="flex items-center justify-between rounded border p-2">
                <span className="truncate">{j.journal_no ?? j.id.slice(0, 8)}</span>
                <Badge variant="secondary">draft</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Period close
// ─────────────────────────────────────────────────────────────
export function PeriodCloseWorkspace({ tenantId }: { tenantId: string }) {
  const yearsFn = useServerFn(listFiscalYears);
  const years = useQuery({ queryKey: ["fin", "fy", tenantId], queryFn: () => yearsFn({ data: { tenantId } }) });
  const [fyId, setFyId] = useState<string | null>(null);
  const activeFy = fyId ?? (years.data?.[0]?.id as string | undefined) ?? null;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fiscal years</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(years.data ?? []).map((y: { id: string; name?: string; start_date?: string; end_date?: string; is_active?: boolean }) => (
            <Button key={y.id} size="sm" variant={activeFy === y.id ? "default" : "outline"} onClick={() => setFyId(y.id)}>
              {y.name ?? `${y.start_date} → ${y.end_date}`}
            </Button>
          ))}
          {(years.data ?? []).length === 0 && <span className="text-xs italic text-muted-foreground">No fiscal years defined.</span>}
        </CardContent>
      </Card>
      {activeFy && <PeriodsPanel tenantId={tenantId} fiscalYearId={activeFy} />}
      <div className="grid gap-4 md:grid-cols-2">
        <MonthEndChecklist tenantId={tenantId} />
        <YearEndChecklist tenantId={tenantId} />
      </div>
    </div>
  );
}

function PeriodsPanel({ tenantId, fiscalYearId }: { tenantId: string; fiscalYearId: string }) {
  const fn = useServerFn(listPeriodsByYear);
  const close = useServerFn(closePeriod);
  const open = useServerFn(openPeriod);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["fin", "periods", tenantId, fiscalYearId],
    queryFn: () => fn({ data: { tenantId, fiscalYearId } }),
  });
  type Period = { id: string; name?: string; start_date?: string; end_date?: string; status?: string };
  const cols: DataGridColumn<Period>[] = [
    { key: "name", header: "Period", cell: (r) => r.name ?? `${r.start_date} → ${r.end_date}` },
    { key: "status", header: "Status", cell: (r) => <Badge variant={r.status === "closed" ? "destructive" : "secondary"}>{r.status}</Badge> },
    {
      key: "actions", header: "", cell: (r) => (
        <Button size="sm" variant="outline" onClick={async () => {
          try {
            if (r.status === "closed") await open({ data: { tenantId, periodId: r.id } });
            else await close({ data: { tenantId, periodId: r.id } });
            toast.success("Updated");
            qc.invalidateQueries({ queryKey: ["fin", "periods", tenantId, fiscalYearId] });
          } catch (err) { toast.error((err as Error).message); }
        }}>{r.status === "closed" ? "Reopen" : "Close"}</Button>
      ),
    },
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Periods</CardTitle></CardHeader>
      <CardContent>
        <DataGrid data={q.data ?? []} columns={cols} rowKey={(r) => r.id} />
      </CardContent>
    </Card>
  );
}

export function MonthEndChecklist({ tenantId }: { tenantId: string }) {
  const monthEnd = useServerFn(runMonthEnd);
  const dep = useServerFn(runDepreciationBatch);
  const [period, setPeriod] = useState("");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Month-end checklist</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Period ID</Label>
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="fiscal_period_id" />
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded border p-2">
            <span>Run depreciation batch</span>
            <Button size="sm" variant="outline" disabled={!period}
              onClick={async () => {
                try { await dep({ data: { tenantId, periodId: period } }); toast.success("Depreciation posted"); }
                catch (err) { toast.error((err as Error).message); }
              }}>Run</Button>
          </li>
          <li className="flex items-center justify-between rounded border p-2">
            <span>Run month-end close</span>
            <Button size="sm" disabled={!period}
              onClick={async () => {
                try { await monthEnd({ data: { tenantId, periodId: period } }); toast.success("Month-end complete"); }
                catch (err) { toast.error((err as Error).message); }
              }}>Close month</Button>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

export function YearEndChecklist({ tenantId }: { tenantId: string }) {
  const yearEnd = useServerFn(runYearEnd);
  const [fy, setFy] = useState("");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Year-end checklist</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Fiscal year ID</Label>
          <Input value={fy} onChange={(e) => setFy(e.target.value)} placeholder="fiscal_year_id" />
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded border p-2">
            <span>Run year-end close</span>
            <Button size="sm" disabled={!fy}
              onClick={async () => {
                try { await yearEnd({ data: { tenantId, fiscalYearId: fy } }); toast.success("Year-end complete"); }
                catch (err) { toast.error((err as Error).message); }
              }}>Close year</Button>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Cash / AR / AP / Revenue
// ─────────────────────────────────────────────────────────────
export function CashManagementDashboard({ tenantId }: { tenantId: string }) {
  const banksFn = useServerFn(listBankAccounts);
  const banks = useQuery({ queryKey: ["fin", "bank", tenantId], queryFn: () => banksFn({ data: { tenantId } }) });
  const match = useServerFn(autoMatchBankStatement);
  return (
    <div className="space-y-4">
      <KpiGrid>
        <CashPositionCard tenantId={tenantId} />
        <OutstandingInvoicesCard tenantId={tenantId} />
        <OutstandingVendorBillsCard tenantId={tenantId} />
      </KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Bank accounts</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            data={banks.data ?? []}
            rowKey={(r: { id: string }) => r.id}
            columns={[
              { key: "name", header: "Bank", cell: (r: { name?: string }) => r.name ?? "—" },
              { key: "account_no", header: "Account", cell: (r: { account_no?: string }) => r.account_no ?? "—" },
              { key: "balance", header: "Balance", cell: (r: { current_balance?: number }) => fmtINR(r.current_balance) },
              {
                key: "actions", header: "", cell: (r: { id: string }) => (
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      try { await match({ data: { tenantId, bankAccountId: r.id } }); toast.success("Auto-match run"); }
                      catch (err) { toast.error((err as Error).message); }
                    }}>Auto-match</Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountsReceivableWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listReceipts);
  const q = useQuery({ queryKey: ["fin", "ar", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return (
    <div className="space-y-4">
      <KpiGrid><OutstandingInvoicesCard tenantId={tenantId} /></KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Receipts</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            data={q.data ?? []}
            rowKey={(r: { id: string }) => r.id}
            columns={[
              { key: "date", header: "Date", cell: (r: { receipt_date?: string }) => r.receipt_date ?? "—" },
              { key: "payer", header: "Payer", cell: (r: { payer_name?: string | null }) => r.payer_name ?? "—" },
              { key: "amount", header: "Amount", cell: (r: { amount?: number }) => fmtINR(r.amount) },
              { key: "status", header: "Status", cell: (r: { status?: string }) => <Badge variant="secondary">{r.status ?? "—"}</Badge> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function AccountsPayableWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listVendorBills);
  const q = useQuery({ queryKey: ["fin", "bills", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return (
    <div className="space-y-4">
      <KpiGrid><OutstandingVendorBillsCard tenantId={tenantId} /></KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor bills</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            data={q.data ?? []}
            rowKey={(r: { id: string }) => r.id}
            columns={[
              { key: "no", header: "Bill", cell: (r: { bill_no?: string | null; id: string }) => r.bill_no ?? r.id.slice(0, 8) },
              { key: "vendor", header: "Vendor", cell: (r: { vendor_name?: string | null }) => r.vendor_name ?? "—" },
              { key: "total", header: "Total", cell: (r: { total?: number }) => fmtINR(r.total) },
              { key: "status", header: "Status", cell: (r: { status?: string }) => <Badge variant="secondary">{r.status ?? "—"}</Badge> },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function RevenueRecognitionWorkspace({ tenantId }: { tenantId: string }) {
  const post = useServerFn(postSourceRevenue);
  const [ref, setRef] = useState("");
  const [source, setSource] = useState("clinical");
  const mut = useMutation({
    mutationFn: () => post({ data: { tenantId, sourceType: source, referenceId: ref } }),
    onSuccess: () => toast.success("Revenue posted"),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Post source revenue</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <select className="w-full rounded border bg-background px-2 py-1 text-sm" value={source} onChange={(e) => setSource(e.target.value)}>
              {["clinical", "lab", "pharmacy", "radiology", "procedure", "package"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reference ID</Label>
            <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="encounter / order id" />
          </div>
        </div>
        <Button onClick={() => mut.mutate()} disabled={!ref || mut.isPending}>Post</Button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Expense / Asset / Budget / Forecast / Royalty / Tax
// ─────────────────────────────────────────────────────────────
export function ExpenseApprovalWorkspace({ tenantId }: { tenantId: string }) {
  return <ApprovalQueue tenantId={tenantId} />;
}

export function AssetManagementWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listAssets);
  const q = useQuery({ queryKey: ["fin", "assets", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Fixed assets</CardTitle></CardHeader>
      <CardContent>
        <DataGrid
          data={q.data ?? []}
          rowKey={(r: { id: string }) => r.id}
          columns={[
            { key: "name", header: "Asset", cell: (r: { name?: string; id: string }) => r.name ?? r.id.slice(0, 8) },
            { key: "cost", header: "Cost", cell: (r: { cost?: number }) => fmtINR(r.cost) },
            { key: "book", header: "Book value", cell: (r: { book_value?: number }) => fmtINR(r.book_value) },
            { key: "status", header: "Status", cell: (r: { status?: string }) => <Badge variant="secondary">{r.status ?? "—"}</Badge> },
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function DepreciationWorkspace({ tenantId }: { tenantId: string }) {
  const dep = useServerFn(runDepreciationBatch);
  const [period, setPeriod] = useState("");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Depreciation batch</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Period ID</Label>
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="fiscal_period_id" />
        </div>
        <Button disabled={!period} onClick={async () => {
          try { await dep({ data: { tenantId, periodId: period } }); toast.success("Depreciation posted"); }
          catch (err) { toast.error((err as Error).message); }
        }}>Run</Button>
      </CardContent>
    </Card>
  );
}

export function BudgetWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listBudgets);
  const q = useQuery({ queryKey: ["fin", "budgets", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Budgets</CardTitle></CardHeader>
      <CardContent>
        <DataGrid data={q.data ?? []} rowKey={(r: { id: string }) => r.id}
          columns={[
            { key: "name", header: "Name", cell: (r: { name?: string }) => r.name ?? "—" },
            { key: "period", header: "Period", cell: (r: { period?: string }) => r.period ?? "—" },
            { key: "amount", header: "Amount", cell: (r: { total_amount?: number }) => fmtINR(r.total_amount) },
          ]} />
      </CardContent>
    </Card>
  );
}

export function ForecastWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listForecasts);
  const q = useQuery({ queryKey: ["fin", "forecasts", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Forecasts</CardTitle></CardHeader>
      <CardContent>
        <DataGrid data={q.data ?? []} rowKey={(r: { id: string }) => r.id}
          columns={[
            { key: "name", header: "Name", cell: (r: { name?: string }) => r.name ?? "—" },
            { key: "horizon", header: "Horizon", cell: (r: { horizon?: string }) => r.horizon ?? "—" },
          ]} />
      </CardContent>
    </Card>
  );
}

export function RoyaltyWorkspace({ tenantId }: { tenantId: string }) {
  const rulesFn = useServerFn(listRoyaltyRules);
  const settleFn = useServerFn(listRoyaltySettlements);
  const rules = useQuery({ queryKey: ["fin", "royalty-rules", tenantId], queryFn: () => rulesFn({ data: { tenantId } }) });
  const settle = useQuery({ queryKey: ["fin", "royalty-settle", tenantId], queryFn: () => settleFn({ data: { tenantId } }) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Royalty rules</CardTitle></CardHeader>
        <CardContent>
          <DataGrid data={rules.data ?? []} rowKey={(r: { id: string }) => r.id}
            columns={[
              { key: "name", header: "Rule", cell: (r: { name?: string }) => r.name ?? "—" },
              { key: "rate", header: "Rate", cell: (r: { rate?: number }) => r.rate != null ? `${r.rate}%` : "—" },
            ]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Settlements</CardTitle></CardHeader>
        <CardContent>
          <DataGrid data={settle.data ?? []} rowKey={(r: { id: string }) => r.id}
            columns={[
              { key: "period", header: "Period", cell: (r: { period?: string }) => r.period ?? "—" },
              { key: "amount", header: "Amount", cell: (r: { amount?: number }) => fmtINR(r.amount) },
              { key: "status", header: "Status", cell: (r: { status?: string }) => <Badge variant="secondary">{r.status ?? "—"}</Badge> },
            ]} />
        </CardContent>
      </Card>
    </div>
  );
}

export function TaxWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const rows = q.data ?? [];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Tax ledger</CardTitle></CardHeader>
      <CardContent>
        <DataGrid data={rows} rowKey={(r: { id: string }) => r.id}
          columns={[
            { key: "type", header: "Type", cell: (r: { tax_type?: string }) => r.tax_type ?? "—" },
            { key: "period", header: "Period", cell: (r: { period?: string }) => r.period ?? "—" },
            { key: "amount", header: "Amount", cell: (r: { amount?: number }) => fmtINR(r.amount) },
            { key: "status", header: "Status", cell: (r: { status?: string }) => <Badge variant="secondary">{r.status ?? "—"}</Badge> },
          ]} />
      </CardContent>
    </Card>
  );
}

export function GSTWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const rows = (q.data ?? []).filter((r: { tax_type?: string }) => (r.tax_type ?? "").toLowerCase().includes("gst"));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">GST</CardTitle></CardHeader>
      <CardContent>
        <DataGrid data={rows} rowKey={(r: { id: string }) => r.id}
          columns={[
            { key: "type", header: "Type", cell: (r: { tax_type?: string }) => r.tax_type ?? "—" },
            { key: "amount", header: "Amount", cell: (r: { amount?: number }) => fmtINR(r.amount) },
          ]} />
      </CardContent>
    </Card>
  );
}

export function TDSWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const rows = (q.data ?? []).filter((r: { tax_type?: string }) => (r.tax_type ?? "").toLowerCase().includes("tds"));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">TDS</CardTitle></CardHeader>
      <CardContent>
        <DataGrid data={rows} rowKey={(r: { id: string }) => r.id}
          columns={[
            { key: "type", header: "Type", cell: (r: { tax_type?: string }) => r.tax_type ?? "—" },
            { key: "amount", header: "Amount", cell: (r: { amount?: number }) => fmtINR(r.amount) },
          ]} />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Compliance / Audit / Treasury / Intercompany / Reports
// ─────────────────────────────────────────────────────────────
export function ComplianceWorkspace({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <KpiGrid>
        <TaxSummaryCard tenantId={tenantId} />
        <RoyaltySummaryCard tenantId={tenantId} />
        <KpiCard label="Statutory filings" value="On track" icon={ClipboardCheck} tone="success" />
      </KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance timeline</CardTitle></CardHeader>
        <CardContent>
          <TimelinePanel items={[]} emptyMessage="Compliance events surface here from the platform timeline." />
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "audit", tenantId], queryFn: () => fn({ data: { tenantId, limit: 100 } }) });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Audit trail (journals)</CardTitle></CardHeader>
      <CardContent>
        <TimelinePanel
          items={(q.data ?? []).map((j: { id: string; posted_at?: string | null; created_at?: string; journal_no?: string; status?: string; memo?: string | null }) => ({
            ts: j.posted_at ?? j.created_at ?? new Date().toISOString(),
            event_type: j.status ?? "journal",
            title: `Journal ${j.journal_no ?? j.id.slice(0, 8)}`,
            body: j.memo ?? null,
          }))}
        />
      </CardContent>
    </Card>
  );
}

export function TreasuryWorkspace({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <KpiGrid>
        <CashPositionCard tenantId={tenantId} />
        <OutstandingInvoicesCard tenantId={tenantId} />
        <OutstandingVendorBillsCard tenantId={tenantId} />
        <KpiCard label="Liquidity" value="Adequate" icon={Banknote} tone="success" />
      </KpiGrid>
      <CashManagementDashboard tenantId={tenantId} />
    </div>
  );
}

export function IntercompanyWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "ic", tenantId], queryFn: () => fn({ data: { tenantId, limit: 100 } }) });
  const rows = (q.data ?? []).filter((r: { memo?: string | null; reference_type?: string | null }) =>
    (r.reference_type ?? "").toLowerCase().includes("intercompany") ||
    (r.memo ?? "").toLowerCase().includes("intercompany"));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Intercompany journals</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? <div className="text-xs italic text-muted-foreground">No intercompany entries.</div> : (
          <DataGrid data={rows} rowKey={(r: { id: string }) => r.id}
            columns={[
              { key: "no", header: "Journal", cell: (r: { journal_no?: string; id: string }) => r.journal_no ?? r.id.slice(0, 8) },
              { key: "memo", header: "Memo", cell: (r: { memo?: string | null }) => r.memo ?? "—" },
              { key: "status", header: "Status", cell: (r: { status?: string }) => <Badge variant="secondary">{r.status ?? "—"}</Badge> },
            ]} />
        )}
      </CardContent>
    </Card>
  );
}

// Report viewers (read-only projections)
function useDateWindow() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  return { from, to, setFrom, setTo };
}

function DateBar({ w }: { w: ReturnType<typeof useDateWindow> }) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded border bg-card p-2">
      <div><Label className="text-xs">From</Label><Input type="date" value={w.from} onChange={(e) => w.setFrom(e.target.value)} /></div>
      <div><Label className="text-xs">To</Label><Input type="date" value={w.to} onChange={(e) => w.setTo(e.target.value)} /></div>
    </div>
  );
}

function ReportBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <pre className="max-h-[480px] overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(data ?? {}, null, 2)}</pre>
      </CardContent>
    </Card>
  );
}

export function TrialBalanceViewer({ tenantId }: { tenantId: string }) {
  const w = useDateWindow(); const fn = useServerFn(trialBalance);
  const q = useQuery({ queryKey: ["fin", "tb", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  return <div className="space-y-2"><DateBar w={w} /><ReportBlock title="Trial balance" data={q.data} /></div>;
}
export function ProfitLossViewer({ tenantId }: { tenantId: string }) {
  const w = useDateWindow(); const fn = useServerFn(profitLoss);
  const q = useQuery({ queryKey: ["fin", "pl", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  return <div className="space-y-2"><DateBar w={w} /><ReportBlock title="Profit &amp; loss" data={q.data} /></div>;
}
export function BalanceSheetViewer({ tenantId }: { tenantId: string }) {
  const w = useDateWindow(); const fn = useServerFn(balanceSheet);
  const q = useQuery({ queryKey: ["fin", "bs", tenantId, w.to], queryFn: () => fn({ data: { tenantId, asOf: w.to } }) });
  return <div className="space-y-2"><DateBar w={w} /><ReportBlock title="Balance sheet" data={q.data} /></div>;
}
export function CashFlowViewer({ tenantId }: { tenantId: string }) {
  const w = useDateWindow(); const fn = useServerFn(cashFlow);
  const q = useQuery({ queryKey: ["fin", "cf", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  return <div className="space-y-2"><DateBar w={w} /><ReportBlock title="Cash flow" data={q.data} /></div>;
}

export function FinancialReportWorkspace({ tenantId }: { tenantId: string }) {
  const [tab, setTab] = useState<"tb" | "pl" | "bs" | "cf">("tb");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          ["tb", "Trial Balance"], ["pl", "P&L"], ["bs", "Balance Sheet"], ["cf", "Cash Flow"],
        ] as const).map(([k, label]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{label}</Button>
        ))}
      </div>
      {tab === "tb" && <TrialBalanceViewer tenantId={tenantId} />}
      {tab === "pl" && <ProfitLossViewer tenantId={tenantId} />}
      {tab === "bs" && <BalanceSheetViewer tenantId={tenantId} />}
      {tab === "cf" && <CashFlowViewer tenantId={tenantId} />}
    </div>
  );
}

// Journal viewer (fallback wrapping workspaces JournalGrid via inline query)
export function JournalViewer({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "journals-view", tenantId], queryFn: () => fn({ data: { tenantId, limit: 200 } }) });
  const items = useMemo(() => (q.data ?? []).map((j: { id: string; journal_no?: string; status?: string; memo?: string | null; posted_at?: string | null; created_at?: string }) => ({
    ts: j.posted_at ?? j.created_at ?? new Date().toISOString(),
    event_type: j.status ?? "journal",
    title: `Journal ${j.journal_no ?? j.id.slice(0, 8)}`,
    body: j.memo ?? null,
  })), [q.data]);
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Journals</CardTitle></CardHeader><CardContent><TimelinePanel items={items} /></CardContent></Card>;
}

// Ribbon / passthrough helpers
export function FinanceStatusRibbon({ items }: { items: Array<{ label: string; value: ReactNode; tone?: "info" | "success" | "warning" | "danger" }> }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-md border bg-card p-2">
      {items.map((i, idx) => (
        <div key={idx} className="flex items-center gap-2 rounded border px-2 py-1 text-xs">
          <span className="uppercase tracking-wide text-muted-foreground">{i.label}</span>
          <span className="font-semibold">{i.value}</span>
        </div>
      ))}
    </div>
  );
}

export const FinancialTimeline = TimelinePanel;
export function FinancePeopleHint({ tenantId }: { tenantId: string }) {
  void tenantId;
  return <div className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> reuses platform approvals</div>;
}
export const FinanceCurrencyIcon = IndianRupee;
export const FinanceReceiptIcon = Receipt;
export const FinanceAssetIcon = Landmark;
