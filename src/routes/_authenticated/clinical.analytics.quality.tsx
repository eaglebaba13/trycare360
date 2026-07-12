import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalQuality } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import { QualityDashboard } from "@/components/clinical/analytics/quality-dashboard";

export const Route = createFileRoute("/_authenticated/clinical/analytics/quality")({
  component: QualityTab,
});

function QualityTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalQuality);
  const [win, patch, reset] = useClinicalWindow();

  const q = useQuery({
    queryKey: ["clinical-quality", activeTenantId, win.from, win.to],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });

  const data = q.data ?? {
    closedEncounters: 0, incompleteSoap: 0, unsignedNotes: 0, missingConsent: 0,
    overdueFollowups: 0, missingVitals: 0, missingDiagnosis: 0, openProblems: 0, duplicateProblems: 0,
  };

  return (
    <ClinicalAnalyticsShell window={win} onChange={patch} onReset={reset}>
      <QualityDashboard data={data} />
    </ClinicalAnalyticsShell>
  );
}
