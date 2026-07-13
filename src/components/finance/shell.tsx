import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { cn } from "@/lib/utils";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { TimelinePanel } from "@/components/standards/timeline-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndianRupee, BookOpen, Wallet, Banknote, Receipt, Landmark, Building2, TrendingUp, ShieldCheck } from "lucide-react";

export const FINANCE_TABS = [
  { to: "/finance", label: "Overview", exact: true },
  { to: "/finance/executive", label: "Executive" },
  { to: "/finance/analytics", label: "Analytics" },
  { to: "/finance/approvals", label: "Approvals" },
  { to: "/finance/period-close", label: "Period Close" },
  { to: "/finance/accounts", label: "Accounts" },
  { to: "/finance/journals", label: "Journals" },
  { to: "/finance/revenue", label: "Revenue" },
  { to: "/finance/accounts-receivable", label: "AR" },
  { to: "/finance/accounts-payable", label: "AP" },
  { to: "/finance/receipts", label: "Receipts" },
  { to: "/finance/payments", label: "Payments" },
  { to: "/finance/petty-cash", label: "Petty Cash" },
  { to: "/finance/bank", label: "Bank" },
  { to: "/finance/bank-reconciliation", label: "Bank Recon" },
  { to: "/finance/cash-management", label: "Cash" },
  { to: "/finance/treasury", label: "Treasury" },
  { to: "/finance/expenses", label: "Expenses" },
  { to: "/finance/vendor-bills", label: "Vendor Bills" },
  { to: "/finance/assets", label: "Assets" },
  { to: "/finance/depreciation", label: "Depreciation" },
  { to: "/finance/budgets", label: "Budgets" },
  { to: "/finance/forecasts", label: "Forecasts" },
  { to: "/finance/royalty", label: "Royalty" },
  { to: "/finance/tax", label: "Tax" },
  { to: "/finance/compliance", label: "Compliance" },
  { to: "/finance/audit", label: "Audit" },
  { to: "/finance/intercompany", label: "Intercompany" },
  { to: "/finance/reports", label: "Reports" },
  { to: "/finance/trial-balance", label: "Trial Balance" },
  { to: "/finance/profit-loss", label: "P&L" },
  { to: "/finance/balance-sheet", label: "Balance Sheet" },
  { to: "/finance/cash-flow", label: "Cash Flow" },
];

export function FinanceHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Finance, Accounting &amp; ERP</h1>
      <p className="text-sm text-muted-foreground">
        Chart of accounts, journals, cash, expenses, assets, budgets, royalty, tax and reports.
        UI reads Phase 2.9 Stage 2 server functions only — no client-side accounting logic.
      </p>
    </div>
  );
}

export function FinanceSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {FINANCE_TABS.map((t) => {
        const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "px-3 py-2 text-sm border-b-2 -mb-px",
              active
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const FinanceTabs = FinanceSidebar;

export function FinanceFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">{children}</div>;
}

export function FinanceActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

export function FinanceStatusBar({ status, tone = "info" }: { status: string; tone?: "info" | "success" | "warning" | "danger" }) {
  const toneCls =
    tone === "danger" ? "bg-destructive/10 text-destructive border-destructive/30" :
    tone === "warning" ? "bg-amber-500/10 text-amber-700 border-amber-500/30" :
    tone === "success" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" :
    "bg-muted text-muted-foreground border-border";
  return <div className={cn("rounded-md border px-3 py-1.5 text-xs font-medium", toneCls)}>{status}</div>;
}

export function FinanceNotesPanel({ notes }: { notes?: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
      <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
        {notes && notes.trim().length > 0 ? notes : <span className="text-xs italic">No notes recorded.</span>}
      </CardContent>
    </Card>
  );
}

export function FinanceAuditPanel({ items }: { items: Array<{ at: string; actor?: string | null; event: string; detail?: string | null }> }) {
  return (
    <TimelinePanel
      items={items.map((i) => ({
        ts: i.at,
        event_type: i.event,
        title: i.event,
        body: i.detail ?? (i.actor ? `by ${i.actor}` : null),
      }))}
    />
  );
}

export function FinanceTimeline({ items }: { items: Array<{ id?: string; at: string; title: string; description?: string; actor?: string; event?: string }> }) {
  return (
    <TimelinePanel
      items={items.map((i) => ({
        ts: i.at,
        event_type: i.event ?? "event",
        title: i.title,
        body: i.description ?? (i.actor ? `by ${i.actor}` : null),
      }))}
    />
  );
}

export function FinanceSummaryBar({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="flex flex-wrap gap-4 rounded-md border bg-card px-3 py-2">
      {items.map((i) => (
        <div key={i.label} className="text-xs">
          <div className="text-muted-foreground uppercase tracking-wide">{i.label}</div>
          <div className="text-sm font-semibold tabular-nums">{i.value}</div>
        </div>
      ))}
    </div>
  );
}

export function FinanceDashboardCards({
  accounts, journals, cashInflow, cashOutflow, openBills, openExpenses, assets, budgets,
}: {
  accounts?: number; journals?: number; cashInflow?: number; cashOutflow?: number;
  openBills?: number; openExpenses?: number; assets?: number; budgets?: number;
}) {
  return (
    <KpiGrid>
      <KpiCard label="Chart of Accounts" value={accounts ?? "—"} icon={BookOpen} tone="info" />
      <KpiCard label="Journals (window)" value={journals ?? "—"} icon={Receipt} />
      <KpiCard label="Cash inflow" value={cashInflow != null ? `₹${cashInflow.toLocaleString()}` : "—"} icon={Banknote} tone="success" />
      <KpiCard label="Cash outflow" value={cashOutflow != null ? `₹${cashOutflow.toLocaleString()}` : "—"} icon={Wallet} tone="warning" />
      <KpiCard label="Open vendor bills" value={openBills ?? 0} icon={Building2} />
      <KpiCard label="Pending expenses" value={openExpenses ?? 0} icon={IndianRupee} />
      <KpiCard label="Fixed assets" value={assets ?? 0} icon={Landmark} />
      <KpiCard label="Active budgets" value={budgets ?? 0} icon={TrendingUp} />
      <KpiCard label="Compliance" value="OK" icon={ShieldCheck} tone="success" />
    </KpiGrid>
  );
}

export function JournalStatusBadge({ status }: { status: string }) {
  const tone =
    status === "posted" ? "default" :
    status === "voided" || status === "reversed" ? "destructive" :
    status === "draft" ? "secondary" :
    "outline";
  return <Badge variant={tone as never}>{status}</Badge>;
}

export function FinanceShell({ children }: { children: ReactNode }) {
  return (
    <PermissionGuard
      permissions={["finance:read", "finance:write", "finance:post_journal", "finance:approve_expense"]}
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You don&apos;t have permission to access the Finance workspace.
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <FinanceHeader />
        <FinanceSidebar />
        {children}
      </div>
    </PermissionGuard>
  );
}
