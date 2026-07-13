import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, Banknote, Receipt, Building2, Landmark, TrendingUp,
  ShieldCheck, ClipboardCheck, CircleDollarSign, FileBarChart, Scale, IndianRupee,
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
import { listReceipts, listBankAccounts } from "@/lib/finance/cash.functions";
import { listExpenses, approveExpense } from "@/lib/finance/expenses.functions";
import { listVendorBills, approveVendorBill } from "@/lib/finance/vendor.functions";
import { listBudgets } from "@/lib/finance/budget.functions";
import { listForecasts } from "@/lib/finance/forecast.functions";
import { listRoyaltySettlements } from "@/lib/finance/royalty.functions";
import { listTaxes } from "@/lib/finance/tax.functions";
import {
  runMonthEnd, runYearEnd, runDepreciationBatch, autoMatchBankStatement, postSourceRevenue,
} from "@/lib/finance/automation.functions";
import { trialBalance, profitLoss, balanceSheet, cashFlow } from "@/lib/finance/reports.functions";

import {
  BankReconciliationWorkspace as _BankRecon,
  ExpenseWorkspace as _ExpenseWs,
  AssetWorkspace as _AssetWs,
  DepreciationPanel as _DepPanel,
  BudgetWorkspace as _BudgetWs,
  ForecastWorkspace as _ForecastWs,
  RoyaltyDashboard as _RoyaltyDash,
  TaxDashboard as _TaxDash,
  TrialBalanceViewer as _TB,
  ProfitLossViewer as _PL,
  BalanceSheetViewer as _BS,
  CashFlowViewer as _CF,
  FiscalPeriodsPanel as _Periods,
} from "./workspaces";

type Row = Record<string, unknown>;
const rows = (d: unknown): Row[] => (((d as { rows?: Row[] } | undefined)?.rows) ?? []);
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (v == null ? 0 : Number(v));
const fmtINR = (n: unknown) => `₹${num(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Re-export reused workspaces so route files can import them from operations
export {
  _BankRecon as BankReconciliationWorkspace,
  _ExpenseWs as ExpenseApprovalWorkspace,
  _AssetWs as AssetManagementWorkspace,
  _DepPanel as DepreciationWorkspace,
  _BudgetWs as BudgetWorkspace,
  _ForecastWs as ForecastWorkspace,
  _RoyaltyDash as RoyaltyWorkspace,
  _TaxDash as TaxWorkspace,
  _TB as TrialBalanceViewer,
  _PL as ProfitLossViewer,
  _BS as BalanceSheetViewer,
  _CF as CashFlowViewer,
};

// ─────────────────────────── KPI cards ───────────────────────────
export function CashPositionCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listBankAccounts);
  const q = useQuery({ queryKey: ["fin", "bank", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const list = rows(q.data);
  const balance = list.reduce((s, r) => s + num(r.current_balance), 0);
  return <KpiCard label="Cash position" value={fmtINR(balance)} icon={Wallet} tone="info" hint={`${list.length} bank accounts`} />;
}
export function OutstandingInvoicesCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listReceipts);
  const q = useQuery({ queryKey: ["fin", "ar", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const total = rows(q.data).reduce((s, r) => s + num(r.amount), 0);
  return <KpiCard label="Receipts (recent)" value={fmtINR(total)} icon={CircleDollarSign} tone="success" />;
}
export function OutstandingVendorBillsCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listVendorBills);
  const q = useQuery({ queryKey: ["fin", "ap", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const open = rows(q.data).filter((r) => str(r.status) !== "paid" && str(r.status) !== "voided");
  const total = open.reduce((s, r) => s + num(r.balance_amount ?? r.total_amount ?? r.total), 0);
  return <KpiCard label="Open vendor bills" value={fmtINR(total)} icon={Building2} tone="warning" hint={`${open.length} pending`} />;
}
export function RoyaltySummaryCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listRoyaltySettlements);
  const q = useQuery({ queryKey: ["fin", "royalty", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const total = rows(q.data).reduce((s, r) => s + num(r.net_amount ?? r.gross_amount ?? r.amount), 0);
  return <KpiCard label="Royalty settled" value={fmtINR(total)} icon={Scale} />;
}
export function TaxSummaryCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const list = rows(q.data);
  const total = list.reduce((s, r) => s + num(r.cgst) + num(r.sgst) + num(r.igst) + num(r.cess) + num(r.amount), 0);
  return <KpiCard label="Tax ledger" value={fmtINR(total)} icon={ShieldCheck} hint={`${list.length} entries`} />;
}
export function BudgetVarianceCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listBudgets);
  const q = useQuery({ queryKey: ["fin", "budgets", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return <KpiCard label="Active budgets" value={rows(q.data).length} icon={TrendingUp} />;
}
export function ForecastVarianceCard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listForecasts);
  const q = useQuery({ queryKey: ["fin", "forecasts", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  return <KpiCard label="Forecasts" value={rows(q.data).length} icon={FileBarChart} />;
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

// ─────────────────────────── Executive / Operations ───────────────────────────
export function FinanceExecutiveDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "journals-exec", tenantId], queryFn: () => fn({ data: { tenantId, limit: 20 } }) });
  return (
    <div className="space-y-4">
      <FinancialHealthCards tenantId={tenantId} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recent journal activity</CardTitle></CardHeader>
          <CardContent>
            <TimelinePanel
              items={rows(q.data).slice(0, 10).map((j) => ({
                ts: str(j.posted_at ?? j.entry_date ?? j.created_at) || new Date().toISOString(),
                event_type: str(j.status) || "journal",
                title: `Journal ${str(j.entry_number ?? j.journal_no ?? j.id).slice(0, 12)}`,
                body: str(j.description ?? j.memo) || null,
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
  const pendExp = rows(expenses.data).filter((e) => ["submitted", "pending", "pending_approval"].includes(str(e.status)));
  const pendBills = rows(bills.data).filter((b) => ["submitted", "pending", "pending_approval"].includes(str(b.status)));
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
              {pendExp.slice(0, 10).map((e) => (
                <li key={str(e.id)} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                  <span className="truncate">{str(e.description) || str(e.id).slice(0, 8)} — <span className="tabular-nums">{fmtINR(e.amount)}</span></span>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      try { await approveExp({ data: { tenantId, expenseId: str(e.id) } }); toast.success("Expense approved"); invalidate(); }
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
              {pendBills.slice(0, 10).map((b) => (
                <li key={str(b.id)} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                  <span className="truncate">{str(b.bill_number ?? b.bill_no ?? b.id).slice(0, 20)} — {str(b.vendor_name ?? "")} — <span className="tabular-nums">{fmtINR(b.total_amount ?? b.total)}</span></span>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      try { await approveBill({ data: { tenantId, billId: str(b.id) } }); toast.success("Bill approved"); invalidate(); }
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
  const drafts = rows(q.data).filter((r) => str(r.status) === "draft");
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Posting queue</CardTitle></CardHeader>
      <CardContent>
        {drafts.length === 0 ? <div className="text-xs italic text-muted-foreground">No draft journals.</div> : (
          <ul className="space-y-1 text-sm">
            {drafts.map((j) => (
              <li key={str(j.id)} className="flex items-center justify-between rounded border p-2">
                <span className="truncate">{str(j.entry_number ?? j.journal_no ?? j.id).slice(0, 20)}</span>
                <Badge variant="secondary">draft</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Period close ───────────────────────────
export function PeriodCloseWorkspace({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <_Periods tenantId={tenantId} />
      <div className="grid gap-4 md:grid-cols-2">
        <MonthEndChecklist tenantId={tenantId} />
        <YearEndChecklist tenantId={tenantId} />
      </div>
    </div>
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

// ─────────────────────────── Cash / AR / AP / Revenue ───────────────────────────
export function CashManagementDashboard({ tenantId }: { tenantId: string }) {
  const banksFn = useServerFn(listBankAccounts);
  const banks = useQuery({ queryKey: ["fin", "bank", tenantId], queryFn: () => banksFn({ data: { tenantId } }) });
  const match = useServerFn(autoMatchBankStatement);
  const cols: DataGridColumn<Row>[] = [
    { id: "name", header: "Bank", cell: (r) => str(r.bank_name ?? r.name) || "—" },
    { id: "acc", header: "Account", cell: (r) => str(r.account_number ?? r.account_no) || "—" },
    { id: "bal", header: "Balance", cell: (r) => fmtINR(r.current_balance) },
    {
      id: "act", header: "", cell: (r) => (
        <Button size="sm" variant="outline"
          onClick={async () => {
            try { await match({ data: { tenantId, bankAccountId: str(r.id) } }); toast.success("Auto-match run"); }
            catch (err) { toast.error((err as Error).message); }
          }}>Auto-match</Button>
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <KpiGrid>
        <CashPositionCard tenantId={tenantId} />
        <OutstandingInvoicesCard tenantId={tenantId} />
        <OutstandingVendorBillsCard tenantId={tenantId} />
      </KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Bank accounts</CardTitle></CardHeader>
        <CardContent><DataGrid rows={rows(banks.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={banks.isLoading} /></CardContent>
      </Card>
    </div>
  );
}

export function AccountsReceivableWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listReceipts);
  const q = useQuery({ queryKey: ["fin", "ar", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "date", header: "Date", cell: (r) => str(r.receipt_date ?? r.entry_date) || "—" },
    { id: "payer", header: "Payer", cell: (r) => str(r.payer_name) || "—" },
    { id: "amt", header: "Amount", cell: (r) => fmtINR(r.amount) },
    { id: "st", header: "Status", cell: (r) => <Badge variant="secondary">{str(r.status) || "—"}</Badge> },
  ];
  return (
    <div className="space-y-4">
      <KpiGrid><OutstandingInvoicesCard tenantId={tenantId} /></KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Receipts</CardTitle></CardHeader>
        <CardContent><DataGrid rows={rows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} /></CardContent>
      </Card>
    </div>
  );
}

export function AccountsPayableWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listVendorBills);
  const q = useQuery({ queryKey: ["fin", "bills", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "Bill", cell: (r) => str(r.bill_number ?? r.bill_no ?? r.id).slice(0, 20) },
    { id: "vendor", header: "Vendor", cell: (r) => str(r.vendor_name) || "—" },
    { id: "total", header: "Total", cell: (r) => fmtINR(r.total_amount ?? r.total) },
    { id: "bal", header: "Balance", cell: (r) => fmtINR(r.balance_amount) },
    { id: "st", header: "Status", cell: (r) => <Badge variant="secondary">{str(r.status) || "—"}</Badge> },
  ];
  return (
    <div className="space-y-4">
      <KpiGrid><OutstandingVendorBillsCard tenantId={tenantId} /></KpiGrid>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Vendor bills</CardTitle></CardHeader>
        <CardContent><DataGrid rows={rows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} /></CardContent>
      </Card>
    </div>
  );
}

export function RevenueRecognitionWorkspace({ tenantId }: { tenantId: string }) {
  const post = useServerFn(postSourceRevenue);
  const [ref, setRef] = useState("");
  const [source, setSource] = useState("clinical");
  const mut = useMutation({
    mutationFn: () => post({ data: { tenantId, sourceType: source, referenceId: ref } as never }),
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

// ─────────────────────────── GST / TDS ───────────────────────────
export function GSTWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const list = rows(q.data).filter((r) => str(r.tax_type ?? r.type ?? "").toLowerCase().includes("gst"));
  const cols: DataGridColumn<Row>[] = [
    { id: "d", header: "Date", cell: (r) => str(r.entry_date) || "—" },
    { id: "t", header: "Type", cell: (r) => str(r.tax_type ?? r.type) || "—" },
    { id: "cgst", header: "CGST", cell: (r) => fmtINR(r.cgst) },
    { id: "sgst", header: "SGST", cell: (r) => fmtINR(r.sgst) },
    { id: "igst", header: "IGST", cell: (r) => fmtINR(r.igst) },
    { id: "cess", header: "Cess", cell: (r) => fmtINR(r.cess) },
  ];
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">GST ledger</CardTitle></CardHeader><CardContent><DataGrid rows={list} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} /></CardContent></Card>;
}

export function TDSWorkspace({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const q = useQuery({ queryKey: ["fin", "tax", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const list = rows(q.data).filter((r) => str(r.tax_type ?? r.type ?? "").toLowerCase().includes("tds"));
  const cols: DataGridColumn<Row>[] = [
    { id: "d", header: "Date", cell: (r) => str(r.entry_date) || "—" },
    { id: "t", header: "Type", cell: (r) => str(r.tax_type ?? r.type) || "—" },
    { id: "amt", header: "Amount", cell: (r) => fmtINR(r.amount) },
  ];
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">TDS ledger</CardTitle></CardHeader><CardContent><DataGrid rows={list} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} /></CardContent></Card>;
}

// ─────────────────────────── Compliance / Audit / Treasury / IC ───────────────────────────
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
          items={rows(q.data).map((j) => ({
            ts: str(j.posted_at ?? j.entry_date ?? j.created_at) || new Date().toISOString(),
            event_type: str(j.status) || "journal",
            title: `Journal ${str(j.entry_number ?? j.journal_no ?? j.id).slice(0, 20)}`,
            body: str(j.description ?? j.memo) || null,
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
  const list = rows(q.data).filter((r) =>
    str(r.reference_type).toLowerCase().includes("intercompany") ||
    str(r.description ?? r.memo).toLowerCase().includes("intercompany"));
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "Journal", cell: (r) => str(r.entry_number ?? r.journal_no ?? r.id).slice(0, 20) },
    { id: "memo", header: "Memo", cell: (r) => str(r.description ?? r.memo) || "—" },
    { id: "st", header: "Status", cell: (r) => <Badge variant="secondary">{str(r.status) || "—"}</Badge> },
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Intercompany journals</CardTitle></CardHeader>
      <CardContent>
        {list.length === 0 ? <div className="text-xs italic text-muted-foreground">No intercompany entries.</div>
          : <DataGrid rows={list} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Reports ───────────────────────────
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

export function FinancialReportWorkspace({ tenantId }: { tenantId: string }) {
  const w = useDateWindow();
  const tb = useServerFn(trialBalance);
  const pl = useServerFn(profitLoss);
  const bs = useServerFn(balanceSheet);
  const cf = useServerFn(cashFlow);
  const [tab, setTab] = useState<"tb" | "pl" | "bs" | "cf">("tb");
  const qTb = useQuery({ queryKey: ["fin", "tb", tenantId, w.from, w.to], queryFn: () => tb({ data: { tenantId, from: w.from, to: w.to } as never }), enabled: tab === "tb" });
  const qPl = useQuery({ queryKey: ["fin", "pl", tenantId, w.from, w.to], queryFn: () => pl({ data: { tenantId, from: w.from, to: w.to } as never }), enabled: tab === "pl" });
  const qBs = useQuery({ queryKey: ["fin", "bs", tenantId, w.to], queryFn: () => bs({ data: { tenantId, asOf: w.to } as never }), enabled: tab === "bs" });
  const qCf = useQuery({ queryKey: ["fin", "cf", tenantId, w.from, w.to], queryFn: () => cf({ data: { tenantId, from: w.from, to: w.to } as never }), enabled: tab === "cf" });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          ["tb", "Trial Balance"], ["pl", "P&L"], ["bs", "Balance Sheet"], ["cf", "Cash Flow"],
        ] as const).map(([k, label]) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>{label}</Button>
        ))}
      </div>
      <DateBar w={w} />
      {tab === "tb" && <ReportBlock title="Trial balance" data={qTb.data} />}
      {tab === "pl" && <ReportBlock title="Profit & loss" data={qPl.data} />}
      {tab === "bs" && <ReportBlock title="Balance sheet" data={qBs.data} />}
      {tab === "cf" && <ReportBlock title="Cash flow" data={qCf.data} />}
    </div>
  );
}

export function JournalViewer({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "journals-view", tenantId], queryFn: () => fn({ data: { tenantId, limit: 200 } }) });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Journals</CardTitle></CardHeader>
      <CardContent>
        <TimelinePanel
          items={rows(q.data).map((j) => ({
            ts: str(j.posted_at ?? j.entry_date ?? j.created_at) || new Date().toISOString(),
            event_type: str(j.status) || "journal",
            title: `Journal ${str(j.entry_number ?? j.journal_no ?? j.id).slice(0, 20)}`,
            body: str(j.description ?? j.memo) || null,
          }))}
        />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── Ribbon / misc ───────────────────────────
export function FinanceStatusRibbon({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
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
export const FinanceCurrencyIcon = IndianRupee;
export const FinanceReceiptIcon = Receipt;
export const FinanceAssetIcon = Landmark;
