/**
 * Pharmacy Analytics — shared shell, KPI bar, and filter primitives.
 *
 * Read-only analytics. No SQL, no engines, no KPI math. All numbers come
 * from Stage 2 pharmacy server functions (analytics + list) and are only
 * formatted/aggregated for display. Formulas live in the KPI Dictionary
 * (src/lib/analytics/kpi-definitions.md).
 */
import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Package,
  PackageCheck,
  Lock,
  Repeat,
  TrendingDown,
  AlertTriangle,
  CalendarX,
  IndianRupee,
  ShoppingCart,
  ShieldAlert,
  Thermometer,
  Sparkles,
} from "lucide-react";

export const ANALYTICS_TABS = [
  { to: "/pharmacy/analytics", label: "Executive", exact: true },
  { to: "/pharmacy/analytics/inventory", label: "Inventory" },
  { to: "/pharmacy/analytics/dispensing", label: "Dispensing" },
  { to: "/pharmacy/analytics/procurement", label: "Procurement" },
  { to: "/pharmacy/analytics/suppliers", label: "Suppliers" },
  { to: "/pharmacy/analytics/expiry", label: "Expiry" },
  { to: "/pharmacy/analytics/controlled", label: "Controlled" },
  { to: "/pharmacy/analytics/coldchain", label: "Cold Chain" },
  { to: "/pharmacy/analytics/forecasting", label: "Forecasting" },
  { to: "/pharmacy/analytics/reports", label: "Reports" },
];

export function PharmacyAnalyticsShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard
      permissions={["pharmacy:read", "pharmacy:manage", "analytics:read"]}
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You don&apos;t have permission to access Pharmacy Analytics.
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pharmacy Analytics & BI</h1>
          <p className="text-sm text-muted-foreground">
            Executive, operational and safety analytics — sourced from Stage 2 pharmacy engines
            and the shared Analytics Engine. All KPIs follow the locked KPI Dictionary
            (src/lib/analytics/kpi-definitions.md); no client-side formulas.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b">
          {ANALYTICS_TABS.map((t) => {
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
        {children}
      </div>
    </PermissionGuard>
  );
}

// ---------------------------------------------------------------------------
// Filters — value collectors only, no side-effects on server logic.
// ---------------------------------------------------------------------------
export type AnalyticsFilters = {
  from: string;
  to: string;
  branchId: string;
  franchiseId: string;
  warehouseId: string;
};

export function useAnalyticsFilters(): [AnalyticsFilters, (patch: Partial<AnalyticsFilters>) => void] {
  const [f, setF] = useState<AnalyticsFilters>({
    from: "",
    to: "",
    branchId: "",
    franchiseId: "",
    warehouseId: "",
  });
  return [f, (patch) => setF((prev) => ({ ...prev, ...patch }))];
}

export function DateWindowPicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (patch: { from?: string; to?: string }) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={from} onChange={(e) => onChange({ from: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={to} onChange={(e) => onChange({ to: e.target.value })} />
      </div>
    </div>
  );
}

export function BranchFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Branch</Label>
      <Input placeholder="Branch ID" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function FranchiseFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Franchise</Label>
      <Input placeholder="Franchise ID" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function WarehouseFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">Warehouse</Label>
      <Input placeholder="Warehouse ID" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function PharmacyFilterBar({
  filters,
  patch,
}: {
  filters: AnalyticsFilters;
  patch: (p: Partial<AnalyticsFilters>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <DateWindowPicker from={filters.from} to={filters.to} onChange={patch} />
      <BranchFilter value={filters.branchId} onChange={(v) => patch({ branchId: v })} />
      <FranchiseFilter value={filters.franchiseId} onChange={(v) => patch({ franchiseId: v })} />
      <WarehouseFilter value={filters.warehouseId} onChange={(v) => patch({ warehouseId: v })} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Executive KPI bar — displays server-provided values only.
// ---------------------------------------------------------------------------
export interface PharmacyExecutiveKpiInput {
  inventoryValue: number;
  availableStock: number;
  reservedStock: number;
  inventoryTurns: number;
  deadStockPct: number;
  nearExpiryValue: number;
  expiredValue: number;
  dispenseRevenue: number;
  purchaseValue: number;
  controlledVariance: number;
  coldChainExcursions: number;
  forecastAccuracy: number;
}

export function PharmacyKpiBar({ kpis }: { kpis: PharmacyExecutiveKpiInput }) {
  return (
    <KpiGrid>
      <KpiCard label="Inventory Value" value={fmtCurrency(kpis.inventoryValue)} icon={IndianRupee} />
      <KpiCard label="Available Stock" value={fmtNum(kpis.availableStock)} icon={Package} tone="success" />
      <KpiCard label="Reserved Stock" value={fmtNum(kpis.reservedStock)} icon={Lock} tone="info" />
      <KpiCard label="Inventory Turns" value={kpis.inventoryTurns.toFixed(2)} icon={Repeat} />
      <KpiCard label="Dead Stock %" value={fmtPct(kpis.deadStockPct)} icon={TrendingDown} tone="warning" />
      <KpiCard label="Near Expiry Value" value={fmtCurrency(kpis.nearExpiryValue)} icon={AlertTriangle} tone="warning" />
      <KpiCard label="Expired Value" value={fmtCurrency(kpis.expiredValue)} icon={CalendarX} tone="danger" />
      <KpiCard label="Dispense Revenue" value={fmtCurrency(kpis.dispenseRevenue)} icon={PackageCheck} tone="success" />
      <KpiCard label="Purchase Value" value={fmtCurrency(kpis.purchaseValue)} icon={ShoppingCart} />
      <KpiCard label="Controlled Variance" value={fmtNum(kpis.controlledVariance)} icon={ShieldAlert} tone="danger" />
      <KpiCard label="Cold Chain Excursions" value={fmtNum(kpis.coldChainExcursions)} icon={Thermometer} tone="warning" />
      <KpiCard label="Forecast Accuracy" value={fmtPct(kpis.forecastAccuracy)} icon={Sparkles} tone="info" />
    </KpiGrid>
  );
}

// ---------------------------------------------------------------------------
// Display formatters (no business logic)
// ---------------------------------------------------------------------------
export function fmtNum(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString();
}
export function fmtCurrency(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `₹${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
export function fmtPct(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `${(v * 100).toFixed(1)}%`;
}
