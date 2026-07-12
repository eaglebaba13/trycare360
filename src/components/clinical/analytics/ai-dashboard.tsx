import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, ThumbsUp, ThumbsDown, Gauge, Timer, Cpu, DollarSign, AlertTriangle } from "lucide-react";

export interface ClinicalAiInput {
  assistantUsage: number;
  recommendationsTotal: number;
  accepted: number;
  rejected: number;
  suggested: number;
  acceptanceRate: number;
  rejectionRate: number;
  recommendationQuality: number;
  avgLatencyMs: number;
  totalTokens: number;
  estimatedCostUsd: number;
  promptUsage: Array<{ code: string; count: number }>;
  errorRate: number;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ClinicalAiDashboard({ data }: { data: ClinicalAiInput }) {
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Assistant Usage" value={data.assistantUsage} icon={Sparkles} tone="info" />
        <KpiCard label="Recommendations" value={data.recommendationsTotal} icon={Sparkles} />
        <KpiCard label="Acceptance Rate" value={pct(data.acceptanceRate)} icon={ThumbsUp} tone="success" hint={`${data.accepted} accepted`} />
        <KpiCard label="Rejection Rate" value={pct(data.rejectionRate)} icon={ThumbsDown} tone="warning" hint={`${data.rejected} rejected`} />
        <KpiCard label="Recommendation Quality" value={data.recommendationQuality ? data.recommendationQuality.toFixed(2) : "—"} icon={Gauge} hint="avg confidence" />
        <KpiCard label="Model Latency" value={`${data.avgLatencyMs} ms`} icon={Timer} />
        <KpiCard label="Token Consumption" value={data.totalTokens.toLocaleString()} icon={Cpu} />
        <KpiCard label="Estimated Cost" value={`$${data.estimatedCostUsd.toFixed(4)}`} icon={DollarSign} />
      </KpiGrid>

      {data.errorRate > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>Model error rate: <strong>{pct(data.errorRate)}</strong> — inspect the Gateway logs.</span>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Prompt Usage</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Prompt Template</TableHead><TableHead className="text-right">Calls</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.promptUsage.length === 0 && (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No assistant activity in this window.</TableCell></TableRow>
              )}
              {data.promptUsage.map((p) => (
                <TableRow key={p.code}>
                  <TableCell className="font-mono text-xs">{p.code}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
