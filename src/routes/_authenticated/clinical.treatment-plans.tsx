/**
 * /clinical/treatment-plans — enterprise list view. Requires ?patientId=
 * to focus on a specific patient (reuse ClinicalWorkspaceShell). Without
 * a patientId this route lists active plans across the tenant.
 */
import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClinicalHeader,
  ClinicalWorkspaceShell,
  NoPatientSelected,
} from "@/components/clinical/workspace-shell";
import { TreatmentPlanPanel } from "@/components/clinical/treatment-plan-panel";
import { useClinicalContext } from "@/components/clinical/use-clinical-context";
import { useTenant } from "@/hooks/use-tenant";
import { listActiveTreatmentPlans } from "@/lib/clinical/stage4.functions";
import { formatDate } from "@/lib/standards-format";

const search = z.object({ patientId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/clinical/treatment-plans")({
  validateSearch: (s) => search.parse(s),
  component: TreatmentPlansRoute,
});

function TreatmentPlansRoute() {
  const { patientId } = useSearch({ from: "/_authenticated/clinical/treatment-plans" });
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <NoPatientSelected />;
  if (patientId) return <FocusedView tenantId={activeTenantId} patientId={patientId} />;
  return <TenantList tenantId={activeTenantId} />;
}

function FocusedView({ tenantId, patientId }: { tenantId: string; patientId: string }) {
  const ctxQ = useClinicalContext({ tenantId, personId: patientId });
  return (
    <ClinicalWorkspaceShell
      ctx={ctxQ.data}
      isLoading={ctxQ.isLoading}
      header={<ClinicalHeader title="Treatment Plans" subtitle="Patient plans and progress" />}
      center={
        ctxQ.data ? (
          <TreatmentPlanPanel ctx={ctxQ.data} tenantId={tenantId} />
        ) : null
      }
    />
  );
}

function TenantList({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listActiveTreatmentPlans);
  const q = useQuery({
    queryKey: ["clinical-treatment-plans", tenantId],
    queryFn: () => fn({ data: { tenantId, limit: 100 } }),
  });
  return (
    <PageContainer
      title="Treatment Plans"
      description="All active and draft treatment plans across this tenant."
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Active plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {q.data?.rows.length === 0 && (
            <p className="text-xs text-muted-foreground">No active plans yet.</p>
          )}
          <ul className="divide-y">
            {(q.data?.rows ?? []).map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <Link
                    to="/clinical/treatment-plans"
                    search={{ patientId: p.patient_id }}
                    className="font-medium hover:underline truncate block"
                  >
                    {p.title}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {p.diagnosis || "No diagnosis"} · started {formatDate(p.start_date ?? p.created_at)}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">{p.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
