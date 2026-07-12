import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNearExpiryBatches } from "@/lib/pharmacy/analytics.functions";
import { listInventoryLedger } from "@/lib/pharmacy/inventory.functions";
import { DataGrid } from "@/components/standards/data-grid";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { TimelinePanel, type TimelineItem } from "@/components/standards/timeline-panel";
import { formatDate } from "@/lib/standards-format";

type BatchRow = {
  id: string;
  drug_id: string;
  batch_no: string;
  lot_no: string | null;
  expiry_date: string;
  manufacture_date: string | null;
  manufacturer: string | null;
  status: string | null;
  is_recalled?: boolean | null;
};

export function BatchTimeline({ tenantId, batchId }: { tenantId: string; batchId: string }) {
  const fn = useServerFn(listInventoryLedger);
  const q = useQuery({
    queryKey: ["pharmacy-batch-ledger", tenantId, batchId],
    queryFn: () => fn({ data: { tenantId, batchId, limit: 100 } as never }),
    enabled: !!batchId,
  });
  const rows = (q.data as { rows?: Array<Record<string, unknown>> } | undefined)?.rows ?? [];
  const items: TimelineItem[] = rows.map((r) => ({
    ts: String(r.posted_at ?? ""),
    event_type: String(r.movement_type ?? "movement"),
    title: `${r.quantity_delta} ${r.unit_code ?? ""}`,
    body: r.reason_code ? String(r.reason_code) : null,
  }));
  return <TimelinePanel items={items} emptyMessage="No ledger movements for this batch." />;
}

export function BatchDrawer({
  open,
  onOpenChange,
  row,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  row: BatchRow | null;
  tenantId: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Batch {row?.batch_no}</SheetTitle>
        </SheetHeader>
        {row && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-muted-foreground">Expiry</div><div>{formatDate(row.expiry_date)}</div></div>
              <div><div className="text-xs text-muted-foreground">Mfg</div><div>{row.manufacture_date ? formatDate(row.manufacture_date) : "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Manufacturer</div><div>{row.manufacturer ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><div>{row.status ?? "active"}</div></div>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">Movements</div>
              <BatchTimeline tenantId={tenantId} batchId={row.id} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function BatchGrid({ tenantId, withinDays = 365 }: { tenantId: string; withinDays?: number }) {
  const fn = useServerFn(listNearExpiryBatches);
  const q = useQuery({
    queryKey: ["pharmacy-batches", tenantId, withinDays],
    queryFn: () => fn({ data: { tenantId, withinDays } }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: BatchRow[] } | undefined)?.rows ?? []) as BatchRow[];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<BatchRow | null>(null);

  return (
    <>
      <DataGrid<BatchRow>
        rows={rows}
        getRowId={(r) => r.id}
        isLoading={q.isLoading}
        emptyMessage="No batches in FEFO window."
        onRowClick={(r) => { setActive(r); setOpen(true); }}
        columns={[
          { id: "batch", header: "Batch #", cell: (r) => <span className="font-mono">{r.batch_no}</span> },
          { id: "lot", header: "Lot", cell: (r) => r.lot_no ?? "—" },
          { id: "expiry", header: "Expiry (FEFO)", cell: (r) => formatDate(r.expiry_date) },
          { id: "mfr", header: "Manufacturer", cell: (r) => r.manufacturer ?? "—" },
          {
            id: "status",
            header: "Status",
            cell: (r) => (
              <Badge variant={r.is_recalled ? "destructive" : "outline"}>
                {r.is_recalled ? "Recalled" : (r.status ?? "active")}
              </Badge>
            ),
          },
        ]}
      />
      <BatchDrawer open={open} onOpenChange={setOpen} row={active} tenantId={tenantId} />
    </>
  );
}
