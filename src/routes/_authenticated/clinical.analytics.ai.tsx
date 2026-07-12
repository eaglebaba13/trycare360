import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalAiKpis } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import { ClinicalAiDashboard } from "@/components/clinical/analytics/ai-dashboard";

export const Route = createFileRoute("/_authenticated/clinical/analytics/ai")({
  component: AiTab,
});

function AiTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalAiKpis);
  const [win, patch, reset] = useClinicalWindow();

  const q = useQuery({
    queryKey: ["clinical-ai-kpis", activeTenantId, win.from, win.to],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });

  const data = q.data ?? {
    assistantUsage: 0, recommendationsTotal: 0, accepted: 0, rejected: 0, suggested: 0,
    acceptanceRate: 0, rejectionRate: 0, recommendationQuality: 0, avgLatencyMs: 0,
    totalTokens: 0, estimatedCostUsd: 0, promptUsage: [], errorRate: 0,
  };

  return (
    <ClinicalAnalyticsShell
      window={win}
      onChange={patch}
      onReset={reset}
      exportRows={data.promptUsage as unknown as Record<string, unknown>[]}
      exportName="clinical-ai-prompt-usage"
    >
      <ClinicalAiDashboard data={data} />
    </ClinicalAnalyticsShell>
  );
}
