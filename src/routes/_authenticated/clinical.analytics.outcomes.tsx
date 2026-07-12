import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalOutcomes } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import { OutcomeDashboard } from "@/components/clinical/analytics/outcome-dashboard";

export const Route = createFileRoute("/_authenticated/clinical/analytics/outcomes")({
  component: OutcomesTab,
});

function OutcomesTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalOutcomes);
  const [win, patch, reset] = useClinicalWindow();

  const q = useQuery({
    queryKey: ["clinical-outcomes", activeTenantId, win.from, win.to],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });

  const data = q.data ?? {
    totalPlans: 0, completedPlans: 0, activePlans: 0, droppedPlans: 0,
    treatmentSuccess: 0, recoveryRate: 0, repeatVisitRate: 0, followupCompletion: 0,
    dropOff: 0, protocolCompliance: 1,
  };

  return (
    <ClinicalAnalyticsShell window={win} onChange={patch} onReset={reset}>
      <OutcomeDashboard data={data} />
    </ClinicalAnalyticsShell>
  );
}
