/**
 * Commission Rule Manager — plans, versions, rules, assignments.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import {
  listPlans,
  listRules,
  listAssignments,
  listPlanVersions,
  listBeneficiaryTypes,
} from "@/lib/commissions/commissions.functions";

export const Route = createFileRoute("/_authenticated/revenue/plans")({
  component: RuleManager,
});

function RuleManager() {
  const { activeTenantId } = useTenant();
  const plansFn = useServerFn(listPlans);
  const rulesFn = useServerFn(listRules);
  const asgFn = useServerFn(listAssignments);
  const versFn = useServerFn(listPlanVersions);
  const btFn = useServerFn(listBeneficiaryTypes);

  const [planId, setPlanId] = useState<string | null>(null);

  const plansQ = useQuery({
    queryKey: ["plans", activeTenantId],
    queryFn: () => plansFn({ data: { tenant_id: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const btQ = useQuery({ queryKey: ["beneficiary-types"], queryFn: () => btFn() });
  const rulesQ = useQuery({
    queryKey: ["rules", activeTenantId, planId],
    queryFn: () => rulesFn({ data: { tenant_id: activeTenantId!, plan_id: planId ?? undefined } }),
    enabled: !!activeTenantId,
  });
  const asgQ = useQuery({
    queryKey: ["assignments", activeTenantId, planId],
    queryFn: () => asgFn({ data: { tenant_id: activeTenantId!, plan_id: planId ?? undefined } }),
    enabled: !!activeTenantId,
  });
  const versQ = useQuery({
    queryKey: ["plan-versions", activeTenantId, planId],
    queryFn: () => versFn({ data: { tenant_id: activeTenantId!, plan_id: planId ?? undefined } }),
    enabled: !!activeTenantId,
  });

  const plans = (plansQ.data?.rows ?? []) as any[];
  const rules = (rulesQ.data?.rows ?? []) as any[];
  const assignments = (asgQ.data?.rows ?? []) as any[];
  const versions = (versQ.data?.rows ?? []) as any[];
  const selected = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle className="text-base">Active Plans</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[600px] overflow-auto">
            {plans.map((p) => (
              <button key={p.id} onClick={() => setPlanId(p.id)}
                className={`w-full text-left rounded-md border p-2 text-xs hover:bg-muted/40 ${planId === p.id ? "border-primary bg-muted/40" : ""}`}>
                <div className="flex justify-between">
                  <span className="font-medium truncate">{p.name}</span>
                  <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                </div>
                <div className="text-muted-foreground mt-1">
                  {p.beneficiary_type} · v{p.version} · {p.currency}
                </div>
              </button>
            ))}
            {plans.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No plans yet.</div>}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? `${selected.name} — v${selected.version}` : "Plan Detail"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selected && <div className="text-sm text-muted-foreground">Select a plan.</div>}
            {selected && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><div className="text-xs text-muted-foreground">Beneficiary</div><div>{selected.beneficiary_type}</div></div>
                <div><div className="text-xs text-muted-foreground">Currency</div><div>{selected.currency}</div></div>
                <div><div className="text-xs text-muted-foreground">Effective</div><div>{selected.effective_from ? new Date(selected.effective_from).toLocaleDateString() : "—"} → {selected.effective_to ? new Date(selected.effective_to).toLocaleDateString() : "open"}</div></div>
                <div><div className="text-xs text-muted-foreground">Status</div><Badge>{selected.status}</Badge></div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Calculation Rules</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[360px] overflow-auto">
                {rules.map((r) => (
                  <div key={r.id} className="border rounded-md p-2 text-xs">
                    <div className="flex justify-between">
                      <Badge variant="secondary">{r.calc_kind}</Badge>
                      <span className="text-muted-foreground">priority {r.priority}</span>
                    </div>
                    <pre className="mt-1 text-[10px] bg-muted/40 p-2 rounded overflow-auto">
{JSON.stringify(r.calc_config, null, 2)}
                    </pre>
                  </div>
                ))}
                {rules.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No rules.</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Beneficiary Assignments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[360px] overflow-auto">
                {assignments.map((a) => (
                  <div key={a.id} className="border rounded-md p-2 text-xs">
                    <div className="flex justify-between">
                      <Badge variant="outline">{a.beneficiary_type}</Badge>
                      <span>{a.split_pct != null ? `${a.split_pct}%` : "100%"}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 font-mono truncate">{a.beneficiary_id}</div>
                    <div className="text-muted-foreground mt-1">Scope: {a.entity_scope}</div>
                  </div>
                ))}
                {assignments.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No assignments.</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Version History</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="p-2 text-left">Version</th>
                    <th className="p-2 text-left">Plan</th>
                    <th className="p-2 text-left">Snapshotted</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="p-2 font-mono">v{v.version}</td>
                      <td className="p-2 font-mono text-xs">{v.plan_id}</td>
                      <td className="p-2 text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {versions.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">No versions.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Beneficiary Types Catalog</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(btQ.data?.rows ?? []).map((b: any) => (
                <Badge key={b.code} variant="outline">{b.label ?? b.code}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
