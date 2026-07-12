import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { getClinicalExecutiveKpis } from "@/lib/clinical/stage6.functions";
import { ClinicalAnalyticsShell } from "@/components/clinical/analytics/analytics-shell";
import { useClinicalWindow } from "@/components/clinical/analytics/use-clinical-window";
import { ClinicalKpiBar } from "@/components/clinical/analytics/kpi-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/clinical/analytics/")({
  component: ExecutiveTab,
});

function ExecutiveTab() {
  const { activeTenantId } = useTenant();
  const fn = useServerFn(getClinicalExecutiveKpis);
  const [win, patch, reset] = useClinicalWindow();

  const q = useQuery({
    queryKey: ["clinical-exec", activeTenantId, win.from, win.to],
    queryFn: () => fn({ data: { tenantId: activeTenantId!, from: win.from, to: win.to } }),
    enabled: !!activeTenantId,
  });

  const data = q.data;
  const kpis = data ?? {
    dailyConsultations: 0, completedEncounters: 0, openEncounters: 0, treatmentPlans: 0,
    activePrescriptions: 0, followupsDue: 0, referralVolume: 0, aiUsage: 0, totalEncounters: 0, trend: [],
  };

  return (
    <ClinicalAnalyticsShell
      window={win}
      onChange={patch}
      onReset={reset}
      exportRows={kpis.trend as unknown as Record<string, unknown>[]}
      exportName="clinical-executive-trend"
    >
      <ClinicalKpiBar kpis={kpis} />
      <Card className="mt-4">
        <CardHeader><CardTitle>Encounter Volume Trend</CardTitle></CardHeader>
        <CardContent style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpis.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </ClinicalAnalyticsShell>
  );
}
