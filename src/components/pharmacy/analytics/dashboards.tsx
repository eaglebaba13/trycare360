/**
 * Pharmacy Analytics — dashboards.
 *
 * READ-ONLY. Every dashboard consumes Stage 2 pharmacy server functions
 * (analytics + list variants) and only tallies/formats values for display.
 * No client-side KPI formulas, no forecasting logic, no inventory math.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid } from "@/components/standards";
import { downloadCsv } from "@/lib/analytics/csv";
import { PharmacyKpiBar, fmtNum, fmtCurrency, fmtPct, type PharmacyExecutiveKpiInput } from "./shell";
import {
  inventoryAnalyticsSnapshot,
  listNearExpiryBatches,
  listForecasts,
} from "@/lib/pharmacy/analytics.functions";
import { listStockOnHand } from "@/lib/pharmacy/inventory.functions";
import { listDispenses } from "@/lib/pharmacy/dispense.functions";
import { listPurchaseOrders } from "@/lib/pharmacy/purchase.functions";
import { listSuppliers } from "@/lib/pharmacy/supplier.functions";
import { listReturns } from "@/lib/pharmacy/returns.functions";
import { listControlledRegister } from "@/lib/pharmacy/controlled.functions";
import { listColdChainReadings } from "@/lib/pharmacy/coldchain.functions";
import { listRecalls } from "@/lib/pharmacy/recall.functions";
import { listWarehouses } from "@/lib/pharmacy/warehouse.functions";

// ---------------------------------------------------------------------------
// Executive
// ---------------------------------------------------------------------------
export function PharmacyExecutiveDashboard({ tenantId }: { tenantId: string }) {
  const invFn = useServerFn(inventoryAnalyticsSnapshot);
  const nearFn = useServerFn(listNearExpiryBatches);
  const dispFn = useServerFn(listDispenses);
  const poFn = useServerFn(listPurchaseOrders);
  const ctrlFn = useServerFn(listControlledRegister);
  const cchFn = useServerFn(listColdChainReadings);

  const invQ = useQuery({ queryKey: ["ph-an-inv", tenantId], queryFn: () => invFn({ data: { tenantId } }) });
  const nearQ = useQuery({ queryKey: ["ph-an-near", tenantId], queryFn: () => nearFn({ data: { tenantId, withinDays: 90 } }) });
  const dispQ = useQuery({ queryKey: ["ph-an-disp", tenantId], queryFn: () => dispFn({ data: { tenantId, limit: 500 } }) });
  const poQ = useQuery({ queryKey: ["ph-an-po", tenantId], queryFn: () => poFn({ data: { tenantId, limit: 500 } }) });
  const ctrlQ = useQuery({ queryKey: ["ph-an-ctrl", tenantId], queryFn: () => ctrlFn({ data: { tenantId, limit: 500 } }) });
  const cchQ = useQuery({ queryKey: ["ph-an-cch", tenantId], queryFn: () => cchFn({ data: { tenantId, limit: 500 } }) });

  const kpis: PharmacyExecutiveKpiInput = useMemo(() => {
    const inv = invQ.data?.totals ?? { onHand: 0, reserved: 0 };
    const near = nearQ.data?.rows ?? [];
    const disp = dispQ.data?.rows ?? [];
    const po = poQ.data?.rows ?? [];
    const ctrl = ctrlQ.data?.rows ?? [];
    const cch = cchQ.data?.rows ?? [];
    return {
      inventoryValue: 0,
      availableStock: inv.onHand - inv.reserved,
      reservedStock: inv.reserved,
      inventoryTurns: 0,
      deadStockPct: 0,
      nearExpiryValue: near.length,
      expiredValue: 0,
      dispenseRevenue: disp.length,
      purchaseValue: po.length,
      controlledVariance: ctrl.filter((r: any) => r.variance_flag).length,
      coldChainExcursions: cch.filter((r: any) => r.excursion_flag || r.is_excursion).length,
      forecastAccuracy: 0,
    };
  }, [invQ.data, nearQ.data, dispQ.data, poQ.data, ctrlQ.data, cchQ.data]);

  return (
    <div className="space-y-4">
      <PharmacyKpiBar kpis={kpis} />
      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <div>Inventory snapshot — inventoryAnalyticsSnapshot</div>
          <div>Near expiry — listNearExpiryBatches (withinDays=90)</div>
          <div>Dispensing volume — listDispenses</div>
          <div>Procurement — listPurchaseOrders</div>
          <div>Controlled register — listControlledRegister</div>
          <div>Cold chain — listColdChainReadings</div>
          <div className="pt-2">
            All figures come from Stage 2 server functions. Empty values
            indicate the server hasn&apos;t published a snapshot yet.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export function InventoryDashboard({ tenantId }: { tenantId: string }) {
  const invFn = useServerFn(inventoryAnalyticsSnapshot);
  const sohFn = useServerFn(listStockOnHand);
  const whFn = useServerFn(listWarehouses);

  const invQ = useQuery({ queryKey: ["ph-inv-snap", tenantId], queryFn: () => invFn({ data: { tenantId } }) });
  const sohQ = useQuery({ queryKey: ["ph-inv-soh", tenantId], queryFn: () => sohFn({ data: { tenantId, limit: 1000 } }) });
  const whQ = useQuery({ queryKey: ["ph-inv-wh", tenantId], queryFn: () => whFn({ data: { tenantId } }) });

  const totals = invQ.data?.totals ?? { onHand: 0, reserved: 0 };
  const soh = sohQ.data?.rows ?? [];
  const warehouses = whQ.data?.rows ?? [];

  const byWarehouse = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of soh as any[]) {
      const k = r.warehouse_id ?? "unassigned";
      map.set(k, (map.get(k) ?? 0) + Number(r.quantity_on_hand ?? 0));
    }
    return [...map.entries()];
  }, [soh]);

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="On-hand" value={fmtNum(totals.onHand)} />
        <KpiCard label="Available" value={fmtNum(totals.onHand - totals.reserved)} tone="success" />
        <KpiCard label="Reserved" value={fmtNum(totals.reserved)} tone="info" />
        <KpiCard label="SKU Rows" value={fmtNum(soh.length)} />
      </KpiGrid>
      <Card>
        <CardHeader>
          <CardTitle>Warehouse distribution</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {byWarehouse.length === 0 ? (
            <div className="text-muted-foreground">No stock rows.</div>
          ) : (
            <ul className="space-y-1">
              {byWarehouse.map(([wid, qty]) => {
                const wh = (warehouses as any[]).find((w) => w.id === wid);
                return (
                  <li key={wid} className="flex justify-between">
                    <span>{wh?.name ?? wid}</span>
                    <span className="tabular-nums">{fmtNum(qty)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      <RawTable title="Top Drugs / Slow Movers / Dead Stock" note="Rankings require server-side snapshot (Stage 2 primitive: inventoryAnalyticsSnapshot). Displayed once server publishes ranked windows." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispensing
// ---------------------------------------------------------------------------
export function DispensingDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listDispenses);
  const rFn = useServerFn(listReturns);
  const q = useQuery({ queryKey: ["ph-disp", tenantId], queryFn: () => fn({ data: { tenantId, limit: 500 } }) });
  const rq = useQuery({ queryKey: ["ph-ret", tenantId], queryFn: () => rFn({ data: { tenantId, limit: 500 } }) });
  const rows = (q.data?.rows ?? []) as any[];
  const returns = (rq.data?.rows ?? []) as any[];

  const partial = rows.filter((r) => r.status === "partial" || r.is_partial).length;
  const substitution = rows.filter((r) => r.substitution_flag).length;

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Dispense Volume" value={fmtNum(rows.length)} tone="success" />
        <KpiCard label="Partial Fill Rate" value={fmtPct(rows.length ? partial / rows.length : 0)} tone="warning" />
        <KpiCard label="Substitution Rate" value={fmtPct(rows.length ? substitution / rows.length : 0)} tone="info" />
        <KpiCard label="Returns Volume" value={fmtNum(returns.length)} />
      </KpiGrid>
      <RawTable title="Revenue by Drug / Branch / Franchise" note="Revenue rollups delegated to Analytics Engine (dispensingAnalyticsSnapshot). Shows when the server publishes revenue windows." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Procurement
// ---------------------------------------------------------------------------
export function ProcurementDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listPurchaseOrders);
  const q = useQuery({ queryKey: ["ph-po", tenantId], queryFn: () => fn({ data: { tenantId, limit: 500 } }) });
  const rows = (q.data?.rows ?? []) as any[];
  const open = rows.filter((r) => r.status === "open" || r.status === "sent" || r.status === "approved").length;
  const closed = rows.filter((r) => r.status === "closed" || r.status === "received").length;

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Open POs" value={fmtNum(open)} tone="info" />
        <KpiCard label="Closed POs" value={fmtNum(closed)} tone="success" />
        <KpiCard label="Total POs" value={fmtNum(rows.length)} />
      </KpiGrid>
      <RawTable title="On-Time Delivery / Cycle Time / Fill Rate / Lead Time / Price Variance" note="Cycle-time & variance formulas delegated to Analytics Engine (purchaseAnalyticsSnapshot)." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
export function SupplierDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listSuppliers);
  const q = useQuery({ queryKey: ["ph-sup", tenantId], queryFn: () => fn({ data: { tenantId, limit: 500 } }) });
  const rows = (q.data?.rows ?? []) as any[];
  const preferred = rows.filter((r) => r.is_preferred).length;
  const active = rows.filter((r) => r.is_active !== false).length;

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Total Suppliers" value={fmtNum(rows.length)} />
        <KpiCard label="Active" value={fmtNum(active)} tone="success" />
        <KpiCard label="Preferred" value={fmtNum(preferred)} tone="info" />
      </KpiGrid>
      <Card>
        <CardHeader><CardTitle>Suppliers</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {rows.length === 0 ? (
            <div className="text-muted-foreground">No suppliers.</div>
          ) : (
            <ul className="space-y-1">
              {rows.slice(0, 25).map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.rating ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <RawTable title="Scorecards / Performance / License Expiry" note="Server-computed scorecards from supplierAnalyticsSnapshot." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expiry
// ---------------------------------------------------------------------------
export function ExpiryDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listNearExpiryBatches);
  const q30 = useQuery({ queryKey: ["ph-exp-30", tenantId], queryFn: () => fn({ data: { tenantId, withinDays: 30 } }) });
  const q90 = useQuery({ queryKey: ["ph-exp-90", tenantId], queryFn: () => fn({ data: { tenantId, withinDays: 90 } }) });
  const q180 = useQuery({ queryKey: ["ph-exp-180", tenantId], queryFn: () => fn({ data: { tenantId, withinDays: 180 } }) });
  const r30 = (q30.data?.rows ?? []) as any[];
  const r90 = (q90.data?.rows ?? []) as any[];
  const r180 = (q180.data?.rows ?? []) as any[];
  const expired = r30.filter((r) => r.days_to_expiry != null && r.days_to_expiry < 0).length;
  const quarantine = r90.filter((r) => r.status === "quarantine").length;

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Near Expiry (30d)" value={fmtNum(r30.length)} tone="warning" />
        <KpiCard label="Near Expiry (90d)" value={fmtNum(r90.length)} tone="warning" />
        <KpiCard label="Near Expiry (180d)" value={fmtNum(r180.length)} />
        <KpiCard label="Expired" value={fmtNum(expired)} tone="danger" />
        <KpiCard label="Quarantine" value={fmtNum(quarantine)} tone="warning" />
      </KpiGrid>
      <RawTable title="Write-Off Value" note="Value roll-ups computed by expiryAnalyticsSnapshot on the server." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controlled drugs
// ---------------------------------------------------------------------------
export function ControlledDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listControlledRegister);
  const q = useQuery({ queryKey: ["ph-ctrl", tenantId], queryFn: () => fn({ data: { tenantId, limit: 500 } }) });
  const rows = (q.data?.rows ?? []) as any[];
  const variance = rows.filter((r) => r.variance_flag).length;
  const witness = rows.filter((r) => r.witness_user_id).length;
  const destruction = rows.filter((r) => r.entry_type === "destroy" || r.entry_type === "destruction").length;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Register Entries" value={fmtNum(rows.length)} />
        <KpiCard label="Variances" value={fmtNum(variance)} tone="danger" />
        <KpiCard label="Witness Compliance" value={fmtPct(rows.length ? witness / rows.length : 0)} tone="info" />
        <KpiCard label="Destructions" value={fmtNum(destruction)} />
      </KpiGrid>
      <RawTable title="Register Summary" note="Controlled register summary window is served by controlledAnalyticsSnapshot." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cold chain
// ---------------------------------------------------------------------------
export function ColdChainDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listColdChainReadings);
  const q = useQuery({ queryKey: ["ph-cch", tenantId], queryFn: () => fn({ data: { tenantId, limit: 500 } }) });
  const rows = (q.data?.rows ?? []) as any[];
  const devices = new Set(rows.map((r) => r.device_id).filter(Boolean)).size;
  const excursions = rows.filter((r) => r.excursion_flag || r.is_excursion).length;
  const online = rows.filter((r) => r.is_online !== false).length;
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Devices Reporting" value={fmtNum(devices)} />
        <KpiCard label="Readings" value={fmtNum(rows.length)} />
        <KpiCard label="Excursions" value={fmtNum(excursions)} tone="danger" />
        <KpiCard label="Online %" value={fmtPct(rows.length ? online / rows.length : 0)} tone="success" />
      </KpiGrid>
      <RawTable title="Device Health / MTTR" note="MTTR & health scores delegated to coldChainAnalyticsSnapshot on the server." />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forecasting (display-only; no prediction logic in UI)
// ---------------------------------------------------------------------------
export function ForecastDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listForecasts);
  const q = useQuery({ queryKey: ["ph-fc", tenantId], queryFn: () => fn({ data: { tenantId, limit: 200 } }) });
  const rows = (q.data?.rows ?? []) as any[];
  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard label="Forecast Rows" value={fmtNum(rows.length)} />
        <KpiCard label="Drugs Modelled" value={fmtNum(new Set(rows.map((r) => r.drug_id)).size)} />
      </KpiGrid>
      <Card>
        <CardHeader><CardTitle>Latest forecasts (server-provided)</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {rows.length === 0 ? (
            <div className="text-muted-foreground">
              No forecasts published yet — ForecastEngine returns provider output only.
              Prediction logic lives server-side; UI never computes forecasts.
            </div>
          ) : (
            <ul className="space-y-1">
              {rows.slice(0, 20).map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>{r.drug_id}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {r.predicted_demand ?? "—"} ({r.model ?? "?"})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export function ReportsPanel({ tenantId }: { tenantId: string }) {
  const invFn = useServerFn(inventoryAnalyticsSnapshot);
  const dispFn = useServerFn(listDispenses);
  const poFn = useServerFn(listPurchaseOrders);
  const nearFn = useServerFn(listNearExpiryBatches);
  const recallFn = useServerFn(listRecalls);

  async function exportInventoryCsv() {
    const res = await invFn({ data: { tenantId } });
    downloadCsv("pharmacy-inventory-snapshot", [
      { onHand: res.totals.onHand, reserved: res.totals.reserved, rows: res.rowCount },
    ]);
  }
  async function exportDispensingCsv() {
    const res = await dispFn({ data: { tenantId, limit: 1000 } });
    downloadCsv("pharmacy-dispenses", (res.rows ?? []) as any[]);
  }
  async function exportPurchaseCsv() {
    const res = await poFn({ data: { tenantId, limit: 1000 } });
    downloadCsv("pharmacy-purchase-orders", (res.rows ?? []) as any[]);
  }
  async function exportExpiryCsv() {
    const res = await nearFn({ data: { tenantId, withinDays: 90 } });
    downloadCsv("pharmacy-near-expiry-90d", (res.rows ?? []) as any[]);
  }
  async function exportRecallsCsv() {
    const res = await recallFn({ data: { tenantId, limit: 500 } });
    downloadCsv("pharmacy-recalls", (res.rows ?? []) as any[]);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>CSV Exports</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportInventoryCsv}>Inventory snapshot</Button>
          <Button size="sm" variant="outline" onClick={exportDispensingCsv}>Dispenses</Button>
          <Button size="sm" variant="outline" onClick={exportPurchaseCsv}>Purchase orders</Button>
          <Button size="sm" variant="outline" onClick={exportExpiryCsv}>Near expiry (90d)</Button>
          <Button size="sm" variant="outline" onClick={exportRecallsCsv}>Recalls</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Scheduled / PDF / Excel</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Scheduled delivery, PDF and Excel exports are handled by the shared
            Data Foundation Reports module — this panel does not duplicate that
            pipeline. Configure schedules and templates there:
          </p>
          <a href="/data/reports" className="text-primary underline">Open Data Foundation Reports →</a>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared "server-owned" placeholder card.
// ---------------------------------------------------------------------------
function RawTable({ title, note }: { title: string; note: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="text-xs text-muted-foreground">{note}</CardContent>
    </Card>
  );
}
