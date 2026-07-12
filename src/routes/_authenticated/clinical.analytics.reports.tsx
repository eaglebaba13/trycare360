import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { subDays, startOfWeek, startOfMonth } from "date-fns";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalReport } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import {
  ClinicalReportsPanel,
  type ClinicalReportGroupBy,
  type ClinicalReportPreset,
} from "@/components/clinical/analytics/reports-panel";

export const Route = createFileRoute("/_authenticated/clinical/analytics/reports")({
  component: ReportsTab,
});

function ReportsTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalReport);
  const [win, patch, reset] = useClinicalWindow();
  const [preset, setPreset] = useState<ClinicalReportPreset>("custom");
  const [groupBy, setGroupBy] = useState<ClinicalReportGroupBy>("day");

  const applyPreset = (p: ClinicalReportPreset) => {
    setPreset(p);
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (p === "daily") patch({ from: iso(now), to: iso(now) });
    else if (p === "weekly") patch({ from: iso(startOfWeek(now)), to: iso(now) });
    else if (p === "monthly") patch({ from: iso(startOfMonth(now)), to: iso(now) });
    else patch({ from: iso(subDays(now, 30)), to: iso(now) });
  };

  const q = useQuery({
    queryKey: ["clinical-report", activeTenantId, win.from, win.to, groupBy],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to, groupBy } }),
    enabled: !!activeTenantId,
  });

  const rows = q.data?.rows ?? [];
  const totals = q.data?.totals ?? { encounters: 0, plans: 0, prescriptions: 0 };

  return (
    <ClinicalAnalyticsShell window={win} onChange={patch} onReset={reset}>
      <ClinicalReportsPanel
        preset={preset}
        onPreset={applyPreset}
        groupBy={groupBy}
        onGroupBy={setGroupBy}
        rows={rows}
        totals={totals}
      />
    </ClinicalAnalyticsShell>
  );
}
