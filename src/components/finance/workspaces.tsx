/**
 * Finance workspaces — Phase 2.9 Stage 3 UI.
 * All data flows through Stage 2 server functions via useServerFn.
 * NO direct Supabase queries and NO client-side accounting logic.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { listAccounts, upsertAccount, listFiscalYears, listPeriodsByYear, openPeriod, closePeriod } from "@/lib/finance/chart.functions";
import { listJournalEntries, getJournal, createJournal, postJournal, reverseJournal, voidJournal } from "@/lib/finance/journal.functions";
import {
  recordReceipt, recordPayment, recordPettyCash, reconcileBank,
  listReceipts, listPayments, listPettyCash, listBankAccounts, listCashBooks,
} from "@/lib/finance/cash.functions";
import { recordExpense, approveExpense, listExpenses } from "@/lib/finance/expenses.functions";
import { registerAsset, postDepreciation, disposeAsset, listAssets, listDepreciationSchedule } from "@/lib/finance/assets.functions";
import { createBudget, updateBudget, listBudgets, getBudget } from "@/lib/finance/budget.functions";
import { createForecast, listForecasts } from "@/lib/finance/forecast.functions";
import { upsertRoyaltyRule, calculateRoyalty, settleRoyalty, listRoyaltyRules, listRoyaltySettlements } from "@/lib/finance/royalty.functions";
import { createVendorBill, approveVendorBill, recordVendorPayment, listVendorBills, getVendorBill } from "@/lib/finance/vendor.functions";
import { postTax, listTaxes } from "@/lib/finance/tax.functions";
import { trialBalance, profitLoss, balanceSheet, cashFlow } from "@/lib/finance/reports.functions";

import { DataGrid, type DataGridColumn } from "@/components/standards/data-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

import {
  FinanceFilterBar, FinanceActionBar, FinanceDashboardCards, FinanceSummaryBar,
  FinanceStatusBar, JournalStatusBadge,
} from "./shell";

type Row = Record<string, unknown>;
const asRows = (d: unknown) => (((d as { rows?: Row[] } | undefined)?.rows) ?? []) as Row[];
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (v == null ? 0 : Number(v));
const money = (v: unknown) => `₹${num(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function todayIso() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

/* ============================================================ Overview ============================================================ */
export function FinanceOverview({ tenantId }: { tenantId: string }) {
  const accountsFn = useServerFn(listAccounts);
  const journalsFn = useServerFn(listJournalEntries);
  const billsFn = useServerFn(listVendorBills);
  const expensesFn = useServerFn(listExpenses);
  const assetsFn = useServerFn(listAssets);
  const budgetsFn = useServerFn(listBudgets);
  const cfFn = useServerFn(cashFlow);

  const from = firstOfMonth();
  const to = todayIso();

  const accounts = useQuery({ queryKey: ["fin", "accounts", tenantId], queryFn: () => accountsFn({ data: { tenantId, limit: 500 } }) });
  const journals = useQuery({ queryKey: ["fin", "journals", tenantId, from, to], queryFn: () => journalsFn({ data: { tenantId, from, to, limit: 200 } }) });
  const bills = useQuery({ queryKey: ["fin", "bills-open", tenantId], queryFn: () => billsFn({ data: { tenantId, status: "approved", limit: 200 } }) });
  const expenses = useQuery({ queryKey: ["fin", "expenses-pending", tenantId], queryFn: () => expensesFn({ data: { tenantId, status: "submitted" } }) });
  const assets = useQuery({ queryKey: ["fin", "assets", tenantId], queryFn: () => assetsFn({ data: { tenantId, limit: 500 } }) });
  const budgets = useQuery({ queryKey: ["fin", "budgets", tenantId], queryFn: () => budgetsFn({ data: { tenantId } }) });
  const cf = useQuery({ queryKey: ["fin", "cash-flow-overview", tenantId, from, to], queryFn: () => cfFn({ data: { tenantId, from, to } }) });

  const cashInflow = (cf.data as { inflow?: number } | undefined)?.inflow;
  const cashOutflow = (cf.data as { outflow?: number } | undefined)?.outflow;

  return (
    <div className="space-y-4">
      <FinanceDashboardCards
        accounts={asRows(accounts.data).length}
        journals={asRows(journals.data).length}
        cashInflow={cashInflow}
        cashOutflow={cashOutflow}
        openBills={asRows(bills.data).length}
        openExpenses={asRows(expenses.data).length}
        assets={asRows(assets.data).length}
        budgets={asRows(budgets.data).length}
      />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent journals</CardTitle></CardHeader>
        <CardContent>
          <JournalGrid tenantId={tenantId} limit={20} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ============================================================ Accounts ============================================================ */
export function AccountsGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listAccounts);
  const [search, setSearch] = useState("");
  const q = useQuery({ queryKey: ["fin", "accounts", tenantId, search], queryFn: () => fn({ data: { tenantId, search: search || undefined, limit: 500 } }) });
  const rows = asRows(q.data);
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const cols: DataGridColumn<Row>[] = [
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
    { id: "name", header: "Name", cell: (r) => str(r.name) },
    { id: "type", header: "Type", cell: (r) => str(r.account_type) },
    { id: "subtype", header: "Subtype", cell: (r) => str(r.account_subtype) || "—" },
    { id: "curr", header: "Currency", cell: (r) => str(r.currency) },
    { id: "active", header: "Active", cell: (r) => (r.is_active ? "Yes" : "No") },
  ];
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input placeholder="Search accounts…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="ml-auto flex gap-2">
          <Button onClick={() => { setEditing(null); setOpen(true); }}>New Account</Button>
        </div>
      </FinanceFilterBar>
      <DataGrid rows={rows} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} onRowClick={(r) => { setEditing(r); setOpen(true); }} />
      <AccountEditorDrawer tenantId={tenantId} open={open} onOpenChange={setOpen} account={editing} />
    </div>
  );
}

export function AccountEditorDrawer({
  tenantId, open, onOpenChange, account,
}: { tenantId: string; open: boolean; onOpenChange: (v: boolean) => void; account: Row | null }) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertAccount);
  const [form, setForm] = useState<Record<string, string>>({});
  const initial = useMemo(() => ({
    code: str(account?.code),
    name: str(account?.name),
    accountType: str(account?.account_type) || "asset",
    accountSubtype: str(account?.account_subtype),
    currency: str(account?.currency) || "INR",
  }), [account]);
  const cur = { ...initial, ...form };
  const mut = useMutation({
    mutationFn: async () => upsert({
      data: {
        tenantId,
        id: account?.id ? str(account.id) : undefined,
        code: cur.code,
        name: cur.name,
        accountType: cur.accountType as "asset" | "liability" | "equity" | "income" | "expense",
        accountSubtype: cur.accountSubtype || null,
        currency: cur.currency,
      },
    }),
    onSuccess: () => {
      toast.success("Account saved");
      qc.invalidateQueries({ queryKey: ["fin", "accounts", tenantId] });
      onOpenChange(false); setForm({});
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader><SheetTitle>{account ? "Edit account" : "New account"}</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <div><Label>Code</Label><Input value={cur.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><Label>Name</Label><Input value={cur.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={cur.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["asset", "liability", "equity", "income", "expense"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subtype</Label><Input value={cur.accountSubtype} onChange={(e) => setForm({ ...form, accountSubtype: e.target.value })} /></div>
          <div><Label>Currency</Label><Input value={cur.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================ Journals ============================================================ */
export function JournalGrid({ tenantId, limit = 100 }: { tenantId: string; limit?: number }) {
  const fn = useServerFn(listJournalEntries);
  const q = useQuery({ queryKey: ["fin", "journals", tenantId, limit], queryFn: () => fn({ data: { tenantId, limit } }) });
  const rows = asRows(q.data);
  const cols: DataGridColumn<Row>[] = [
    { id: "number", header: "No.", cell: (r) => <span className="font-mono">{str(r.entry_number)}</span> },
    { id: "date", header: "Date", cell: (r) => str(r.entry_date) },
    { id: "src", header: "Source", cell: (r) => str(r.source_module) },
    { id: "desc", header: "Description", cell: (r) => str(r.description) || "—" },
    { id: "status", header: "Status", cell: (r) => <JournalStatusBadge status={str(r.status)} /> },
    { id: "amount", header: "Amount", cell: (r) => money(r.total_debit) },
    { id: "open", header: "", cell: (r) => (
      <Link to="/finance/journal/$id" params={{ id: str(r.id) }} className="text-primary text-xs underline">Open</Link>
    ) },
  ];
  return <DataGrid rows={rows} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function JournalWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createJournal);
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(todayIso());
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<Array<{ accountId: string; debit: number; credit: number; description?: string }>>([
    { accountId: "", debit: 0, credit: 0 },
    { accountId: "", debit: 0, credit: 0 },
  ]);

  const totalD = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalC = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = totalD === totalC && totalD > 0;

  const mut = useMutation({
    mutationFn: async () => createFn({
      data: {
        tenantId, entryDate, description: desc || null, sourceModule: "manual", currency: "INR", fxRate: 1,
        lines: lines.map((l, i) => ({
          accountId: l.accountId, lineNumber: i + 1,
          debit: Number(l.debit || 0), credit: Number(l.credit || 0),
          description: l.description ?? null,
        })),
      },
    }),
    onSuccess: () => {
      toast.success("Journal created");
      qc.invalidateQueries({ queryKey: ["fin", "journals", tenantId] });
      setOpen(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-3">
      <FinanceActionBar>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>New journal</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create journal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} /></div>
                <div><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
              </div>
              <JournalLinesEditor lines={lines} onChange={setLines} />
              <FinanceSummaryBar items={[
                { label: "Debit", value: money(totalD) },
                { label: "Credit", value: money(totalC) },
                { label: "Balanced", value: balanced ? "Yes" : "No" },
              ]} />
            </div>
            <DialogFooter>
              <Button disabled={!balanced || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Create"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </FinanceActionBar>
      <JournalGrid tenantId={tenantId} />
    </div>
  );
}

export function JournalLinesEditor({
  lines, onChange,
}: {
  lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
  onChange: (l: Array<{ accountId: string; debit: number; credit: number; description?: string }>) => void;
}) {
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-2 items-end">
          <div><Label className="text-xs">Account ID</Label><Input value={l.accountId} onChange={(e) => { const c = [...lines]; c[i] = { ...l, accountId: e.target.value }; onChange(c); }} placeholder="uuid" /></div>
          <div><Label className="text-xs">Debit</Label><Input type="number" value={l.debit} onChange={(e) => { const c = [...lines]; c[i] = { ...l, debit: Number(e.target.value) }; onChange(c); }} /></div>
          <div><Label className="text-xs">Credit</Label><Input type="number" value={l.credit} onChange={(e) => { const c = [...lines]; c[i] = { ...l, credit: Number(e.target.value) }; onChange(c); }} /></div>
          <div><Label className="text-xs">Note</Label><Input value={l.description ?? ""} onChange={(e) => { const c = [...lines]; c[i] = { ...l, description: e.target.value }; onChange(c); }} /></div>
          <Button variant="ghost" size="sm" onClick={() => onChange(lines.filter((_, j) => j !== i))}>×</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...lines, { accountId: "", debit: 0, credit: 0 }])}>Add line</Button>
    </div>
  );
}

export function JournalLinesGrid({ lines }: { lines: Row[] }) {
  const cols: DataGridColumn<Row>[] = [
    { id: "n", header: "#", cell: (r) => str(r.line_number) },
    { id: "acc", header: "Account", cell: (r) => <span className="font-mono">{str(r.account_id).slice(0, 8)}</span> },
    { id: "desc", header: "Description", cell: (r) => str(r.description) || "—" },
    { id: "d", header: "Debit", cell: (r) => money(r.debit) },
    { id: "c", header: "Credit", cell: (r) => money(r.credit) },
  ];
  return <DataGrid rows={lines} columns={cols} getRowId={(r) => str(r.id)} />;
}

export function JournalViewer({ tenantId, journalId }: { tenantId: string; journalId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(getJournal);
  const postFn = useServerFn(postJournal);
  const revFn = useServerFn(reverseJournal);
  const voidFn = useServerFn(voidJournal);
  const q = useQuery({ queryKey: ["fin", "journal", journalId], queryFn: () => fn({ data: { tenantId, journalId } }) });
  const entry = (q.data as { entry?: Row } | undefined)?.entry ?? null;
  const lines = ((q.data as { lines?: Row[] } | undefined)?.lines ?? []) as Row[];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["fin", "journal", journalId] });
  if (!entry) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Journal {str(entry.entry_number)}</CardTitle>
          <JournalStatusBadge status={str(entry.status)} />
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-2">
          <div><span className="text-muted-foreground text-xs">Date:</span> {str(entry.entry_date)}</div>
          <div><span className="text-muted-foreground text-xs">Source:</span> {str(entry.source_module)}</div>
          <div className="col-span-2"><span className="text-muted-foreground text-xs">Description:</span> {str(entry.description) || "—"}</div>
        </CardContent>
      </Card>
      <FinanceActionBar>
        <Button variant="outline" disabled={str(entry.status) !== "draft"} onClick={async () => { await postFn({ data: { tenantId, journalId } }); toast.success("Posted"); invalidate(); }}>Post</Button>
        <Button variant="outline" disabled={str(entry.status) !== "posted"} onClick={async () => { await revFn({ data: { tenantId, journalId, entryDate: todayIso(), reason: "user-reverse" } }); toast.success("Reversed"); invalidate(); }}>Reverse</Button>
        <Button variant="destructive" disabled={str(entry.status) === "voided"} onClick={async () => { await voidFn({ data: { tenantId, journalId } }); toast.success("Voided"); invalidate(); }}>Void</Button>
      </FinanceActionBar>
      <JournalLinesGrid lines={lines} />
    </div>
  );
}

/* ============================================================ Cash ============================================================ */
export function ReceiptGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listReceipts);
  const q = useQuery({ queryKey: ["fin", "receipts", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "No.", cell: (r) => <span className="font-mono">{str(r.receipt_number)}</span> },
    { id: "date", header: "Date", cell: (r) => str(r.receipt_date) },
    { id: "method", header: "Method", cell: (r) => str(r.method) },
    { id: "partner", header: "Partner", cell: (r) => str(r.partner_type) },
    { id: "amt", header: "Amount", cell: (r) => money(r.amount) },
    { id: "status", header: "Status", cell: (r) => str(r.status) },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function ReceiptWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(recordReceipt);
  const [form, setForm] = useState({ receiptDate: todayIso(), amount: 0, method: "cash", partnerType: "patient", reference: "" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, receiptDate: form.receiptDate, amount: Number(form.amount), method: form.method as "cash" | "card" | "upi" | "neft" | "rtgs" | "cheque" | "other", partnerType: form.partnerType as "patient" | "customer" | "franchise" | "other", reference: form.reference || null } }),
    onSuccess: () => { toast.success("Receipt recorded"); qc.invalidateQueries({ queryKey: ["fin", "receipts", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input type="date" value={form.receiptDate} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} className="w-40" />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-32" />
        <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{["cash", "card", "upi", "neft", "rtgs", "cheque", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.partnerType} onValueChange={(v) => setForm({ ...form, partnerType: v })}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{["patient", "customer", "franchise", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-40" />
        <Button disabled={mut.isPending || !form.amount} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Record"}</Button>
      </FinanceFilterBar>
      <ReceiptGrid tenantId={tenantId} />
    </div>
  );
}

export function PaymentGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listPayments);
  const q = useQuery({ queryKey: ["fin", "payments", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "No.", cell: (r) => <span className="font-mono">{str(r.payment_number)}</span> },
    { id: "date", header: "Date", cell: (r) => str(r.payment_date) },
    { id: "method", header: "Method", cell: (r) => str(r.method) },
    { id: "partner", header: "Partner", cell: (r) => str(r.partner_type) },
    { id: "amt", header: "Amount", cell: (r) => money(r.amount) },
    { id: "status", header: "Status", cell: (r) => str(r.status) },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function PaymentWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(recordPayment);
  const [form, setForm] = useState({ paymentDate: todayIso(), amount: 0, method: "cash", partnerType: "vendor", reference: "" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, paymentDate: form.paymentDate, amount: Number(form.amount), method: form.method as "cash" | "card" | "upi" | "neft" | "rtgs" | "cheque" | "other", partnerType: form.partnerType as "vendor" | "employee" | "franchise" | "tax_authority" | "other", reference: form.reference || null } }),
    onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries({ queryKey: ["fin", "payments", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} className="w-40" />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-32" />
        <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{["cash", "card", "upi", "neft", "rtgs", "cheque", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.partnerType} onValueChange={(v) => setForm({ ...form, partnerType: v })}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{["vendor", "employee", "franchise", "tax_authority", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="w-40" />
        <Button disabled={mut.isPending || !form.amount} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Record"}</Button>
      </FinanceFilterBar>
      <PaymentGrid tenantId={tenantId} />
    </div>
  );
}

export function PettyCashWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listPettyCash);
  const fn = useServerFn(recordPettyCash);
  const q = useQuery({ queryKey: ["fin", "petty-cash", tenantId], queryFn: () => listFn({ data: { tenantId } }) });
  const [form, setForm] = useState({ voucherDate: todayIso(), amount: 0, purpose: "", category: "" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, voucherDate: form.voucherDate, amount: Number(form.amount), purpose: form.purpose || null, category: form.category || null } }),
    onSuccess: () => { toast.success("Voucher recorded"); qc.invalidateQueries({ queryKey: ["fin", "petty-cash", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "No.", cell: (r) => <span className="font-mono">{str(r.voucher_number)}</span> },
    { id: "date", header: "Date", cell: (r) => str(r.voucher_date) },
    { id: "cat", header: "Category", cell: (r) => str(r.category) || "—" },
    { id: "purpose", header: "Purpose", cell: (r) => str(r.purpose) || "—" },
    { id: "amt", header: "Amount", cell: (r) => money(r.amount) },
  ];
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input type="date" value={form.voucherDate} onChange={(e) => setForm({ ...form, voucherDate: e.target.value })} className="w-40" />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-32" />
        <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-40" />
        <Input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="flex-1 min-w-40" />
        <Button disabled={mut.isPending || !form.amount} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Record"}</Button>
      </FinanceFilterBar>
      <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />
    </div>
  );
}

export function BankAccountsGrid({ tenantId }: { tenantId: string }) {
  const banksFn = useServerFn(listBankAccounts);
  const booksFn = useServerFn(listCashBooks);
  const banks = useQuery({ queryKey: ["fin", "bank-accounts", tenantId], queryFn: () => banksFn({ data: { tenantId } }) });
  const books = useQuery({ queryKey: ["fin", "cash-books", tenantId], queryFn: () => booksFn({ data: { tenantId } }) });
  const bankCols: DataGridColumn<Row>[] = [
    { id: "name", header: "Bank", cell: (r) => str(r.bank_name) },
    { id: "acc", header: "Account", cell: (r) => str(r.account_number) },
    { id: "branch", header: "Branch", cell: (r) => str(r.branch_name) || "—" },
    { id: "curr", header: "Currency", cell: (r) => str(r.currency) },
  ];
  const bookCols: DataGridColumn<Row>[] = [
    { id: "name", header: "Cash Book", cell: (r) => str(r.name) },
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
    { id: "curr", header: "Currency", cell: (r) => str(r.currency) },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Bank accounts</CardTitle></CardHeader>
        <CardContent><DataGrid rows={asRows(banks.data)} columns={bankCols} getRowId={(r) => str(r.id)} isLoading={banks.isLoading} /></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cash books</CardTitle></CardHeader>
        <CardContent><DataGrid rows={asRows(books.data)} columns={bookCols} getRowId={(r) => str(r.id)} isLoading={books.isLoading} /></CardContent>
      </Card>
    </div>
  );
}

export function BankReconciliationWorkspace({ tenantId }: { tenantId: string }) {
  const banksFn = useServerFn(listBankAccounts);
  const fn = useServerFn(reconcileBank);
  const banks = useQuery({ queryKey: ["fin", "bank-accounts", tenantId], queryFn: () => banksFn({ data: { tenantId } }) });
  const [form, setForm] = useState({ bankAccountId: "", statementDate: todayIso(), openingBalance: 0, closingBalance: 0 });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, bankAccountId: form.bankAccountId, statementDate: form.statementDate, openingBalance: Number(form.openingBalance), closingBalance: Number(form.closingBalance), matchedLines: [], unmatchedLines: [] } }),
    onSuccess: () => toast.success("Reconciliation saved"),
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">New reconciliation</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label>Bank account</Label>
            <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{asRows(banks.data).map((b) => <SelectItem key={str(b.id)} value={str(b.id)}>{str(b.bank_name)} — {str(b.account_number)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Statement date</Label><Input type="date" value={form.statementDate} onChange={(e) => setForm({ ...form, statementDate: e.target.value })} /></div>
          <div><Label>Opening bal.</Label><Input type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: Number(e.target.value) })} /></div>
          <div><Label>Closing bal.</Label><Input type="number" value={form.closingBalance} onChange={(e) => setForm({ ...form, closingBalance: Number(e.target.value) })} /></div>
          <div className="col-span-full">
            <Button disabled={!form.bankAccountId || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Reconcile"}</Button>
          </div>
        </CardContent>
      </Card>
      <FinanceStatusBar status="Match statement lines with posted cash entries. Full matching UI reuses platform DataGrid." />
    </div>
  );
}

/* ============================================================ Expenses ============================================================ */
export function ExpenseGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listExpenses);
  const [status, setStatus] = useState<string>("");
  const q = useQuery({ queryKey: ["fin", "expenses", tenantId, status], queryFn: () => fn({ data: { tenantId, status: status || undefined } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "No.", cell: (r) => <span className="font-mono">{str(r.expense_number)}</span> },
    { id: "date", header: "Date", cell: (r) => str(r.expense_date) },
    { id: "cat", header: "Category", cell: (r) => str(r.category) || "—" },
    { id: "amt", header: "Amount", cell: (r) => money(r.amount) },
    { id: "tax", header: "Tax", cell: (r) => money(r.tax_amount) },
    { id: "status", header: "Status", cell: (r) => str(r.status) },
  ];
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{["all", "submitted", "approved", "rejected"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </FinanceFilterBar>
      <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />
    </div>
  );
}

export function ExpenseWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(recordExpense);
  const [form, setForm] = useState({ expenseDate: todayIso(), amount: 0, category: "", notes: "" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, expenseDate: form.expenseDate, amount: Number(form.amount), category: form.category || null, notes: form.notes || null, attachments: [], taxAmount: 0 } }),
    onSuccess: () => { toast.success("Expense submitted"); qc.invalidateQueries({ queryKey: ["fin", "expenses", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="w-40" />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-32" />
        <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-40" />
        <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="flex-1 min-w-40" />
        <Button disabled={mut.isPending || !form.amount} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Submit"}</Button>
      </FinanceFilterBar>
      <ExpenseGrid tenantId={tenantId} />
    </div>
  );
}

export function ExpenseApprovalCard({ tenantId, expense }: { tenantId: string; expense: Row }) {
  const qc = useQueryClient();
  const fn = useServerFn(approveExpense);
  const [reason, setReason] = useState("");
  const decide = (decision: "approve" | "reject") =>
    fn({ data: { tenantId, expenseId: str(expense.id), decision, reason: reason || null } })
      .then(() => { toast.success(decision); qc.invalidateQueries({ queryKey: ["fin", "expenses", tenantId] }); })
      .catch((e: unknown) => toast.error((e as Error).message));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Expense {str(expense.expense_number)}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">{str(expense.category)} — {money(expense.amount)}</div>
        <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => decide("approve")}>Approve</Button>
          <Button size="sm" variant="destructive" onClick={() => decide("reject")}>Reject</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============================================================ Assets ============================================================ */
export function AssetGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listAssets);
  const q = useQuery({ queryKey: ["fin", "assets-list", tenantId], queryFn: () => fn({ data: { tenantId, limit: 500 } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.asset_code)}</span> },
    { id: "name", header: "Name", cell: (r) => str(r.name) },
    { id: "cat", header: "Category", cell: (r) => str(r.category) || "—" },
    { id: "cost", header: "Cost", cell: (r) => money(r.acquisition_cost) },
    { id: "life", header: "Life (m)", cell: (r) => str(r.useful_life_months) },
    { id: "status", header: "Status", cell: (r) => str(r.status) },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function AssetWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(registerAsset);
  const [form, setForm] = useState({ assetCode: "", name: "", category: "", acquisitionDate: todayIso(), acquisitionCost: 0, usefulLifeMonths: 60 });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, assetCode: form.assetCode, name: form.name, category: form.category || null, acquisitionDate: form.acquisitionDate, acquisitionCost: Number(form.acquisitionCost), usefulLifeMonths: Number(form.usefulLifeMonths), salvageValue: 0, depreciationMethod: "straight_line" } }),
    onSuccess: () => { toast.success("Asset registered"); qc.invalidateQueries({ queryKey: ["fin", "assets-list", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input placeholder="Code" value={form.assetCode} onChange={(e) => setForm({ ...form, assetCode: e.target.value })} className="w-32" />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-56" />
        <Input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-40" />
        <Input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} className="w-40" />
        <Input type="number" placeholder="Cost" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: Number(e.target.value) })} className="w-32" />
        <Input type="number" placeholder="Months" value={form.usefulLifeMonths} onChange={(e) => setForm({ ...form, usefulLifeMonths: Number(e.target.value) })} className="w-24" />
        <Button disabled={mut.isPending || !form.assetCode || !form.name} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Register"}</Button>
      </FinanceFilterBar>
      <AssetGrid tenantId={tenantId} />
    </div>
  );
}

export function DepreciationPanel({ tenantId }: { tenantId: string }) {
  const listFn = useServerFn(listAssets);
  const scheduleFn = useServerFn(listDepreciationSchedule);
  const postFn = useServerFn(postDepreciation);
  const disposeFn = useServerFn(disposeAsset);
  const assets = useQuery({ queryKey: ["fin", "assets-list", tenantId], queryFn: () => listFn({ data: { tenantId, limit: 500 } }) });
  const [assetId, setAssetId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(todayIso());
  const sched = useQuery({
    queryKey: ["fin", "asset-schedule", tenantId, assetId],
    queryFn: () => scheduleFn({ data: { tenantId, assetId } }),
    enabled: !!assetId,
  });
  const cols: DataGridColumn<Row>[] = [
    { id: "date", header: "Date", cell: (r) => str(r.schedule_date) },
    { id: "amt", header: "Amount", cell: (r) => money(r.depreciation_amount) },
    { id: "acc", header: "Accumulated", cell: (r) => money(r.accumulated_amount) },
    { id: "book", header: "Book value", cell: (r) => money(r.book_value_after) },
  ];
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Select value={assetId} onValueChange={setAssetId}>
          <SelectTrigger className="w-72"><SelectValue placeholder="Select asset" /></SelectTrigger>
          <SelectContent>{asRows(assets.data).map((a) => <SelectItem key={str(a.id)} value={str(a.id)}>{str(a.asset_code)} — {str(a.name)}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-40" />
        <Button disabled={!assetId} onClick={async () => { await postFn({ data: { tenantId, assetId, scheduleDate } }); toast.success("Depreciation posted"); sched.refetch(); }}>Post depreciation</Button>
        <Button variant="destructive" disabled={!assetId} onClick={async () => { await disposeFn({ data: { tenantId, assetId, disposedAt: scheduleDate, disposalValue: 0 } }); toast.success("Asset disposed"); }}>Dispose</Button>
      </FinanceFilterBar>
      <DataGrid rows={asRows(sched.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={sched.isLoading} emptyMessage="Select an asset to view schedule." />
    </div>
  );
}

/* ============================================================ Budgets & Forecasts ============================================================ */
export function BudgetGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listBudgets);
  const q = useQuery({ queryKey: ["fin", "budgets-list", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
    { id: "name", header: "Name", cell: (r) => str(r.name) },
    { id: "type", header: "Type", cell: (r) => str(r.budget_type) },
    { id: "status", header: "Status", cell: (r) => str(r.status) },
    { id: "curr", header: "Currency", cell: (r) => str(r.currency) },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function BudgetWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createBudget);
  const updateFn = useServerFn(updateBudget);
  const listFn = useServerFn(listBudgets);
  const q = useQuery({ queryKey: ["fin", "budgets-list", tenantId], queryFn: () => listFn({ data: { tenantId } }) });
  const [form, setForm] = useState({ code: "", name: "", budgetType: "annual" });
  const mut = useMutation({
    mutationFn: async () => createFn({ data: { tenantId, code: form.code, name: form.name, budgetType: form.budgetType, currency: "INR", lines: [] } }),
    onSuccess: () => { toast.success("Budget created"); qc.invalidateQueries({ queryKey: ["fin", "budgets-list", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const approve = async (id: string) => { await updateFn({ data: { tenantId, budgetId: id, status: "approved" } }); toast.success("Approved"); q.refetch(); };
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-32" />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-56" />
        <Select value={form.budgetType} onValueChange={(v) => setForm({ ...form, budgetType: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{["annual", "quarterly", "monthly", "rolling"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Button disabled={mut.isPending || !form.code || !form.name} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Create"}</Button>
      </FinanceFilterBar>
      <DataGrid
        rows={asRows(q.data)}
        columns={[
          { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
          { id: "name", header: "Name", cell: (r) => str(r.name) },
          { id: "status", header: "Status", cell: (r) => str(r.status) },
          { id: "act", header: "", cell: (r) => str(r.status) !== "approved" ? <Button size="sm" variant="outline" onClick={() => approve(str(r.id))}>Approve</Button> : null },
        ]}
        getRowId={(r) => str(r.id)}
        isLoading={q.isLoading}
      />
    </div>
  );
}

export function ForecastGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listForecasts);
  const q = useQuery({ queryKey: ["fin", "forecasts", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
    { id: "name", header: "Name", cell: (r) => str(r.name) },
    { id: "type", header: "Type", cell: (r) => str(r.forecast_type) },
    { id: "scen", header: "Scenario", cell: (r) => str(r.scenario) },
    { id: "hor", header: "Horizon (mo)", cell: (r) => str(r.horizon_months) },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function ForecastWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(createForecast);
  const [form, setForm] = useState({ code: "", name: "", forecastType: "revenue", horizonMonths: 12, scenario: "baseline" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, code: form.code, name: form.name, forecastType: form.forecastType, horizonMonths: Number(form.horizonMonths), scenario: form.scenario, dataPoints: [] } }),
    onSuccess: () => { toast.success("Forecast created"); qc.invalidateQueries({ queryKey: ["fin", "forecasts", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-32" />
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-56" />
        <Input placeholder="Type" value={form.forecastType} onChange={(e) => setForm({ ...form, forecastType: e.target.value })} className="w-32" />
        <Input placeholder="Scenario" value={form.scenario} onChange={(e) => setForm({ ...form, scenario: e.target.value })} className="w-32" />
        <Input type="number" value={form.horizonMonths} onChange={(e) => setForm({ ...form, horizonMonths: Number(e.target.value) })} className="w-24" />
        <Button disabled={mut.isPending || !form.code || !form.name} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Create"}</Button>
      </FinanceFilterBar>
      <ForecastGrid tenantId={tenantId} />
    </div>
  );
}

/* ============================================================ Vendor Bills ============================================================ */
export function VendorBillGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listVendorBills);
  const q = useQuery({ queryKey: ["fin", "vendor-bills", tenantId], queryFn: () => fn({ data: { tenantId, limit: 200 } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "no", header: "No.", cell: (r) => <span className="font-mono">{str(r.bill_number)}</span> },
    { id: "date", header: "Date", cell: (r) => str(r.bill_date) },
    { id: "due", header: "Due", cell: (r) => str(r.due_date) || "—" },
    { id: "amt", header: "Total", cell: (r) => money(r.total_amount) },
    { id: "paid", header: "Paid", cell: (r) => money(r.paid_amount) },
    { id: "status", header: "Status", cell: (r) => str(r.status) },
    { id: "open", header: "", cell: (r) => <Link to="/finance/vendor-bills/$id" params={{ id: str(r.id) }} className="text-primary text-xs underline">Open</Link> },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function VendorBillWorkspace({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(createVendorBill);
  const [form, setForm] = useState({ billDate: todayIso(), vendorInvoiceRef: "", amount: 0, description: "" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, billDate: form.billDate, vendorInvoiceRef: form.vendorInvoiceRef || null, currency: "INR", discountAmount: 0, items: [{ description: form.description || null, quantity: 1, unitPrice: Number(form.amount), taxAmount: 0 }] } }),
    onSuccess: () => { toast.success("Bill created"); qc.invalidateQueries({ queryKey: ["fin", "vendor-bills", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Input type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} className="w-40" />
        <Input placeholder="Invoice ref" value={form.vendorInvoiceRef} onChange={(e) => setForm({ ...form, vendorInvoiceRef: e.target.value })} className="w-40" />
        <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-56" />
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-32" />
        <Button disabled={mut.isPending || !form.amount} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Create"}</Button>
      </FinanceFilterBar>
      <VendorBillGrid tenantId={tenantId} />
    </div>
  );
}

export function VendorPaymentPanel({ tenantId, billId }: { tenantId: string; billId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(recordVendorPayment);
  const [form, setForm] = useState({ paymentDate: todayIso(), amount: 0, method: "neft", reference: "" });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, billId, paymentDate: form.paymentDate, amount: Number(form.amount), method: form.method as "cash" | "card" | "upi" | "neft" | "rtgs" | "cheque" | "other", reference: form.reference || null } }),
    onSuccess: () => { toast.success("Payment recorded"); qc.invalidateQueries({ queryKey: ["fin", "vendor-bill", billId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Record payment</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><Label>Date</Label><Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
        <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
        <div>
          <Label>Method</Label>
          <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["cash", "card", "upi", "neft", "rtgs", "cheque", "other"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
        <div className="col-span-full"><Button disabled={mut.isPending || !form.amount} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Record payment"}</Button></div>
      </CardContent>
    </Card>
  );
}

export function VendorBillViewer({ tenantId, billId }: { tenantId: string; billId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(getVendorBill);
  const approveFn = useServerFn(approveVendorBill);
  const q = useQuery({ queryKey: ["fin", "vendor-bill", billId], queryFn: () => fn({ data: { tenantId, billId } }) });
  const bill = (q.data as { bill?: Row } | undefined)?.bill ?? null;
  const items = ((q.data as { items?: Row[] } | undefined)?.items ?? []) as Row[];
  if (!bill) return <div className="text-sm text-muted-foreground">Loading…</div>;
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Bill {str(bill.bill_number)}</CardTitle>
          <span className="text-xs uppercase tracking-wide">{str(bill.status)}</span>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-2">
          <div><span className="text-muted-foreground text-xs">Date:</span> {str(bill.bill_date)}</div>
          <div><span className="text-muted-foreground text-xs">Due:</span> {str(bill.due_date) || "—"}</div>
          <div><span className="text-muted-foreground text-xs">Total:</span> {money(bill.total_amount)}</div>
          <div><span className="text-muted-foreground text-xs">Paid:</span> {money(bill.paid_amount)}</div>
        </CardContent>
      </Card>
      <FinanceActionBar>
        <Button variant="outline" disabled={str(bill.status) === "approved"} onClick={async () => { await approveFn({ data: { tenantId, billId } }); toast.success("Approved"); qc.invalidateQueries({ queryKey: ["fin", "vendor-bill", billId] }); }}>Approve</Button>
      </FinanceActionBar>
      <DataGrid
        rows={items}
        columns={[
          { id: "desc", header: "Description", cell: (r) => str(r.description) || "—" },
          { id: "qty", header: "Qty", cell: (r) => str(r.quantity) },
          { id: "up", header: "Unit price", cell: (r) => money(r.unit_price) },
          { id: "tax", header: "Tax", cell: (r) => money(r.tax_amount) },
          { id: "lt", header: "Line total", cell: (r) => money(r.line_total) },
        ]}
        getRowId={(r) => str(r.id)}
      />
      <VendorPaymentPanel tenantId={tenantId} billId={billId} />
    </div>
  );
}

/* ============================================================ Royalty ============================================================ */
export function RoyaltyRuleGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listRoyaltyRules);
  const q = useQuery({ queryKey: ["fin", "royalty-rules", tenantId], queryFn: () => fn({ data: { tenantId } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
    { id: "name", header: "Name", cell: (r) => str(r.name) },
    { id: "basis", header: "Basis", cell: (r) => str(r.basis) },
    { id: "rate", header: "Rate %", cell: (r) => str(r.rate_pct) },
    { id: "fixed", header: "Fixed", cell: (r) => money(r.fixed_amount) },
    { id: "min", header: "Minimum", cell: (r) => money(r.minimum_amount) },
    { id: "freq", header: "Frequency", cell: (r) => str(r.frequency) },
  ];
  return <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />;
}

export function RoyaltySettlementPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertRoyaltyRule);
  const settleFn = useServerFn(settleRoyalty);
  const calcFn = useServerFn(calculateRoyalty);
  const listSettleFn = useServerFn(listRoyaltySettlements);
  const settlements = useQuery({ queryKey: ["fin", "royalty-settlements", tenantId], queryFn: () => listSettleFn({ data: { tenantId } }) });
  const [rule, setRule] = useState({ code: "", name: "", basis: "revenue", ratePct: 0, fixedAmount: 0, minimumAmount: 0, frequency: "monthly", effectiveFrom: todayIso() });
  const [calc, setCalc] = useState({ franchiseOrgUnitId: "", periodId: "", revenueBasis: 0, adjustments: 0 });
  const [settle, setSettle] = useState({ franchiseOrgUnitId: "", settlementDate: todayIso(), periodFrom: firstOfMonth(), periodTo: todayIso() });

  const saveRule = useMutation({
    mutationFn: async () => upsertFn({ data: { tenantId, code: rule.code, name: rule.name, basis: rule.basis as "revenue" | "gross_margin" | "fixed", ratePct: Number(rule.ratePct), fixedAmount: Number(rule.fixedAmount), minimumAmount: Number(rule.minimumAmount), frequency: rule.frequency as "monthly" | "quarterly" | "yearly", effectiveFrom: rule.effectiveFrom } }),
    onSuccess: () => { toast.success("Rule saved"); qc.invalidateQueries({ queryKey: ["fin", "royalty-rules", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const runCalc = useMutation({
    mutationFn: async () => calcFn({ data: { tenantId, franchiseOrgUnitId: calc.franchiseOrgUnitId, periodId: calc.periodId, revenueBasis: Number(calc.revenueBasis), adjustments: Number(calc.adjustments) } }),
    onSuccess: (d) => toast.success(`Royalty: ${money((d as { amount?: number } | undefined)?.amount ?? 0)}`),
    onError: (e) => toast.error((e as Error).message),
  });
  const runSettle = useMutation({
    mutationFn: async () => settleFn({ data: { tenantId, franchiseOrgUnitId: settle.franchiseOrgUnitId, settlementDate: settle.settlementDate, periodFrom: settle.periodFrom, periodTo: settle.periodTo, ledgerIds: [], adjustments: 0 } }),
    onSuccess: () => { toast.success("Settled"); qc.invalidateQueries({ queryKey: ["fin", "royalty-settlements", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">New royalty rule</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Code</Label><Input value={rule.code} onChange={(e) => setRule({ ...rule, code: e.target.value })} /></div>
          <div><Label>Name</Label><Input value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} /></div>
          <div>
            <Label>Basis</Label>
            <Select value={rule.basis} onValueChange={(v) => setRule({ ...rule, basis: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["revenue", "gross_margin", "fixed"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Rate %</Label><Input type="number" value={rule.ratePct} onChange={(e) => setRule({ ...rule, ratePct: Number(e.target.value) })} /></div>
          <div><Label>Fixed</Label><Input type="number" value={rule.fixedAmount} onChange={(e) => setRule({ ...rule, fixedAmount: Number(e.target.value) })} /></div>
          <div><Label>Minimum</Label><Input type="number" value={rule.minimumAmount} onChange={(e) => setRule({ ...rule, minimumAmount: Number(e.target.value) })} /></div>
          <div>
            <Label>Frequency</Label>
            <Select value={rule.frequency} onValueChange={(v) => setRule({ ...rule, frequency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["monthly", "quarterly", "yearly"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Effective from</Label><Input type="date" value={rule.effectiveFrom} onChange={(e) => setRule({ ...rule, effectiveFrom: e.target.value })} /></div>
          <div className="col-span-full"><Button disabled={saveRule.isPending || !rule.code || !rule.name} onClick={() => saveRule.mutate()}>{saveRule.isPending ? "…" : "Save rule"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Calculate royalty</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Franchise Org ID</Label><Input value={calc.franchiseOrgUnitId} onChange={(e) => setCalc({ ...calc, franchiseOrgUnitId: e.target.value })} /></div>
          <div><Label>Period ID</Label><Input value={calc.periodId} onChange={(e) => setCalc({ ...calc, periodId: e.target.value })} /></div>
          <div><Label>Revenue basis</Label><Input type="number" value={calc.revenueBasis} onChange={(e) => setCalc({ ...calc, revenueBasis: Number(e.target.value) })} /></div>
          <div><Label>Adjustments</Label><Input type="number" value={calc.adjustments} onChange={(e) => setCalc({ ...calc, adjustments: Number(e.target.value) })} /></div>
          <div className="col-span-full"><Button disabled={runCalc.isPending || !calc.franchiseOrgUnitId || !calc.periodId} onClick={() => runCalc.mutate()}>{runCalc.isPending ? "…" : "Calculate"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Settle royalty</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Franchise Org ID</Label><Input value={settle.franchiseOrgUnitId} onChange={(e) => setSettle({ ...settle, franchiseOrgUnitId: e.target.value })} /></div>
          <div><Label>Settlement date</Label><Input type="date" value={settle.settlementDate} onChange={(e) => setSettle({ ...settle, settlementDate: e.target.value })} /></div>
          <div><Label>Period from</Label><Input type="date" value={settle.periodFrom} onChange={(e) => setSettle({ ...settle, periodFrom: e.target.value })} /></div>
          <div><Label>Period to</Label><Input type="date" value={settle.periodTo} onChange={(e) => setSettle({ ...settle, periodTo: e.target.value })} /></div>
          <div className="col-span-full"><Button disabled={runSettle.isPending || !settle.franchiseOrgUnitId} onClick={() => runSettle.mutate()}>{runSettle.isPending ? "…" : "Settle"}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Settlements</CardTitle></CardHeader>
        <CardContent>
          <DataGrid
            rows={asRows(settlements.data)}
            columns={[
              { id: "no", header: "No.", cell: (r) => <span className="font-mono">{str(r.settlement_number)}</span> },
              { id: "date", header: "Date", cell: (r) => str(r.settlement_date) },
              { id: "from", header: "From", cell: (r) => str(r.period_from) },
              { id: "to", header: "To", cell: (r) => str(r.period_to) },
              { id: "amt", header: "Net", cell: (r) => money(r.net_amount) },
              { id: "status", header: "Status", cell: (r) => str(r.status) },
            ]}
            getRowId={(r) => str(r.id)}
            isLoading={settlements.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export function RoyaltyDashboard({ tenantId }: { tenantId: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Royalty rules</CardTitle></CardHeader>
        <CardContent><RoyaltyRuleGrid tenantId={tenantId} /></CardContent>
      </Card>
      <RoyaltySettlementPanel tenantId={tenantId} />
    </div>
  );
}

/* ============================================================ Tax ============================================================ */
export function TaxLedgerGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listTaxes);
  const [type, setType] = useState<string>("");
  const q = useQuery({ queryKey: ["fin", "taxes", tenantId, type], queryFn: () => fn({ data: { tenantId, taxType: type || undefined } }) });
  const cols: DataGridColumn<Row>[] = [
    { id: "date", header: "Date", cell: (r) => str(r.entry_date) },
    { id: "type", header: "Type", cell: (r) => str(r.tax_type) },
    { id: "code", header: "Code", cell: (r) => str(r.tax_code) || "—" },
    { id: "taxable", header: "Taxable", cell: (r) => money(r.taxable_amount) },
    { id: "cgst", header: "CGST", cell: (r) => money(r.cgst) },
    { id: "sgst", header: "SGST", cell: (r) => money(r.sgst) },
    { id: "igst", header: "IGST", cell: (r) => money(r.igst) },
    { id: "tds", header: "TDS", cell: (r) => money(r.tds_amount) },
  ];
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>{["all", "gst_output", "gst_input", "tds", "tcs", "other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </FinanceFilterBar>
      <DataGrid rows={asRows(q.data)} columns={cols} getRowId={(r) => str(r.id)} isLoading={q.isLoading} />
    </div>
  );
}

export function TaxDashboard({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(postTax);
  const [form, setForm] = useState({ entryDate: todayIso(), taxType: "gst_output", taxableAmount: 0, ratePct: 18, cgst: 0, sgst: 0, igst: 0 });
  const mut = useMutation({
    mutationFn: async () => fn({ data: { tenantId, entryDate: form.entryDate, taxType: form.taxType as "gst_output" | "gst_input" | "tds" | "tcs" | "other", taxableAmount: Number(form.taxableAmount), ratePct: Number(form.ratePct), cgst: Number(form.cgst), sgst: Number(form.sgst), igst: Number(form.igst), cess: 0, tdsAmount: 0, tcsAmount: 0 } }),
    onSuccess: () => { toast.success("Tax posted"); qc.invalidateQueries({ queryKey: ["fin", "taxes", tenantId] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Post tax entry</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><Label>Date</Label><Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["gst_output", "gst_input", "tds", "tcs", "other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Taxable</Label><Input type="number" value={form.taxableAmount} onChange={(e) => setForm({ ...form, taxableAmount: Number(e.target.value) })} /></div>
          <div><Label>Rate %</Label><Input type="number" value={form.ratePct} onChange={(e) => setForm({ ...form, ratePct: Number(e.target.value) })} /></div>
          <div><Label>CGST</Label><Input type="number" value={form.cgst} onChange={(e) => setForm({ ...form, cgst: Number(e.target.value) })} /></div>
          <div><Label>SGST</Label><Input type="number" value={form.sgst} onChange={(e) => setForm({ ...form, sgst: Number(e.target.value) })} /></div>
          <div><Label>IGST</Label><Input type="number" value={form.igst} onChange={(e) => setForm({ ...form, igst: Number(e.target.value) })} /></div>
          <div className="col-span-full"><Button disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "…" : "Post"}</Button></div>
        </CardContent>
      </Card>
      <TaxLedgerGrid tenantId={tenantId} />
    </div>
  );
}

/* ============================================================ Reports ============================================================ */
function useReportWindow() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayIso());
  return { from, to, setFrom, setTo };
}

export function ReportWindowBar({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <FinanceFilterBar>
      <Label className="text-xs">From</Label>
      <Input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className="w-40" />
      <Label className="text-xs">To</Label>
      <Input type="date" value={to} onChange={(e) => onTo(e.target.value)} className="w-40" />
    </FinanceFilterBar>
  );
}

export function TrialBalanceViewer({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(trialBalance);
  const w = useReportWindow();
  const q = useQuery({ queryKey: ["fin", "tb", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  const rows = asRows(q.data);
  const cols: DataGridColumn<Row>[] = [
    { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str((r.account as { code?: string } | undefined)?.code)}</span> },
    { id: "name", header: "Name", cell: (r) => str((r.account as { name?: string } | undefined)?.name) },
    { id: "type", header: "Type", cell: (r) => str((r.account as { account_type?: string } | undefined)?.account_type) },
    { id: "d", header: "Debit", cell: (r) => money(r.debit) },
    { id: "c", header: "Credit", cell: (r) => money(r.credit) },
    { id: "bal", header: "Balance", cell: (r) => money(r.balance) },
  ];
  return (
    <div className="space-y-3">
      <ReportWindowBar from={w.from} to={w.to} onFrom={w.setFrom} onTo={w.setTo} />
      <DataGrid rows={rows} columns={cols} getRowId={(_, i = 0) => `${i}`} isLoading={q.isLoading} />
    </div>
  );
}

export function ProfitLossViewer({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(profitLoss);
  const w = useReportWindow();
  const q = useQuery({ queryKey: ["fin", "pl", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  const d = q.data as { income?: number; expense?: number; netProfit?: number; breakdown?: Array<{ accountType: string; code: string; name: string; amount: number }> } | undefined;
  const rows = (d?.breakdown ?? []) as Row[];
  return (
    <div className="space-y-3">
      <ReportWindowBar from={w.from} to={w.to} onFrom={w.setFrom} onTo={w.setTo} />
      <FinanceSummaryBar items={[
        { label: "Income", value: money(d?.income ?? 0) },
        { label: "Expense", value: money(d?.expense ?? 0) },
        { label: "Net profit", value: money(d?.netProfit ?? 0) },
      ]} />
      <DataGrid
        rows={rows}
        columns={[
          { id: "type", header: "Type", cell: (r) => str(r.accountType) },
          { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
          { id: "name", header: "Name", cell: (r) => str(r.name) },
          { id: "amt", header: "Amount", cell: (r) => money(r.amount) },
        ]}
        getRowId={(r) => str(r.code)}
        isLoading={q.isLoading}
      />
    </div>
  );
}

export function BalanceSheetViewer({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(balanceSheet);
  const w = useReportWindow();
  const q = useQuery({ queryKey: ["fin", "bs", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  const d = q.data as { totals?: { assets: number; liabilities: number; equity: number }; breakdown?: Array<{ accountType: string; code: string; name: string; amount: number }> } | undefined;
  const rows = (d?.breakdown ?? []) as Row[];
  return (
    <div className="space-y-3">
      <ReportWindowBar from={w.from} to={w.to} onFrom={w.setFrom} onTo={w.setTo} />
      <FinanceSummaryBar items={[
        { label: "Assets", value: money(d?.totals?.assets ?? 0) },
        { label: "Liabilities", value: money(d?.totals?.liabilities ?? 0) },
        { label: "Equity", value: money(d?.totals?.equity ?? 0) },
      ]} />
      <DataGrid
        rows={rows}
        columns={[
          { id: "type", header: "Type", cell: (r) => str(r.accountType) },
          { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
          { id: "name", header: "Name", cell: (r) => str(r.name) },
          { id: "amt", header: "Amount", cell: (r) => money(r.amount) },
        ]}
        getRowId={(r) => str(r.code)}
        isLoading={q.isLoading}
      />
    </div>
  );
}

export function CashFlowViewer({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(cashFlow);
  const w = useReportWindow();
  const q = useQuery({ queryKey: ["fin", "cf", tenantId, w.from, w.to], queryFn: () => fn({ data: { tenantId, from: w.from, to: w.to } }) });
  const d = q.data as { inflow?: number; outflow?: number; net?: number } | undefined;
  return (
    <div className="space-y-3">
      <ReportWindowBar from={w.from} to={w.to} onFrom={w.setFrom} onTo={w.setTo} />
      <FinanceSummaryBar items={[
        { label: "Inflow", value: money(d?.inflow ?? 0) },
        { label: "Outflow", value: money(d?.outflow ?? 0) },
        { label: "Net", value: money(d?.net ?? 0) },
      ]} />
      {q.isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
    </div>
  );
}

/* ============================================================ Fiscal Periods ============================================================ */
export function FiscalPeriodsPanel({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();
  const yearsFn = useServerFn(listFiscalYears);
  const periodsFn = useServerFn(listPeriodsByYear);
  const openFn = useServerFn(openPeriod);
  const closeFn = useServerFn(closePeriod);
  const [fiscalYearId, setFiscalYearId] = useState("");
  const years = useQuery({ queryKey: ["fin", "years", tenantId], queryFn: () => yearsFn({ data: { tenantId } }) });
  const periods = useQuery({
    queryKey: ["fin", "periods", tenantId, fiscalYearId],
    queryFn: () => periodsFn({ data: { tenantId, fiscalYearId, periodId: "00000000-0000-0000-0000-000000000000" } }),
    enabled: !!fiscalYearId,
  });
  return (
    <div className="space-y-3">
      <FinanceFilterBar>
        <Select value={fiscalYearId} onValueChange={setFiscalYearId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select fiscal year" /></SelectTrigger>
          <SelectContent>{asRows(years.data).map((y) => <SelectItem key={str(y.id)} value={str(y.id)}>{str(y.code)} — {str(y.name)}</SelectItem>)}</SelectContent>
        </Select>
      </FinanceFilterBar>
      <DataGrid
        rows={asRows(periods.data)}
        columns={[
          { id: "code", header: "Code", cell: (r) => <span className="font-mono">{str(r.code)}</span> },
          { id: "n", header: "#", cell: (r) => str(r.period_number) },
          { id: "s", header: "Start", cell: (r) => str(r.start_date) },
          { id: "e", header: "End", cell: (r) => str(r.end_date) },
          { id: "st", header: "Status", cell: (r) => str(r.status) },
          {
            id: "act",
            header: "",
            cell: (r) => str(r.status) === "open"
              ? <Button size="sm" variant="destructive" onClick={async () => { await closeFn({ data: { tenantId, periodId: str(r.id) } }); toast.success("Closed"); qc.invalidateQueries({ queryKey: ["fin", "periods", tenantId, fiscalYearId] }); }}>Close</Button>
              : <Button size="sm" variant="outline" onClick={async () => { await openFn({ data: { tenantId, fiscalYearId, code: str(r.code), periodNumber: Number(r.period_number), startDate: str(r.start_date), endDate: str(r.end_date) } }); toast.success("Reopened"); qc.invalidateQueries({ queryKey: ["fin", "periods", tenantId, fiscalYearId] }); }}>Reopen</Button>,
          },
        ]}
        getRowId={(r) => str(r.id)}
        isLoading={periods.isLoading}
        emptyMessage={fiscalYearId ? "No periods." : "Select a fiscal year."}
      />
    </div>
  );
}
