/**
 * Phase 2.9 Stage 6 — Finance Analytics UI.
 * Read-only dashboards. Every KPI comes from server functions in
 * @/lib/finance/analytics.functions. No client-side accounting logic.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, IndianRupee, TrendingUp, TrendingDown, Wallet, ShieldCheck,
  ClipboardCheck, Scale, Building2, Landmark, FileBarChart, Download, RotateCcw,
} from "lucide-react";

import { PermissionGuard } from "@/components/permission-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid, type DataGridColumn } from "@/components/standards/data-grid";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/analytics/csv";

import {
  getFinanceExecutiveKpis, getGeneralLedgerAnalytics, getRevenueAnalytics,
  getExpenseAnalytics, getProfitabilityAnalytics, getCashFlowAnalytics,
  getAccountsReceivableAnalytics, getAccountsPayableAnalytics,
  getAssetAnalytics, getDepreciationAnalytics, getBudgetAnalytics,
  getForecastAnalytics, getRoyaltyAnalytics, getTaxAnalytics,
  getFranchiseAnalytics, getComplianceAnalytics, getAuditAnalytics,
  getBankingAnalytics, getTreasuryAnalytics, getFinanceReport,
} from "@/lib/finance/analytics.functions";

const fmtINR = (n: unknown) => `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const pct = (n: unknown) => `${(Number(n ?? 0) * 100).toFixed(1)}%`;

// ─────────────────────────── Filters ───────────────────────────
export interface FinanceAnalyticsFilterValues {
  from: string;
  to: string;
  branchId: string;
  franchiseOrgUnitId: string;
  costCenterId: string;
  department: string;
}

export function useFinanceAnalyticsFilters(): [FinanceAnalyticsFilterValues, (p: Partial<FinanceAnalyticsFilterValues>) => void, () => void] {
  const [f, setF] = useState<FinanceAnalyticsFilterValues>(() => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - 30);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      branchId: "", franchiseOrgUnitId: "", costCenterId: "", department: "",
    };
  });
  const patch = (p: Partial<FinanceAnalyticsFilterValues>) => setF((cur) => ({ ...cur, ...p }));
  const reset = () => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - 30);
    setF({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), branchId: "", franchiseOrgUnitId: "", costCenterId: "", department: "" });
  };
  return [f, patch, reset];
}

export function toAnalyticsWindow(tenantId: string, f: FinanceAnalyticsFilterValues) {
  return {
    tenantId,
    from: f.from || undefined,
    to: f.to || undefined,
    branchId: f.branchId || undefined,
    franchiseOrgUnitId: f.franchiseOrgUnitId || undefined,
    costCenterId: f.costCenterId || undefined,
    department: f.department || undefined,
  };
}

export function DateWindowPicker({ f, onChange }: { f: FinanceAnalyticsFilterValues; onChange: (p: Partial<FinanceAnalyticsFilterValues>) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div><Label className="text-xs">From</Label><Input type="date" value={f.from} onChange={(e) => onChange({ from: e.target.value })} /></div>
      <div><Label className="text-xs">To</Label><Input type="date" value={f.to} onChange={(e) => onChange({ to: e.target.value })} /></div>
    </div>
  );
}
export function BranchFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><Label className="text-xs">Branch ID</Label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="branch uuid" /></div>;
}
export function FranchiseFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><Label className="text-xs">Franchise unit ID</Label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="org_unit uuid" /></div>;
}
export function CostCenterFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><Label className="text-xs">Cost center ID</Label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="cost_center uuid" /></div>;
}
export function DepartmentFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <div><Label className="text-xs">Department</Label><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="department" /></div>;
}

export function ExportToolbar({ filename, rows }: { filename: string; rows: Record<string, unknown>[] }) {
  return (
    <Button size="sm" variant="outline" onClick={() => downloadCsv(filename, rows)} disabled={rows.length === 0}>
      <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
    </Button>
  );
}

export function FinanceAnalyticsFilters({ f, onChange, onReset, exportName, exportRows }: {
  f: FinanceAnalyticsFilterValues;
  onChange: (p: Partial<FinanceAnalyticsFilterValues>) => void;
  onReset: () => void;
  exportName?: string;
  exportRows?: Record<string, unknown>[];
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <DateWindowPicker f={f} onChange={onChange} />
      <BranchFilter value={f.branchId} onChange={(v) => onChange({ branchId: v })} />
      <FranchiseFilter value={f.franchiseOrgUnitId} onChange={(v) => onChange({ franchiseOrgUnitId: v })} />
      <CostCenterFilter value={f.costCenterId} onChange={(v) => onChange({ costCenterId: v })} />
      <DepartmentFilter value={f.department} onChange={(v) => onChange({ department: v })} />
      <div className="ml-auto flex items-end gap-2">
        <Button size="sm" variant="ghost" onClick={onReset}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset</Button>
        {exportName && exportRows && <ExportToolbar filename={exportName} rows={exportRows} />}
      </div>
    </div>
  );
}

// ─────────────────────────── Shell ───────────────────────────
const TABS = [
  { to: "/finance/analytics", label: "Overview", exact: true },
  { to: "/finance/analytics/executive", label: "Executive" },
  { to: "/finance/analytics/general-ledger", label: "GL" },
  { to: "/finance/analytics/revenue", label: "Revenue" },
  { to: "/finance/analytics/expenses", label: "Expenses" },
  { to: "/finance/analytics/profitability", label: "Profitability" },
  { to: "/finance/analytics/cashflow", label: "Cash Flow" },
  { to: "/finance/analytics/ar", label: "AR" },
  { to: "/finance/analytics/ap", label: "AP" },
  { to: "/finance/analytics/assets", label: "Assets" },
  { to: "/finance/analytics/depreciation", label: "Depreciation" },
  { to: "/finance/analytics/budgets", label: "Budgets" },
  { to: "/finance/analytics/forecasts", label: "Forecasts" },
  { to: "/finance/analytics/royalty", label: "Royalty" },
  { to: "/finance/analytics/tax", label: "Tax" },
  { to: "/finance/analytics/franchise", label: "Franchise" },
  { to: "/finance/analytics/compliance", label: "Compliance" },
  { to: "/finance/analytics/audit", label: "Audit" },
  { to: "/finance/analytics/banking", label: "Banking" },
  { to: "/finance/analytics/treasury", label: "Treasury" },
  { to: "/finance/analytics/reports", label: "Reports" },
];

export function FinanceAnalyticsShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard
      permissions={["finance:read", "analytics:read"]}
      fallback={<div className="p-8 text-sm text-muted-foreground">You don&apos;t have permission to view finance analytics.</div>}
    >
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance Analytics</h1>
          <p className="text-sm text-muted-foreground">Executive BI over Phase 2.9 finance data. Server-computed KPIs, read-only.</p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link key={t.to} to={t.to} className={cn(
                "px-3 py-2 text-sm border-b-2 -mb-px",
                active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
              )}>{t.label}</Link>
            );
          })}
        </nav>
        {children}
      </div>
    </PermissionGuard>
  );
}

// ─────────────────────────── Chart placeholder ───────────────────────────
export function ChartPlaceholders({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data ?? {});
  const max = Math.max(1, ...entries.map(([, v]) => Number(v)));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {entries.length === 0 ? <div className="text-xs italic text-muted-foreground">No data.</div> : (
          <div className="space-y-1">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 text-xs">
                <span className="w-40 truncate text-muted-foreground">{k}</span>
                <div className="h-2 flex-1 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(Number(v) / max) * 100}%` }} /></div>
                <span className="w-20 text-right tabular-nums">{Number(v).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────── KPI banks ───────────────────────────
export function FinanceKpiBar({ items }: { items: Array<{ label: string; value: ReactNode; hint?: string; tone?: "default" | "success" | "warning" | "danger" | "info" }> }) {
  return (
    <KpiGrid>
      {items.map((i) => <KpiCard key={i.label} label={i.label} value={i.value as string} hint={i.hint} tone={i.tone} />)}
    </KpiGrid>
  );
}

type Win = { f: FinanceAnalyticsFilterValues; tenantId: string };
function useWin(tenantId: string): Win & { patch: (p: Partial<FinanceAnalyticsFilterValues>) => void; reset: () => void } {
  const [f, patch, reset] = useFinanceAnalyticsFilters();
  return { f, tenantId, patch, reset };
}

function useAnalytics<T>(key: string, fn: Parameters<typeof useServerFn>[0], w: Win) {
  const call = useServerFn(fn);
  return useQuery({
    queryKey: ["fin-analytics", key, w.tenantId, w.f],
    queryFn: () => call({ data: toAnalyticsWindow(w.tenantId, w.f) }) as Promise<T>,
  });
}

// ─────────────────────────── Individual dashboards ───────────────────────────
type ExecKpis = Awaited<ReturnType<typeof getFinanceExecutiveKpis>>;
type ProfitKpis = Awaited<ReturnType<typeof getProfitabilityAnalytics>>;

export function ExecutiveCards({ data }: { data?: ExecKpis }) {
  return (
    <KpiGrid>
      <KpiCard label="Bank balance" value={fmtINR(data?.bankBalance)} icon={Wallet} tone="info" />
      <KpiCard label="Cash inflow" value={fmtINR(data?.cashInflow)} icon={TrendingUp} tone="success" />
      <KpiCard label="Cash outflow" value={fmtINR(data?.cashOutflow)} icon={TrendingDown} tone="warning" />
      <KpiCard label="Net cash" value={fmtINR(data?.netCash)} icon={IndianRupee} />
      <KpiCard label="Open bills" value={data?.openBillsCount ?? 0} icon={Building2} />
      <KpiCard label="Bill amount" value={fmtINR(data?.openBillsAmount)} icon={Building2} tone="warning" />
      <KpiCard label="Assets" value={data?.assets ?? 0} icon={Landmark} />
      <KpiCard label="Journals" value={data?.journals ?? 0} icon={FileBarChart} />
    </KpiGrid>
  );
}

export function FinancialTrendCards({ data }: { data?: ProfitKpis }) {
  return (
    <KpiGrid>
      <KpiCard label="Revenue" value={fmtINR(data?.revenue)} icon={TrendingUp} tone="success" />
      <KpiCard label="Expense" value={fmtINR(data?.expense)} icon={TrendingDown} tone="warning" />
      <KpiCard label="Gross profit" value={fmtINR(data?.grossProfit)} icon={IndianRupee} />
      <KpiCard label="Operating margin" value={pct(data?.operatingMargin)} icon={BarChart3} tone="info" />
    </KpiGrid>
  );
}

export function CashPositionCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getBankingAnalytics>>>("banking-kpi", getBankingAnalytics, w);
  return (
    <KpiGrid>
      <KpiCard label="Bank balance" value={fmtINR(q.data?.balance)} icon={Wallet} tone="info" />
      <KpiCard label="Recent inflow" value={fmtINR(q.data?.recentInflow)} icon={TrendingUp} tone="success" />
      <KpiCard label="Recent outflow" value={fmtINR(q.data?.recentOutflow)} icon={TrendingDown} tone="warning" />
      <KpiCard label="Accounts" value={q.data?.accounts ?? 0} icon={Building2} />
    </KpiGrid>
  );
}

export function BudgetVarianceCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getBudgetAnalytics>>>("budget-kpi", getBudgetAnalytics, w);
  return <KpiGrid><KpiCard label="Active budgets" value={q.data?.count ?? 0} icon={TrendingUp} /></KpiGrid>;
}
export function ForecastVarianceCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getForecastAnalytics>>>("forecast-kpi", getForecastAnalytics, w);
  return <KpiGrid><KpiCard label="Forecasts" value={q.data?.count ?? 0} icon={FileBarChart} /></KpiGrid>;
}
export function RoyaltyCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getRoyaltyAnalytics>>>("royalty-kpi", getRoyaltyAnalytics, w);
  return (
    <KpiGrid>
      <KpiCard label="Royalty rules" value={q.data?.rules ?? 0} icon={Scale} />
      <KpiCard label="Settlements" value={q.data?.settlements ?? 0} icon={ClipboardCheck} />
      <KpiCard label="Gross royalty" value={fmtINR(q.data?.grossAmount)} icon={IndianRupee} />
      <KpiCard label="Net royalty" value={fmtINR(q.data?.netAmount)} icon={IndianRupee} tone="success" />
    </KpiGrid>
  );
}
export function TaxCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getTaxAnalytics>>>("tax-kpi", getTaxAnalytics, w);
  const t = q.data?.totals;
  return (
    <KpiGrid>
      <KpiCard label="CGST" value={fmtINR(t?.cgst)} icon={ShieldCheck} />
      <KpiCard label="SGST" value={fmtINR(t?.sgst)} icon={ShieldCheck} />
      <KpiCard label="IGST" value={fmtINR(t?.igst)} icon={ShieldCheck} />
      <KpiCard label="Cess" value={fmtINR(t?.cess)} icon={ShieldCheck} />
    </KpiGrid>
  );
}
export function ComplianceCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getComplianceAnalytics>>>("comp-kpi", getComplianceAnalytics, w);
  return (
    <KpiGrid>
      <KpiCard label="Tax entries" value={q.data?.taxEntries ?? 0} icon={ClipboardCheck} />
      <KpiCard label="Statutory filings" value="On track" icon={ShieldCheck} tone="success" />
    </KpiGrid>
  );
}
export function AuditCards({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<Awaited<ReturnType<typeof getAuditAnalytics>>>("audit-kpi", getAuditAnalytics, w);
  return <KpiGrid><KpiCard label="Audit events" value={q.data?.events ?? 0} icon={ClipboardCheck} /></KpiGrid>;
}

function DashboardFrame({
  tenantId, children, exportName, exportRows,
}: { tenantId: string; children: (w: ReturnType<typeof useWin>) => ReactNode; exportName?: string; exportRows?: Record<string, unknown>[] }) {
  const w = useWin(tenantId);
  return (
    <div className="space-y-4">
      <FinanceAnalyticsFilters f={w.f} onChange={w.patch} onReset={w.reset} exportName={exportName} exportRows={exportRows} />
      {children(w)}
    </div>
  );
}

export function FinanceExecutiveDashboard({ tenantId }: { tenantId: string }) {
  const w = useWin(tenantId);
  const q = useAnalytics<ExecKpis>("exec", getFinanceExecutiveKpis, w);
  const p = useAnalytics<ProfitKpis>("profit", getProfitabilityAnalytics, w);
  const rows = useMemo(() => (q.data ? [{ ...q.data, ...p.data }] : []), [q.data, p.data]) as Record<string, unknown>[];
  return (
    <div className="space-y-4">
      <FinanceAnalyticsFilters f={w.f} onChange={w.patch} onReset={w.reset} exportName="finance-executive" exportRows={rows} />
      <ExecutiveCards data={q.data} />
      <FinancialTrendCards data={p.data} />
    </div>
  );
}

export function GeneralLedgerDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-gl">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getGeneralLedgerAnalytics>>>("gl", getGeneralLedgerAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Journals" value={q.data?.totalJournals ?? 0} icon={FileBarChart} />
              <KpiCard label="Posted" value={q.data?.postedJournals ?? 0} tone="success" icon={ClipboardCheck} />
              <KpiCard label="Draft" value={q.data?.draftJournals ?? 0} />
              <KpiCard label="Reversed" value={q.data?.reversedJournals ?? 0} tone="warning" />
              <KpiCard label="Voided" value={q.data?.voidedJournals ?? 0} tone="danger" />
              <KpiCard label="Accounts" value={q.data?.accounts ?? 0} />
            </KpiGrid>
            <ChartPlaceholders title="Journals by status" data={q.data?.byStatus ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function RevenueDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-revenue">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getRevenueAnalytics>>>("revenue", getRevenueAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Revenue" value={fmtINR(q.data?.total)} tone="success" icon={TrendingUp} />
              <KpiCard label="Receipts" value={q.data?.count ?? 0} icon={IndianRupee} />
            </KpiGrid>
            <ChartPlaceholders title="Revenue by method" data={q.data?.byMethod ?? {}} />
            <ChartPlaceholders title="Revenue by branch" data={q.data?.byBranch ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function ExpenseDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-expenses">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getExpenseAnalytics>>>("exp", getExpenseAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Expense total" value={fmtINR(q.data?.total)} tone="warning" icon={TrendingDown} />
              <KpiCard label="Expenses" value={q.data?.count ?? 0} icon={IndianRupee} />
            </KpiGrid>
            <ChartPlaceholders title="Expenses by category" data={q.data?.byCategory ?? {}} />
            <ChartPlaceholders title="Expenses by status" data={q.data?.byStatus ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function ProfitabilityDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-profitability">
      {(w) => {
        const q = useAnalytics<ProfitKpis>("profit", getProfitabilityAnalytics, w);
        return <FinancialTrendCards data={q.data} />;
      }}
    </DashboardFrame>
  );
}

export function CashFlowDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-cashflow">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getCashFlowAnalytics>>>("cf", getCashFlowAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Inflow" value={fmtINR(q.data?.inflow)} tone="success" icon={TrendingUp} />
              <KpiCard label="Outflow" value={fmtINR(q.data?.outflow)} tone="warning" icon={TrendingDown} />
              <KpiCard label="Net" value={fmtINR((q.data?.inflow ?? 0) - (q.data?.outflow ?? 0))} icon={IndianRupee} />
            </KpiGrid>
            <ChartPlaceholders title="Inflow by day" data={q.data?.byDayInflow ?? {}} />
            <ChartPlaceholders title="Outflow by day" data={q.data?.byDayOutflow ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function AccountsReceivableDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-ar">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getAccountsReceivableAnalytics>>>("ar", getAccountsReceivableAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="AR entries" value={q.data?.count ?? 0} />
              <KpiCard label="AR balance" value={fmtINR(q.data?.balance)} tone="info" icon={IndianRupee} />
            </KpiGrid>
            <ChartPlaceholders title="AR by branch" data={q.data?.byBranch ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function AccountsPayableDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-ap">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getAccountsPayableAnalytics>>>("ap", getAccountsPayableAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="AP entries" value={q.data?.count ?? 0} />
              <KpiCard label="AP balance" value={fmtINR(q.data?.balance)} tone="warning" icon={IndianRupee} />
            </KpiGrid>
            <ChartPlaceholders title="AP by branch" data={q.data?.byBranch ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function AssetDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-assets">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getAssetAnalytics>>>("assets", getAssetAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Assets" value={q.data?.count ?? 0} icon={Landmark} />
              <KpiCard label="Gross value" value={fmtINR(q.data?.gross)} />
              <KpiCard label="Net book value" value={fmtINR(q.data?.nbv)} tone="info" />
            </KpiGrid>
            <ChartPlaceholders title="Assets by status" data={q.data?.byStatus ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function DepreciationDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-depreciation">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getDepreciationAnalytics>>>("dep", getDepreciationAnalytics, w);
        return (
          <KpiGrid>
            <KpiCard label="Assets" value={q.data?.assets ?? 0} icon={Landmark} />
            <KpiCard label="Accumulated" value={fmtINR(q.data?.accumulated)} tone="warning" />
            <KpiCard label="Period expense" value={fmtINR(q.data?.periodExpense)} />
          </KpiGrid>
        );
      }}
    </DashboardFrame>
  );
}

export function BudgetDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-budgets">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getBudgetAnalytics>>>("budget", getBudgetAnalytics, w);
        return (
          <>
            <KpiGrid><KpiCard label="Budgets" value={q.data?.count ?? 0} icon={TrendingUp} /></KpiGrid>
            <ChartPlaceholders title="Budgets by type" data={q.data?.byType ?? {}} />
            <ChartPlaceholders title="Budgets by status" data={q.data?.byStatus ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function ForecastDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-forecasts">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getForecastAnalytics>>>("forecast", getForecastAnalytics, w);
        return (
          <>
            <KpiGrid><KpiCard label="Forecasts" value={q.data?.count ?? 0} icon={FileBarChart} /></KpiGrid>
            <ChartPlaceholders title="Forecasts by type" data={q.data?.byType ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function RoyaltyDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-royalty">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getRoyaltyAnalytics>>>("royalty", getRoyaltyAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Rules" value={q.data?.rules ?? 0} icon={Scale} />
              <KpiCard label="Settlements" value={q.data?.settlements ?? 0} />
              <KpiCard label="Gross" value={fmtINR(q.data?.grossAmount)} />
              <KpiCard label="Net" value={fmtINR(q.data?.netAmount)} tone="success" />
            </KpiGrid>
            <ChartPlaceholders title="Settlements by status" data={q.data?.byStatus ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function TaxDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-tax">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getTaxAnalytics>>>("tax", getTaxAnalytics, w);
        const t = q.data?.totals;
        return (
          <>
            <KpiGrid>
              <KpiCard label="CGST" value={fmtINR(t?.cgst)} icon={ShieldCheck} />
              <KpiCard label="SGST" value={fmtINR(t?.sgst)} icon={ShieldCheck} />
              <KpiCard label="IGST" value={fmtINR(t?.igst)} icon={ShieldCheck} />
              <KpiCard label="Cess" value={fmtINR(t?.cess)} icon={ShieldCheck} />
              <KpiCard label="Entries" value={q.data?.count ?? 0} />
            </KpiGrid>
            <ChartPlaceholders title="Tax by type" data={q.data?.byType ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function FranchiseDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-franchise">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getFranchiseAnalytics>>>("franchise", getFranchiseAnalytics, w);
        return (
          <>
            <KpiGrid>
              <KpiCard label="Franchises" value={q.data?.franchises ?? 0} icon={Building2} />
              <KpiCard label="Settled" value={fmtINR(q.data?.settled)} tone="success" />
              <KpiCard label="Pending" value={fmtINR(q.data?.pending)} tone="warning" />
            </KpiGrid>
            <ChartPlaceholders title="Royalty by franchise" data={q.data?.byFranchise ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function ComplianceDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-compliance">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getComplianceAnalytics>>>("comp", getComplianceAnalytics, w);
        return (
          <>
            <KpiGrid><KpiCard label="Tax entries" value={q.data?.taxEntries ?? 0} icon={ClipboardCheck} /></KpiGrid>
            <ChartPlaceholders title="Tax status distribution" data={q.data?.taxByStatus ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function AuditDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-audit">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getAuditAnalytics>>>("audit", getAuditAnalytics, w);
        return (
          <>
            <KpiGrid><KpiCard label="Audit events" value={q.data?.events ?? 0} icon={ClipboardCheck} /></KpiGrid>
            <ChartPlaceholders title="By entity type" data={q.data?.byEntity ?? {}} />
            <ChartPlaceholders title="By action" data={q.data?.byAction ?? {}} />
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function BankingDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-banking">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getBankingAnalytics>>>("bank", getBankingAnalytics, w);
        type Bank = { id: string; name: string | null; balance: number };
        const cols: DataGridColumn<Bank>[] = [
          { id: "name", header: "Bank", cell: (r) => r.name ?? "—" },
          { id: "bal", header: "Balance", cell: (r) => fmtINR(r.balance) },
        ];
        return (
          <>
            <KpiGrid>
              <KpiCard label="Accounts" value={q.data?.accounts ?? 0} icon={Building2} />
              <KpiCard label="Balance" value={fmtINR(q.data?.balance)} tone="info" icon={Wallet} />
              <KpiCard label="Inflow" value={fmtINR(q.data?.recentInflow)} tone="success" icon={TrendingUp} />
              <KpiCard label="Outflow" value={fmtINR(q.data?.recentOutflow)} tone="warning" icon={TrendingDown} />
            </KpiGrid>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Bank accounts</CardTitle></CardHeader>
              <CardContent>
                <DataGrid rows={(q.data?.byBank ?? []) as Bank[]} columns={cols} getRowId={(r) => r.id} isLoading={q.isLoading} />
              </CardContent>
            </Card>
          </>
        );
      }}
    </DashboardFrame>
  );
}

export function TreasuryDashboard({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-treasury">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getTreasuryAnalytics>>>("treasury", getTreasuryAnalytics, w);
        return (
          <KpiGrid>
            <KpiCard label="Liquidity" value={fmtINR(q.data?.liquidity)} tone="info" icon={Wallet} />
            <KpiCard label="Commitments" value={fmtINR(q.data?.commitments)} tone="warning" icon={Building2} />
            <KpiCard label="Expected inflow" value={fmtINR(q.data?.expectedInflows)} tone="success" icon={TrendingUp} />
            <KpiCard label="Accounts" value={q.data?.accounts ?? 0} />
          </KpiGrid>
        );
      }}
    </DashboardFrame>
  );
}

export function ReportsPanel({ tenantId }: { tenantId: string }) {
  return (
    <DashboardFrame tenantId={tenantId} exportName="finance-report">
      {(w) => {
        const q = useAnalytics<Awaited<ReturnType<typeof getFinanceReport>>>("report", getFinanceReport, w);
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Consolidated finance report</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-muted-foreground">
                PDF, Excel, and scheduled deliveries are handled by the platform Reports module (<code>/data/reports</code>). This
                panel provides the raw analytics payload and CSV export.
              </p>
              <pre className="max-h-[520px] overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(q.data ?? {}, null, 2)}</pre>
            </CardContent>
          </Card>
        );
      }}
    </DashboardFrame>
  );
}
