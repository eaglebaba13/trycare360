import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStockOnHand, listInventoryLedger } from "@/lib/pharmacy/inventory.functions";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid } from "@/components/standards/data-grid";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Package, Archive, AlertTriangle, Lock } from "lucide-react";

type StockRow = {
  id: string;
  drug_id: string;
  warehouse_id: string;
  batch_id: string | null;
  quantity_on_hand: number | null;
  quantity_reserved: number | null;
  unit_code: string | null;
};

export function InventorySummaryBar({ rows }: { rows: StockRow[] }) {
  const total = rows.reduce((a, r) => a + Number(r.quantity_on_hand ?? 0), 0);
  const reserved = rows.reduce((a, r) => a + Number(r.quantity_reserved ?? 0), 0);
  const available = total - reserved;
  const lines = rows.length;
  return (
    <KpiGrid>
      <KpiCard label="Stock lines" value={lines} icon={Package} />
      <KpiCard label="On-hand units" value={total.toFixed(0)} icon={Archive} tone="info" />
      <KpiCard label="Reserved" value={reserved.toFixed(0)} icon={Lock} tone="warning" />
      <KpiCard label="Available" value={available.toFixed(0)} icon={AlertTriangle} tone="success" />
    </KpiGrid>
  );
}

export function InventoryDrawer({
  open,
  onOpenChange,
  row,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: StockRow | null;
  tenantId: string;
}) {
  const fn = useServerFn(listInventoryLedger);
  const q = useQuery({
    queryKey: ["pharmacy-ledger", tenantId, row?.drug_id, row?.warehouse_id],
    queryFn: () =>
      fn({
        data: {
          tenantId,
          drugId: row!.drug_id,
          warehouseId: row!.warehouse_id,
          limit: 50,
        } as never,
      }),
    enabled: open && !!row,
  });
  const rows = (q.data as { rows?: Array<Record<string, unknown>> } | undefined)?.rows ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Stock lot detail</SheetTitle>
        </SheetHeader>
        {row && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-muted-foreground text-xs">Drug</div><div className="font-mono">{row.drug_id.slice(0, 8)}</div></div>
              <div><div className="text-muted-foreground text-xs">Warehouse</div><div className="font-mono">{row.warehouse_id.slice(0, 8)}</div></div>
              <div><div className="text-muted-foreground text-xs">On-hand</div><div>{row.quantity_on_hand ?? 0} {row.unit_code}</div></div>
              <div><div className="text-muted-foreground text-xs">Reserved</div><div>{row.quantity_reserved ?? 0}</div></div>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">Ledger (last 50)</div>
              <div className="max-h-96 overflow-y-auto rounded border">
                {q.isLoading && <div className="p-3 text-xs text-muted-foreground">Loading…</div>}
                {!q.isLoading && rows.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground">No ledger entries.</div>
                )}
                <ul className="divide-y">
                  {rows.map((r) => (
                    <li key={String(r.id)} className="p-2 text-xs flex justify-between gap-2">
                      <span className="truncate">
                        <Badge variant="outline" className="mr-1">{String(r.movement_type ?? "")}</Badge>
                        {String(r.posted_at ?? "")}
                      </span>
                      <span className="tabular-nums font-mono">{String(r.quantity_delta ?? 0)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function InventoryGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listStockOnHand);
  const q = useQuery({
    queryKey: ["pharmacy-stock", tenantId],
    queryFn: () => fn({ data: { tenantId, includeReserved: true, limit: 200 } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: StockRow[] } | undefined)?.rows ?? []) as StockRow[];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<StockRow | null>(null);

  return (
    <div className="space-y-3">
      <InventorySummaryBar rows={rows} />
      <DataGrid<StockRow>
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        onRowClick={(r) => { setActive(r); setOpen(true); }}
        columns={[
          { id: "drug", header: "Drug", cell: (r) => <span className="font-mono text-xs">{r.drug_id.slice(0, 8)}</span> },
          { id: "warehouse", header: "Warehouse", cell: (r) => <span className="font-mono text-xs">{r.warehouse_id.slice(0, 8)}</span> },
          { id: "batch", header: "Batch", cell: (r) => <span className="font-mono text-xs">{r.batch_id ? r.batch_id.slice(0, 8) : "—"}</span> },
          { id: "onhand", header: "On-hand", cell: (r) => <span className="tabular-nums">{r.quantity_on_hand ?? 0}</span> },
          { id: "reserved", header: "Reserved", cell: (r) => <span className="tabular-nums">{r.quantity_reserved ?? 0}</span> },
          { id: "unit", header: "Unit", cell: (r) => r.unit_code ?? "—" },
        ]}
      />
      <InventoryDrawer open={open} onOpenChange={setOpen} row={active} tenantId={tenantId} />
    </div>
  );
}
