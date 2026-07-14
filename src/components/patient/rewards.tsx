/** Patient Portal — Rewards workspace. */
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataGrid } from "@/components/standards/data-grid";
import { listAvailableRewards, redeemReward } from "@/lib/patient/loyalty.functions";
import { formatDateTime } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Reward = { id: string; name: string; description: string | null; points_cost: number; category?: string | null; image_url?: string | null };
type Redemption = { id: string; reward_id: string; reward_name?: string | null; points: number; status: string; created_at: string };

export function RewardCard({ reward }: { reward: Reward }) {
  const qc = useQueryClient();
  const fn = useServerFn(redeemReward);
  const mut = useMutation({
    mutationFn: () => fn({ data: { rewardId: reward.id } }),
    onSuccess: () => { toast.success("Redemption requested"); qc.invalidateQueries({ queryKey: ["patient-loyalty"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-1.5"><Gift className="h-4 w-4" />{reward.name}</CardTitle>
          <Badge variant="outline">{reward.points_cost} pts</Badge>
        </div>
        {reward.description && <p className="text-xs text-muted-foreground">{reward.description}</p>}
      </CardHeader>
      <CardContent>
        <Button size="sm" onClick={() => mut.mutate()} disabled={mut.isPending}>Redeem</Button>
      </CardContent>
    </Card>
  );
}

export function RewardsCatalogue() {
  const fn = useServerFn(listAvailableRewards);
  const q = useQuery<Reward[]>({ queryKey: ["patient-rewards-catalog"], queryFn: () => fn({ data: {} }) as unknown as Promise<Reward[]> });
  const rows = q.data ?? [];
  if (rows.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">No rewards available.</div>;
  return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{rows.map((r) => <RewardCard key={r.id} reward={r} />)}</div>;
}

export function RewardHistory({ items }: { items: Redemption[] }) {
  return (
    <DataGrid
      rows={items}
      getRowId={(r) => r.id}
      emptyMessage="No redemptions yet."
      columns={[
        { id: "when", header: "When", cell: (r) => formatDateTime(r.created_at) },
        { id: "name", header: "Reward", cell: (r) => r.reward_name ?? r.reward_id },
        { id: "pts", header: "Points", cell: (r) => r.points, className: "text-right tabular-nums" },
        { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
    />
  );
}

export function PatientRewardsPage() {
  return (
    <PatientShell title="Rewards" description="Redeem your loyalty points.">
      <RewardsCatalogue />
    </PatientShell>
  );
}
