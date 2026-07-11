/**
 * Commission Audit — calculation, version, and approval history.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { listCommissionAuditLogs, listPlanVersions } from "@/lib/commissions/commissions.functions";

export const Route = createFileRoute("/_authenticated/revenue/audit")({
  component: AuditPage,
});

function AuditPage() {
  const { activeTenantId } = useTenant();
  const logFn = useServerFn(listCommissionAuditLogs);
  const versFn = useServerFn(listPlanVersions);

  const logsQ = useQuery({
    queryKey: ["commission-audit", activeTenantId],
    queryFn: () => logFn({ data: { tenant_id: activeTenantId!, limit: 200 } }),
    enabled: !!activeTenantId,
  });
  const versQ = useQuery({
    queryKey: ["all-plan-versions", activeTenantId],
    queryFn: () => versFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const logs = (logsQ.data?.rows ?? []) as any[];
  const versions = (versQ.data?.rows ?? []) as any[];
  const approvals = logs.filter((l) => l.action?.startsWith("accrual."));
  const calcs = logs.filter((l) => l.action?.startsWith("rule.") || l.action?.startsWith("plan."));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Approval History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[560px] overflow-auto">
            {approvals.map((l) => (
              <div key={l.id} className="border rounded-md p-2 text-xs">
                <div className="flex justify-between">
                  <Badge variant="outline">{l.action}</Badge>
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground mt-1 font-mono truncate">Accrual: {l.accrual_id ?? "—"}</div>
              </div>
            ))}
            {approvals.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No approval events.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Calculation History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[560px] overflow-auto">
            {calcs.map((l) => (
              <div key={l.id} className="border rounded-md p-2 text-xs">
                <div className="flex justify-between">
                  <Badge variant="secondary">{l.action}</Badge>
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground mt-1 font-mono truncate">Plan: {l.plan_id ?? "—"}</div>
              </div>
            ))}
            {calcs.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No calculation events.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Version History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[560px] overflow-auto">
            {versions.map((v) => (
              <div key={v.id} className="border rounded-md p-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono">v{v.version}</span>
                  <span className="text-muted-foreground">{new Date(v.created_at).toLocaleString()}</span>
                </div>
                <div className="text-muted-foreground mt-1 font-mono truncate">Plan: {v.plan_id}</div>
              </div>
            ))}
            {versions.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No versions snapshotted.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
