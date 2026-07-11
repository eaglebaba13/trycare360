/**
 * Shared analytics filter bar + hook.
 * Purely client-side filtering over data fetched from existing server
 * functions (listLeads, listRevenueEvents, listAccruals, etc.).
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { downloadCsv } from "./csv";

export type AnalyticsFilters = {
  from: string;
  to: string;
  branch: string;
  franchise: string;
  campaign: string;
  source: string;
  doctor: string;
  telecaller: string;
  sales: string;
  treatment: string;
  membership: string;
};

const EMPTY: AnalyticsFilters = {
  from: "", to: "", branch: "", franchise: "", campaign: "",
  source: "", doctor: "", telecaller: "", sales: "", treatment: "", membership: "",
};

export function useAnalyticsFilters(): [AnalyticsFilters, (patch: Partial<AnalyticsFilters>) => void, () => void] {
  const [f, setF] = useState<AnalyticsFilters>(() => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - 30);
    return { ...EMPTY, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  });
  const patch = (p: Partial<AnalyticsFilters>) => setF((cur) => ({ ...cur, ...p }));
  const reset = () => setF({ ...EMPTY, from: "", to: "" });
  return [f, patch, reset];
}

export function applyAnalyticsFilter<T extends Record<string, unknown>>(
  rows: T[],
  f: AnalyticsFilters,
  keys: { date?: keyof T; branch?: keyof T; franchise?: keyof T; campaign?: keyof T; source?: keyof T; doctor?: keyof T; owner?: keyof T; treatment?: keyof T; membership?: keyof T } = {},
): T[] {
  return rows.filter((r) => {
    if (keys.date) {
      const d = String(r[keys.date] ?? "");
      if (f.from && d < f.from) return false;
      if (f.to && d.slice(0, 10) > f.to) return false;
    }
    for (const [ff, kk] of [
      ["branch", keys.branch], ["franchise", keys.franchise], ["campaign", keys.campaign],
      ["source", keys.source], ["doctor", keys.doctor], ["telecaller", keys.owner],
      ["sales", keys.owner], ["treatment", keys.treatment], ["membership", keys.membership],
    ] as const) {
      const v = f[ff as keyof AnalyticsFilters];
      if (v && kk && String(r[kk] ?? "") !== v) return false;
    }
    return true;
  });
}

export function AnalyticsFilterBar({
  filters, onChange, onReset, options, exportRows, exportName,
}: {
  filters: AnalyticsFilters;
  onChange: (p: Partial<AnalyticsFilters>) => void;
  onReset: () => void;
  options: Partial<Record<"branch" | "franchise" | "campaign" | "source" | "doctor" | "telecaller" | "sales" | "treatment" | "membership", { value: string; label: string }[]>>;
  exportRows?: Record<string, unknown>[];
  exportName?: string;
}) {
  const chips = useMemo(() => Object.entries(options).filter(([, v]) => v && v.length > 0), [options]);
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3 mb-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">From</label>
        <Input type="date" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} className="h-9 w-[140px]" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">To</label>
        <Input type="date" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} className="h-9 w-[140px]" />
      </div>
      {chips.map(([key, opts]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground capitalize">{key}</label>
          <Select value={filters[key as keyof AnalyticsFilters] || "__all"} onValueChange={(v) => onChange({ [key]: v === "__all" ? "" : v } as Partial<AnalyticsFilters>)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder={`All ${key}`} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All</SelectItem>
              {opts!.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
      {exportRows && (
        <Button variant="outline" size="sm" onClick={() => downloadCsv(exportName ?? "analytics", exportRows)}>
          <Download className="h-4 w-4 mr-1" />CSV
        </Button>
      )}
    </div>
  );
}

export function uniqueOptions<T extends Record<string, unknown>>(rows: T[], key: keyof T): { value: string; label: string }[] {
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[key];
    if (v != null && v !== "") set.add(String(v));
  }
  return [...set].sort().map((v) => ({ value: v, label: v }));
}
