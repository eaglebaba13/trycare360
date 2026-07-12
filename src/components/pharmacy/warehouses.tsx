import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listWarehouses, listWarehouseLocations, listWarehouseBins } from "@/lib/pharmacy/warehouse.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, Boxes, MapPin } from "lucide-react";

type Warehouse = {
  id: string;
  code: string;
  name: string;
  warehouse_type: string;
  parent_id: string | null;
  branch_id: string | null;
  is_active: boolean;
};
type Location = { id: string; warehouse_id: string; code: string; name: string; location_type: string };
type Bin = { id: string; warehouse_id: string; location_id: string | null; code: string; rack: string | null; shelf: string | null; bin: string | null };

function buildTree(rows: Warehouse[]) {
  const byParent = new Map<string | null, Warehouse[]>();
  rows.forEach((r) => {
    const key = r.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(r);
  });
  return byParent;
}

function TreeNode({
  node,
  byParent,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: Warehouse;
  byParent: Map<string | null, Warehouse[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const children = byParent.get(node.id) ?? [];
  const active = selectedId === node.id;
  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50",
          active && "bg-primary/10 text-primary font-medium",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <Building2 className="h-4 w-4 shrink-0 opacity-60" />
        <span className="truncate">{node.name}</span>
        <Badge variant="outline" className="ml-auto text-[10px]">{node.warehouse_type}</Badge>
      </button>
      {children.map((c) => (
        <TreeNode key={c.id} node={c} byParent={byParent} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export function WarehouseTree({
  tenantId, selectedId, onSelect,
}: {
  tenantId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const fn = useServerFn(listWarehouses);
  const q = useQuery({
    queryKey: ["pharmacy-warehouses", tenantId],
    queryFn: () => fn({ data: { tenantId, activeOnly: true } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: Warehouse[] } | undefined)?.rows ?? []) as Warehouse[];
  const byParent = useMemo(() => buildTree(rows), [rows]);
  const roots = byParent.get(null) ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Hierarchy</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!q.isLoading && roots.length === 0 && <div className="text-sm text-muted-foreground">No warehouses.</div>}
        {roots.map((r) => (
          <TreeNode key={r.id} node={r} byParent={byParent} selectedId={selectedId} onSelect={onSelect} />
        ))}
      </CardContent>
    </Card>
  );
}

export function WarehouseMap({ tenantId, warehouseId }: { tenantId: string; warehouseId: string | null }) {
  const fn = useServerFn(listWarehouseLocations);
  const q = useQuery({
    queryKey: ["pharmacy-warehouse-locations", tenantId, warehouseId],
    queryFn: () => fn({ data: { tenantId, warehouseId } as never }),
    enabled: !!(tenantId && warehouseId),
  });
  const rows = ((q.data as { rows?: Location[] } | undefined)?.rows ?? []) as Location[];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Locations</CardTitle></CardHeader>
      <CardContent>
        {!warehouseId && <div className="text-sm text-muted-foreground">Select a warehouse.</div>}
        {warehouseId && rows.length === 0 && !q.isLoading && (
          <div className="text-sm text-muted-foreground">No locations defined.</div>
        )}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {rows.map((l) => (
            <div key={l.id} className="rounded-md border p-2 text-sm">
              <div className="font-medium truncate">{l.name}</div>
              <div className="text-xs text-muted-foreground">{l.location_type}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function BinExplorer({ tenantId, warehouseId }: { tenantId: string; warehouseId: string | null }) {
  const fn = useServerFn(listWarehouseBins);
  const q = useQuery({
    queryKey: ["pharmacy-warehouse-bins", tenantId, warehouseId],
    queryFn: () => fn({ data: { tenantId, warehouseId } as never }),
    enabled: !!(tenantId && warehouseId),
  });
  const rows = ((q.data as { rows?: Bin[] } | undefined)?.rows ?? []) as Bin[];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4" /> Bins</CardTitle></CardHeader>
      <CardContent>
        {!warehouseId && <div className="text-sm text-muted-foreground">Select a warehouse.</div>}
        {warehouseId && rows.length === 0 && !q.isLoading && (
          <div className="text-sm text-muted-foreground">No bins defined.</div>
        )}
        <ul className="divide-y text-sm">
          {rows.map((b) => (
            <li key={b.id} className="py-1.5 flex items-center justify-between">
              <span className="font-mono">{b.code}</span>
              <span className="text-xs text-muted-foreground">{[b.rack, b.shelf, b.bin].filter(Boolean).join(" / ") || "—"}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function useWarehouseSelection() {
  return useState<string | null>(null);
}
