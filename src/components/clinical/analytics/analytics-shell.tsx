/**
 * ClinicalAnalyticsShell — thin wrapper that renders the shared date
 * window picker + CSV export. Each tab feeds its own rows in.
 */
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { downloadCsv } from "@/lib/analytics/csv";
import type { ClinicalWindow } from "./use-clinical-window";

export function ClinicalAnalyticsShell({
  window,
  onChange,
  onReset,
  exportRows,
  exportName,
  children,
}: {
  window: ClinicalWindow;
  onChange: (p: Partial<ClinicalWindow>) => void;
  onReset: () => void;
  exportRows?: Record<string, unknown>[];
  exportName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={window.from} onChange={(e) => onChange({ from: e.target.value })} className="h-9 w-[140px]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={window.to} onChange={(e) => onChange({ to: e.target.value })} className="h-9 w-[140px]" />
        </div>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
        {exportRows && exportRows.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => downloadCsv(exportName ?? "clinical-analytics", exportRows)}>
            <Download className="h-4 w-4 mr-1" />CSV
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
