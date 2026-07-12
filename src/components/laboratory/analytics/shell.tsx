/**
 * Laboratory Analytics — shared shell, KPI bar and filter primitives.
 *
 * READ-ONLY. Every value shown here comes from Stage 2 / Stage 6 server
 * functions. No SQL, no engines, no KPI math. Formulas live in
 * src/lib/analytics/kpi-definitions.md (Laboratory Phase 2.8 section).
 */
import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PermissionGuard } from "@/components/permission-guard";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Beaker,
  ClipboardCheck,
  ShieldCheck,
  Radiation,
  TimerReset,
  FlaskConical,
  Building2,
  Send,
  IndianRupee,
  AlertTriangle,
  Sparkles,
  Microscope,
} from "lucide-react";

export const LAB_ANALYTICS_TABS = [
  { to: "/laboratory/analytics", label: "Executive", exact: true },
  { to: "/laboratory/analytics/orders", label: "Orders" },
  { to: "/laboratory/analytics/turnaround", label: "Turnaround" },
  { to: "/laboratory/analytics/specimens", label: "Specimens" },
  { to: "/laboratory/analytics/analyzers", label: "Analyzers" },
  { to: "/laboratory/analytics/quality", label: "Quality" },
  { to: "/laboratory/analytics/verification", label: "Verification" },
  { to: "/laboratory/analytics/distribution", label: "Distribution" },
  { to: "/laboratory/analytics/external", label: "External Labs" },
  { to: "/laboratory/analytics/radiology", label: "Radiology" },
  { to: "/laboratory/analytics/pathology", label: "Pathology" },
  { to: "/laboratory/analytics/microbiology", label: "Microbiology" },
  { to: "/laboratory/analytics/financial", label: "Financial" },
  { to: "/laboratory/analytics/compliance", label: "Compliance" },
  { to: "/laboratory/analytics/ai", label: "AI" },
  { to: "/laboratory/analytics/reports", label: "Reports" },
];

export function LaboratoryAnalyticsShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <PermissionGuard
      permissions={["lab:read", "lab:manage", "analytics:read"]}
      fallback={
        <div className="p-8 text-sm text-muted-foreground">
          You don&apos;t have permission to view Laboratory Analytics.
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laboratory Analytics &amp; BI</h1>
          <p className="text-sm text-muted-foreground">
            Executive, operational, quality, compliance and AI insight — sourced from
            Stage 2 laboratory engines and the shared Analytics Engine. All KPIs follow
            the locked KPI Dictionary (Laboratory Phase 2.8 section); no client-side
            formulas.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b">
          {LAB_ANALYTICS_TABS.map((t) => {
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
// Filters
// ---------------------------------------------------------------------------
export type LabAnalyticsFilters = {
  from: string;
  to: string;
  branchId: string;
  franchiseId: string;
  departmentId: string;
  analyzerId: string;
};

export function useLaboratoryAnalyticsWindow(): [
  LabAnalyticsFilters,
  (patch: Partial<LabAnalyticsFilters>) => void,
] {
  const [f, setF] = useState<LabAnalyticsFilters>({
    from: "",
    to: "",
    branchId: "",
    franchiseId: "",
    departmentId: "",
    analyzerId: "",
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

function IdFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input placeholder={`${label} ID`} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export const BranchFilter = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <IdFilter label="Branch" value={value} onChange={onChange} />
);
export const FranchiseFilter = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <IdFilter label="Franchise" value={value} onChange={onChange} />
);
export const DepartmentFilter = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <IdFilter label="Department" value={value} onChange={onChange} />
);
export const AnalyzerFilter = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <IdFilter label="Analyzer" value={value} onChange={onChange} />
);

export function LaboratoryFilterBar({
  filters,
  patch,
}: {
  filters: LabAnalyticsFilters;
  patch: (p: Partial<LabAnalyticsFilters>) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <DateWindowPicker from={filters.from} to={filters.to} onChange={patch} />
      <BranchFilter value={filters.branchId} onChange={(v) => patch({ branchId: v })} />
      <FranchiseFilter value={filters.franchiseId} onChange={(v) => patch({ franchiseId: v })} />
      <DepartmentFilter value={filters.departmentId} onChange={(v) => patch({ departmentId: v })} />
      <AnalyzerFilter value={filters.analyzerId} onChange={(v) => patch({ analyzerId: v })} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI bar
// ---------------------------------------------------------------------------
export interface LaboratoryExecutiveKpiInput {
  orders: number;
  completed: number;
  pending: number;
  released: number;
  critical: number;
  meanTat: number | null;
  qcRecent: number;
  externalShare: number;
  distributionSuccess: number;
  revenue: number;
  insuranceShare: number;
  aiUsage: number;
}

export function LaboratoryKpiBar({ kpis }: { kpis: LaboratoryExecutiveKpiInput }) {
  return (
    <KpiGrid>
      <KpiCard label="Orders" value={fmtNum(kpis.orders)} icon={Beaker} tone="info" />
      <KpiCard label="Completed" value={fmtNum(kpis.completed)} icon={ClipboardCheck} tone="success" />
      <KpiCard label="Pending" value={fmtNum(kpis.pending)} icon={TimerReset} tone="warning" />
      <KpiCard label="Released" value={fmtNum(kpis.released)} icon={ShieldCheck} tone="success" />
      <KpiCard label="Critical" value={fmtNum(kpis.critical)} icon={Radiation} tone="danger" />
      <KpiCard label="Mean TAT (min)" value={kpis.meanTat != null ? kpis.meanTat.toFixed(0) : "—"} icon={TimerReset} />
      <KpiCard label="QC runs" value={fmtNum(kpis.qcRecent)} icon={FlaskConical} />
      <KpiCard label="External Lab %" value={fmtPct(kpis.externalShare)} icon={Building2} />
      <KpiCard label="Distribution Success" value={fmtPct(kpis.distributionSuccess)} icon={Send} tone="success" />
      <KpiCard label="Revenue" value={fmtCurrency(kpis.revenue)} icon={IndianRupee} />
      <KpiCard label="Insurance %" value={fmtPct(kpis.insuranceShare)} icon={AlertTriangle} tone="info" />
      <KpiCard label="AI Turns" value={fmtNum(kpis.aiUsage)} icon={Sparkles} tone="info" />
    </KpiGrid>
  );
}

export function KpiCards({ items }: { items: Array<{ label: string; value: string | number; icon?: React.ComponentType<{ className?: string }>; tone?: "info" | "success" | "warning" | "danger" }> }) {
  return (
    <KpiGrid>
      {items.map((it) => (
        <KpiCard key={it.label} label={it.label} value={it.value} icon={it.icon ?? Microscope} tone={it.tone} />
      ))}
    </KpiGrid>
  );
}

// ---------------------------------------------------------------------------
// Formatters (display only)
// ---------------------------------------------------------------------------
export function fmtNum(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString();
}
export function fmtCurrency(n: number | null | undefined) {
  return `₹${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
export function fmtPct(n: number | null | undefined) {
  return `${(Number(n ?? 0) * 100).toFixed(1)}%`;
}
