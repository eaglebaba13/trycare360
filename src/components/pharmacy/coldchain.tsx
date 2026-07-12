/**
 * Phase 2.6 Stage 5 — Cold Chain UI (display + record reading).
 * Excursion detection and quarantine flagging live in Stage 2
 * ColdChainEngine.recordReading. This UI does no temperature math.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listColdChainReadings,
  recordColdChainReading,
} from "@/lib/pharmacy/coldchain.functions";
import { listWarehouses } from "@/lib/pharmacy/warehouse.functions";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid } from "@/components/standards/data-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Thermometer, AlertTriangle, ShieldAlert, Plus } from "lucide-react";
import { toast } from "sonner";

type Reading = {
  id: string;
  warehouse_id: string;
  location_id: string | null;
  device_id: string | null;
  temperature_c: number;
  humidity_percent: number | null;
  reading_at: string;
  source: string;
  is_excursion: boolean;
  quarantine_triggered: boolean;
  excursion_threshold?: { min: number | null; max: number | null } | null;
  created_at: string;
};

type Warehouse = { id: string; name: string; warehouse_type: string };

// ---------------------------------------------------------------------------
// ColdChainDashboard
// ---------------------------------------------------------------------------
export function ColdChainDashboard({ tenantId }: { tenantId: string }) {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const fn = useServerFn(listColdChainReadings);
  const q = useQuery({
    queryKey: ["pharmacy-coldchain", tenantId, warehouseId],
    queryFn: () =>
      fn({
        data: {
          tenantId,
          warehouseId: warehouseId || null,
          excursionOnly: false,
          limit: 200,
        } as never,
      }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: Reading[] } | undefined)?.rows ?? []) as Reading[];
  const stats = useMemo(() => {
    const total = rows.length;
    const excursions = rows.filter((r) => r.is_excursion).length;
    const quarantined = rows.filter((r) => r.quarantine_triggered).length;
    const devices = new Set(rows.map((r) => r.device_id).filter(Boolean)).size;
    const latest = rows[0]?.temperature_c ?? null;
    return { total, excursions, quarantined, devices, latest };
  }, [rows]);
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Readings" value={stats.total} icon={Thermometer} />
        <KpiCard label="Devices online" value={stats.devices} tone="info" />
        <KpiCard label="Excursions" value={stats.excursions} tone="warning" icon={AlertTriangle} />
        <KpiCard label="Quarantined" value={stats.quarantined} tone="danger" icon={ShieldAlert} />
        <KpiCard label="Latest temp" value={stats.latest != null ? `${stats.latest.toFixed(1)}°C` : "—"} />
      </KpiGrid>
      <div className="flex items-center gap-2 justify-between">
        <WarehousePicker tenantId={tenantId} value={warehouseId} onChange={setWarehouseId} />
        <RecordReadingDialog tenantId={tenantId} defaultWarehouseId={warehouseId} onDone={() => q.refetch()} />
      </div>
      <ExcursionAlertPanel rows={rows.filter((r) => r.is_excursion)} />
      <DeviceGrid rows={rows} />
      <TemperatureTimeline rows={rows.slice(0, 60)} />
      <QuarantinePanel rows={rows.filter((r) => r.quarantine_triggered)} />
    </div>
  );
}

function WarehousePicker({
  tenantId,
  value,
  onChange,
}: {
  tenantId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const fn = useServerFn(listWarehouses);
  const q = useQuery({
    queryKey: ["pharmacy-wh-picker", tenantId],
    queryFn: () => fn({ data: { tenantId, activeOnly: true } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: Warehouse[] } | undefined)?.rows ?? []) as Warehouse[];
  return (
    <div className="w-64">
      <Select value={value || "__all"} onValueChange={(v) => onChange(v === "__all" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="All warehouses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All warehouses</SelectItem>
          {rows.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeviceGrid — latest reading per device
// ---------------------------------------------------------------------------
export function DeviceGrid({ rows }: { rows: Reading[] }) {
  const latestPerDevice = useMemo(() => {
    const map = new Map<string, Reading>();
    for (const r of rows) {
      const key = r.device_id ?? r.location_id ?? r.warehouse_id;
      if (!map.has(key)) map.set(key, r);
    }
    return Array.from(map.values());
  }, [rows]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Devices</CardTitle></CardHeader>
      <CardContent>
        <DataGrid<Reading>
          rows={latestPerDevice}
          getRowId={(r) => r.id}
          emptyMessage="No cold-chain readings yet."
          columns={[
            { id: "dev", header: "Device", cell: (r) => <span className="font-mono text-xs">{r.device_id ?? r.location_id?.slice(0, 8) ?? r.warehouse_id.slice(0, 8)}</span> },
            { id: "temp", header: "Temp", cell: (r) => <span className={r.is_excursion ? "text-rose-600 font-medium" : ""}>{r.temperature_c.toFixed(1)}°C</span> },
            { id: "hum", header: "Humidity", cell: (r) => (r.humidity_percent != null ? `${r.humidity_percent.toFixed(0)}%` : "—") },
            {
              id: "thresh",
              header: "Threshold",
              cell: (r) => r.excursion_threshold ? `${r.excursion_threshold.min ?? "?"} – ${r.excursion_threshold.max ?? "?"}°C` : "—",
            },
            { id: "at", header: "At", cell: (r) => new Date(r.reading_at).toLocaleString() },
            {
              id: "status",
              header: "Status",
              cell: (r) => r.is_excursion
                ? <Badge variant="destructive">excursion</Badge>
                : <Badge variant="outline">ok</Badge>,
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// TemperatureTimeline — sparkline of recent readings
// ---------------------------------------------------------------------------
export function TemperatureTimeline({ rows }: { rows: Reading[] }) {
  const data = useMemo(() => [...rows].reverse(), [rows]);
  const temps = data.map((r) => r.temperature_c);
  const min = Math.min(0, ...temps);
  const max = Math.max(10, ...temps);
  const range = max - min || 1;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Temperature trend</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground">No readings.</div>
        ) : (
          <div className="flex items-end gap-0.5 h-24">
            {data.map((r) => {
              const h = ((r.temperature_c - min) / range) * 100;
              return (
                <div
                  key={r.id}
                  className={`flex-1 min-w-[2px] rounded-t ${r.is_excursion ? "bg-rose-500" : "bg-primary/70"}`}
                  style={{ height: `${h}%` }}
                  title={`${r.temperature_c}°C at ${new Date(r.reading_at).toLocaleString()}`}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ExcursionAlertPanel
// ---------------------------------------------------------------------------
export function ExcursionAlertPanel({ rows }: { rows: Reading[] }) {
  if (rows.length === 0) return null;
  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Active excursions ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        {rows.slice(0, 5).map((r) => (
          <div key={r.id} className="flex justify-between">
            <span className="font-mono text-xs">{r.device_id ?? r.location_id?.slice(0, 8) ?? r.warehouse_id.slice(0, 8)}</span>
            <span className="text-rose-600 font-medium">{r.temperature_c.toFixed(1)}°C</span>
            <span className="text-xs text-muted-foreground">{new Date(r.reading_at).toLocaleString()}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// QuarantinePanel
// ---------------------------------------------------------------------------
export function QuarantinePanel({ rows }: { rows: Reading[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Quarantine recommendations</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No quarantine actions pending.</div>
        ) : (
          <ul className="text-sm space-y-1">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between">
                <span className="font-mono text-xs">{r.warehouse_id.slice(0, 8)}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.reading_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// RecordReadingDialog — manual entry (also driven by iot_temperature connector)
// ---------------------------------------------------------------------------
function RecordReadingDialog({
  tenantId,
  defaultWarehouseId,
  onDone,
}: {
  tenantId: string;
  defaultWarehouseId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId);
  const [deviceId, setDeviceId] = useState("");
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");
  const record = useServerFn(recordColdChainReading);
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: () =>
      record({
        data: {
          tenantId,
          warehouseId,
          deviceId: deviceId || null,
          temperatureC: Number(temp),
          humidityPercent: humidity ? Number(humidity) : null,
          source: "manual",
        } as never,
      }),
    onSuccess: () => {
      toast.success("Reading recorded");
      qc.invalidateQueries({ queryKey: ["pharmacy-coldchain"] });
      onDone();
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Record reading</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record temperature reading</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Warehouse ID</Label>
            <Input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
          </div>
          <div>
            <Label>Device</Label>
            <Input value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="fridge-01" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Temperature (°C)</Label>
              <Input value={temp} onChange={(e) => setTemp(e.target.value)} />
            </div>
            <div>
              <Label>Humidity (%)</Label>
              <Input value={humidity} onChange={(e) => setHumidity(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!warehouseId || !temp || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Saving…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
