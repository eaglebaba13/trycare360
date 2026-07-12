import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNearExpiryBatches } from "@/lib/pharmacy/analytics.functions";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Ban } from "lucide-react";
import { formatDate } from "@/lib/standards-format";

type BatchRow = {
  id: string;
  batch_no: string;
  expiry_date: string;
  manufacturer: string | null;
  status: string | null;
};

function bucketFor(expiry: string): "expired" | "30" | "60" | "90" | "180" | "365" {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days <= 30) return "30";
  if (days <= 60) return "60";
  if (days <= 90) return "90";
  if (days <= 180) return "180";
  return "365";
}

export function ExpiryHeatmap({ rows }: { rows: BatchRow[] }) {
  const buckets = useMemo(() => {
    const b = { expired: 0, "30": 0, "60": 0, "90": 0, "180": 0, "365": 0 };
    rows.forEach((r) => { b[bucketFor(r.expiry_date)]++; });
    return b;
  }, [rows]);
  const cells: Array<{ label: string; key: keyof typeof buckets; tone: string }> = [
    { label: "Expired", key: "expired", tone: "bg-rose-500/20 text-rose-700 dark:text-rose-300" },
    { label: "≤ 30 days", key: "30", tone: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
    { label: "31–60", key: "60", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
    { label: "61–90", key: "90", tone: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300" },
    { label: "91–180", key: "180", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
    { label: "181–365", key: "365", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Expiry heatmap</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {cells.map((c) => (
            <div key={c.key} className={`rounded-md p-3 ${c.tone}`}>
              <div className="text-[11px] uppercase tracking-wider opacity-80">{c.label}</div>
              <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{buckets[c.key]}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function NearExpiryPanel({ rows }: { rows: BatchRow[] }) {
  const near = rows.filter((r) => bucketFor(r.expiry_date) !== "365").slice(0, 20);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Near expiry (top 20)</CardTitle></CardHeader>
      <CardContent>
        {near.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No batches nearing expiry.</div>
        ) : (
          <ul className="divide-y">
            {near.map((b) => {
              const bucket = bucketFor(b.expiry_date);
              return (
                <li key={b.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate"><span className="font-mono">{b.batch_no}</span> · {b.manufacturer ?? "—"}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant={bucket === "expired" ? "destructive" : "outline"}>{bucket === "expired" ? "Expired" : `${bucket}d`}</Badge>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDate(b.expiry_date)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function ExpiryDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listNearExpiryBatches);
  const q = useQuery({
    queryKey: ["pharmacy-expiry", tenantId],
    queryFn: () => fn({ data: { tenantId, withinDays: 365 } }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: BatchRow[] } | undefined)?.rows ?? []) as BatchRow[];
  const expired = rows.filter((r) => bucketFor(r.expiry_date) === "expired").length;
  const soon = rows.filter((r) => ["30", "60"].includes(bucketFor(r.expiry_date))).length;
  const quarantined = rows.filter((r) => (r.status ?? "").toLowerCase() === "quarantine").length;

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Expired" value={expired} icon={Ban} tone="danger" />
        <KpiCard label="≤ 60 days" value={soon} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Quarantined" value={quarantined} icon={Clock} tone="info" />
        <KpiCard label="Tracked batches" value={rows.length} icon={Clock} />
      </KpiGrid>
      <ExpiryHeatmap rows={rows} />
      <NearExpiryPanel rows={rows} />
    </div>
  );
}
