/** Patient Portal — Loyalty workspace. */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import { getMyLoyaltyAccount, listLoyaltyTransactions } from "@/lib/patient/loyalty.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Account = { points: number; tier: string | null; lifetime_points?: number | null } | null;
type Tx = { id: string; points: number; direction: string; reason: string | null; created_at: string };

export function LoyaltyDashboard() {
  const fn = useServerFn(getMyLoyaltyAccount);
  const q = useQuery({ queryKey: ["patient-loyalty"], queryFn: () => fn({}) as unknown as Promise<{ account: Account }> });
  const a = q.data?.account;
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Loyalty Account</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-semibold tabular-nums">{(a?.points ?? 0).toLocaleString()}</div>
          <span className="text-xs text-muted-foreground">points</span>
        </div>
        {a?.tier && <Badge variant="outline" className="mt-2">Tier: {a.tier}</Badge>}
        {a?.lifetime_points != null && (
          <div className="mt-1 text-xs text-muted-foreground">Lifetime: {a.lifetime_points.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function PointsHistory() {
  const fn = useServerFn(listLoyaltyTransactions);
  const q = useQuery<Tx[]>({ queryKey: ["patient-loyalty-tx"], queryFn: () => fn({ data: {} }) as unknown as Promise<Tx[]> });
  return (
    <DataGrid
      rows={q.data ?? []}
      getRowId={(r) => r.id}
      isLoading={q.isLoading}
      emptyMessage="No point activity yet."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.created_at) },
        { id: "dir", header: "Direction", cell: (r) => <Badge variant="outline">{r.direction}</Badge> },
        { id: "pts", header: "Points", cell: (r) => r.points.toLocaleString(), className: "text-right tabular-nums" },
        { id: "reason", header: "Reason", cell: (r) => r.reason ?? "—" },
      ]}
    />
  );
}

export function PatientLoyaltyPage() {
  return (
    <PatientShell title="Loyalty" description="Points, tiers and activity.">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <LoyaltyDashboard />
        <Card><CardHeader><CardTitle className="text-sm">Points History</CardTitle></CardHeader><CardContent><PointsHistory /></CardContent></Card>
      </div>
    </PatientShell>
  );
}
