import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalCompliance } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import { ComplianceDashboard } from "@/components/clinical/analytics/compliance-dashboard";

export const Route = createFileRoute("/_authenticated/clinical/analytics/compliance")({
  component: ComplianceTab,
});

function ComplianceTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalCompliance);
  const [win, patch, reset] = useClinicalWindow();

  const q = useQuery({
    queryKey: ["clinical-compliance", activeTenantId, win.from, win.to],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });

  const data = q.data ?? {
    consentCompliance: 1, totalConsents: 0, signedConsents: 0, clinicalSignatures: 0,
    totalNotes: 0, documentationCompleteness: 1, auditEvents: 0, accessLogs: 0,
    clinicalRecordChanges: 0, rlsCompliance: 1,
  };

  return (
    <ClinicalAnalyticsShell window={win} onChange={patch} onReset={reset}>
      <ComplianceDashboard data={data} />
    </ClinicalAnalyticsShell>
  );
}
