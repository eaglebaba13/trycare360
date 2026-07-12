import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalDoctorPerformance } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import { DoctorPerformanceTable } from "@/components/clinical/analytics/doctor-performance-table";

export const Route = createFileRoute("/_authenticated/clinical/analytics/performance")({
  component: PerformanceTab,
});

function PerformanceTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalDoctorPerformance);
  const [win, patch, reset] = useClinicalWindow();

  const q = useQuery({
    queryKey: ["clinical-doc-perf", activeTenantId, win.from, win.to],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });

  const rows = q.data?.rows ?? [];

  return (
    <ClinicalAnalyticsShell
      window={win}
      onChange={patch}
      onReset={reset}
      exportRows={rows as unknown as Record<string, unknown>[]}
      exportName="clinical-doctor-performance"
    >
      <DoctorPerformanceTable rows={rows} />
    </ClinicalAnalyticsShell>
  );
}
