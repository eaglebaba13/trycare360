import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSuppliers } from "@/lib/pharmacy/supplier.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Truck, Star } from "lucide-react";
import { DataGrid } from "@/components/standards/data-grid";

type Supplier = {
  id: string;
  code: string;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  lead_time_days: number | null;
  is_active: boolean;
  meta?: { rating?: number; preferred?: boolean } | null;
};

export function SupplierCard({ s, active, onClick }: { s: Supplier; active: boolean; onClick: () => void }) {
  const rating = s.meta?.rating ?? null;
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40 ${active ? "border-primary bg-primary/5" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 opacity-60" />
            <span className="font-medium truncate">{s.name}</span>
            {s.meta?.preferred && <Badge variant="secondary" className="text-[10px]">Preferred</Badge>}
          </div>
          <div className="mt-1 text-xs text-muted-foreground truncate">{s.legal_name ?? s.code}</div>
          <div className="mt-1 text-xs text-muted-foreground truncate">{s.contact_person ?? "—"} · {s.phone ?? "—"}</div>
        </div>
        <div className="text-right shrink-0">
          {rating != null && (
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span className="text-xs tabular-nums">{rating.toFixed(1)}</span>
            </div>
          )}
          <div className="mt-1 text-[10px] text-muted-foreground">Lead {s.lead_time_days ?? "—"}d</div>
        </div>
      </div>
    </button>
  );
}

export function SupplierProductPanel({ supplier }: { supplier: Supplier | null }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Supplier products</CardTitle></CardHeader>
      <CardContent>
        {!supplier ? (
          <div className="text-sm text-muted-foreground">Select a supplier to see catalog.</div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-muted-foreground">Code</div><div className="font-mono">{supplier.code}</div></div>
              <div><div className="text-xs text-muted-foreground">Lead time</div><div>{supplier.lead_time_days ?? "—"} days</div></div>
              <div><div className="text-xs text-muted-foreground">Email</div><div>{supplier.email ?? "—"}</div></div>
              <div><div className="text-xs text-muted-foreground">Phone</div><div>{supplier.phone ?? "—"}</div></div>
            </div>
            <div className="pt-3">
              <DataGrid
                rows={[]}
                getRowId={(r: { id: string }) => r.id}
                emptyMessage="Supplier product catalog loads on demand (Stage 5 UI will surface catalog editor)."
                columns={[
                  { id: "sku", header: "Supplier SKU", cell: () => "—" },
                  { id: "drug", header: "Drug", cell: () => "—" },
                  { id: "moq", header: "MOQ", cell: () => "—" },
                  { id: "lead", header: "Lead (d)", cell: () => "—" },
                ]}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SupplierGrid({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listSuppliers);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Supplier | null>(null);
  const q = useQuery({
    queryKey: ["pharmacy-suppliers", tenantId, search],
    queryFn: () => fn({ data: { tenantId, search, activeOnly: true } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: Supplier[] } | undefined)?.rows ?? []) as Supplier[];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <Input placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
        {!q.isLoading && rows.length === 0 && <div className="text-sm text-muted-foreground">No suppliers.</div>}
        <div className="grid gap-2 md:grid-cols-2">
          {rows.map((s) => (
            <SupplierCard key={s.id} s={s} active={selected?.id === s.id} onClick={() => setSelected(s)} />
          ))}
        </div>
      </div>
      <SupplierProductPanel supplier={selected} />
    </div>
  );
}
