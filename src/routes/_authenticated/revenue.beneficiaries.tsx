/**
 * Beneficiary Workspace — accruals grouped by beneficiary type & id.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { listAccruals, listBeneficiaryTypes } from "@/lib/commissions/commissions.functions";

export const Route = createFileRoute("/_authenticated/revenue/beneficiaries")({
  component: Beneficiaries,
});

const TYPES = [
  "telecaller","sales_executive","doctor","therapist","branch","franchise",
  "master_franchise","referral","corporate","influencer",
];

function fmt(n: number, cur = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}

function Beneficiaries() {
  const { activeTenantId } = useTenant();
  const listFn = useServerFn(listAccruals);
  const btFn = useServerFn(listBeneficiaryTypes);
  const [type, setType] = useState<string>("telecaller");

  const btQ = useQuery({ queryKey: ["beneficiary-types"], queryFn: () => btFn() });
  const q = useQuery({
    queryKey: ["ben-accruals", activeTenantId, type],
    queryFn: () => listFn({ data: { tenant_id: activeTenantId!, beneficiary_type: type, limit: 500, offset: 0 } }),
    enabled: !!activeTenantId,
  });

  const grouped = useMemo(() => {
    const g: Record<string, { count: number; total: number; currency: string; last: string }> = {};
    for (const r of ((q.data?.rows ?? []) as any[])) {
      const k = r.beneficiary_id;
      if (!g[k]) g[k] = { count: 0, total: 0, currency: r.currency, last: r.computed_at };
      g[k].count++;
      g[k].total += Number(r.calc_amount);
      if (r.computed_at > g[k].last) g[k].last = r.computed_at;
    }
    return Object.entries(g).sort((a, b) => b[1].total - a[1].total);
  }, [q.data]);

  const catalogTypes = (btQ.data?.rows ?? []).map((r: any) => r.code as string);
  const typeList = catalogTypes.length ? catalogTypes : TYPES;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {typeList.map((t: string) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-xs hover:bg-muted/40 ${type === t ? "border-primary bg-muted/40 font-medium" : ""}`}
          >
            {t.replace("_", " ")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{type.replace("_"," ")} beneficiaries</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="p-2 text-left">Beneficiary ID</th>
                  <th className="p-2 text-right">Accruals</th>
                  <th className="p-2 text-right">Total Commission</th>
                  <th className="p-2 text-left">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(([id, s]) => (
                  <tr key={id} className="border-b hover:bg-muted/20">
                    <td className="p-2 font-mono text-xs">{id}</td>
                    <td className="p-2 text-right tabular-nums">{s.count}</td>
                    <td className="p-2 text-right tabular-nums font-medium">{fmt(s.total, s.currency)}</td>
                    <td className="p-2 text-xs text-muted-foreground">{new Date(s.last).toLocaleString()}</td>
                  </tr>
                ))}
                {grouped.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">No accruals for this beneficiary type.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
