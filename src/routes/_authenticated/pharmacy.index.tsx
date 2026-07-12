import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTenant } from "@/hooks/use-tenant";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { inventoryAnalyticsSnapshot, listNearExpiryBatches } from "@/lib/pharmacy/analytics.functions";
import { listTransfers } from "@/lib/pharmacy/transfers.functions";
import { listPurchaseOrders } from "@/lib/pharmacy/purchase.functions";
import { listControlledRegister } from "@/lib/pharmacy/controlled.functions";
import { listColdChainReadings } from "@/lib/pharmacy/coldchain.functions";
import { Package, Archive, Lock, AlertTriangle, Truck, ShoppingCart, Snowflake, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pharmacy/")({
  component: PharmacyOverview,
});

function PharmacyOverview() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const snap = useServerFn(inventoryAnalyticsSnapshot);
  const near = useServerFn(listNearExpiryBatches);
  const xfer = useServerFn(listTransfers);
  const po = useServerFn(listPurchaseOrders);
  const ctrl = useServerFn(listControlledRegister);
  const cold = useServerFn(listColdChainReadings);

  const qSnap = useQuery({ queryKey: ["pharmacy-snap", tenantId], queryFn: () => snap({ data: { tenantId } as never }), enabled: !!tenantId });
  const qNear = useQuery({ queryKey: ["pharmacy-near-30", tenantId], queryFn: () => near({ data: { tenantId, withinDays: 30 } }), enabled: !!tenantId });
  const qXfer = useQuery({ queryKey: ["pharmacy-xfer", tenantId], queryFn: () => xfer({ data: { tenantId, limit: 200 } as never }), enabled: !!tenantId });
  const qPo = useQuery({ queryKey: ["pharmacy-po", tenantId], queryFn: () => po({ data: { tenantId, limit: 200 } as never }), enabled: !!tenantId });
  const qCtrl = useQuery({ queryKey: ["pharmacy-ctrl", tenantId], queryFn: () => ctrl({ data: { tenantId, limit: 100 } as never }), enabled: !!tenantId });
  const qCold = useQuery({ queryKey: ["pharmacy-cold", tenantId], queryFn: () => cold({ data: { tenantId, excursionOnly: true, limit: 100 } as never }), enabled: !!tenantId });

  const totals = (qSnap.data as { totals?: { onHand: number; reserved: number } } | undefined)?.totals;
  const nearRows = ((qNear.data as { rows?: unknown[] } | undefined)?.rows ?? []) as unknown[];
  const xferRows = ((qXfer.data as { rows?: Array<{ status: string }> } | undefined)?.rows ?? []);
  const poRows = ((qPo.data as { rows?: Array<{ status: string }> } | undefined)?.rows ?? []);
  const ctrlRows = ((qCtrl.data as { rows?: unknown[] } | undefined)?.rows ?? []);
  const coldRows = ((qCold.data as { rows?: unknown[] } | undefined)?.rows ?? []);

  const pendingTransfers = xferRows.filter((t) => t.status !== "received").length;
  const openPO = poRows.filter((p) => !["closed", "cancelled", "received"].includes(p.status)).length;

  if (!activeTenantId) {
    return <div className="text-sm text-muted-foreground">Select a tenant to view pharmacy KPIs.</div>;
  }

  return (
    <KpiGrid>
      <KpiCard label="Inventory value" value="—" hint="Requires cost-price feed" icon={Package} tone="info" />
      <KpiCard label="Available stock" value={totals ? (totals.onHand - totals.reserved).toFixed(0) : "…"} icon={Archive} tone="success" />
      <KpiCard label="Reserved stock" value={totals ? totals.reserved.toFixed(0) : "…"} icon={Lock} tone="warning" />
      <KpiCard label="Near expiry (30d)" value={nearRows.length} icon={AlertTriangle} tone="warning" />
      <KpiCard label="Expired batches" value={nearRows.filter((r) => new Date((r as { expiry_date: string }).expiry_date).getTime() < Date.now()).length} icon={AlertTriangle} tone="danger" />
      <KpiCard label="Pending transfers" value={pendingTransfers} icon={Truck} />
      <KpiCard label="Open purchase orders" value={openPO} icon={ShoppingCart} />
      <KpiCard label="Controlled entries" value={ctrlRows.length} icon={ShieldAlert} tone="danger" />
      <KpiCard label="Cold-chain excursions" value={coldRows.length} icon={Snowflake} tone="warning" />
    </KpiGrid>
  );
}
