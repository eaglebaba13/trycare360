/**
 * Phase 2.6 Stage 5 — Supplier profile, scorecard, license & contacts.
 * Display-only. All numbers come from Stage 2 server functions.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listSuppliers } from "@/lib/pharmacy/supplier.functions";
import { listPurchaseOrders } from "@/lib/pharmacy/purchase.functions";
import { KpiCard, KpiGrid } from "@/components/standards/kpi-card";
import { DataGrid } from "@/components/standards/data-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Star, ShieldCheck, Phone, Mail, MapPin, Award } from "lucide-react";

type Supplier = {
  id: string;
  code: string;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  gstin?: string | null;
  drug_license_no?: string | null;
  payment_terms?: string | null;
  lead_time_days: number | null;
  is_active: boolean;
  address?: Record<string, unknown> | null;
  meta?: { rating?: number; preferred?: boolean; contacts?: Array<{ name: string; role?: string; phone?: string; email?: string }>; licenses?: Array<{ type: string; number: string; expiry?: string }> } | null;
};

type PoRow = {
  id: string;
  po_number?: string | null;
  supplier_id: string;
  status: string;
  po_date: string | null;
  expected_date: string | null;
  total_amount?: number | null;
};

// ---------------------------------------------------------------------------
// SupplierDashboard — index page KPI header for the supplier list
// ---------------------------------------------------------------------------
export function SupplierDashboard({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listSuppliers);
  const q = useQuery({
    queryKey: ["pharmacy-sup-dash", tenantId],
    queryFn: () => fn({ data: { tenantId, search: "", activeOnly: false } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: Supplier[] } | undefined)?.rows ?? []) as Supplier[];
  const preferred = rows.filter((r) => r.meta?.preferred).length;
  const active = rows.filter((r) => r.is_active).length;
  const avgLead =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + (r.lead_time_days ?? 0), 0) / rows.length)
      : 0;
  return (
    <KpiGrid>
      <KpiCard label="Suppliers" value={rows.length} icon={Truck} />
      <KpiCard label="Active" value={active} tone="success" />
      <KpiCard label="Preferred" value={preferred} icon={Star} tone="info" />
      <KpiCard label="Avg lead (days)" value={avgLead} tone="default" />
    </KpiGrid>
  );
}

// ---------------------------------------------------------------------------
// Supplier data hook
// ---------------------------------------------------------------------------
function useSupplier(tenantId: string, supplierId: string) {
  const fn = useServerFn(listSuppliers);
  const q = useQuery({
    queryKey: ["pharmacy-sup-detail", tenantId, supplierId],
    queryFn: () => fn({ data: { tenantId, search: "", activeOnly: false } as never }),
    enabled: !!tenantId,
  });
  const rows = ((q.data as { rows?: Supplier[] } | undefined)?.rows ?? []) as Supplier[];
  return rows.find((r) => r.id === supplierId) ?? null;
}

function useSupplierPos(tenantId: string, supplierId: string) {
  const fn = useServerFn(listPurchaseOrders);
  return useQuery({
    queryKey: ["pharmacy-sup-pos", tenantId, supplierId],
    queryFn: () => fn({ data: { tenantId, supplierId, limit: 200 } as never }),
    enabled: !!tenantId && !!supplierId,
  });
}

// ---------------------------------------------------------------------------
// SupplierProfile
// ---------------------------------------------------------------------------
export function SupplierProfile({ tenantId, supplierId }: { tenantId: string; supplierId: string }) {
  const s = useSupplier(tenantId, supplierId);
  if (!s) return <div className="text-sm text-muted-foreground p-8">Supplier not found.</div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" /> {s.name}
          {s.meta?.preferred && <Badge variant="secondary" className="text-[10px]">Preferred</Badge>}
          {!s.is_active && <Badge variant="destructive" className="text-[10px]">Inactive</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
        <Field label="Code" value={s.code} />
        <Field label="Legal name" value={s.legal_name ?? "—"} />
        <Field label="Contact person" value={s.contact_person ?? "—"} />
        <Field label="Lead time (days)" value={s.lead_time_days ?? "—"} />
        <Field label="Payment terms" value={s.payment_terms ?? "—"} />
        <Field label="Rating" value={s.meta?.rating != null ? s.meta.rating.toFixed(1) : "—"} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SupplierScorecard — display-only. Server aggregates from PO history.
// ---------------------------------------------------------------------------
export function SupplierScorecard({ tenantId, supplierId }: { tenantId: string; supplierId: string }) {
  const s = useSupplier(tenantId, supplierId);
  const q = useSupplierPos(tenantId, supplierId);
  const rows = ((q.data as { rows?: PoRow[] } | undefined)?.rows ?? []) as PoRow[];
  const stats = useMemo(() => {
    const total = rows.length;
    const received = rows.filter((r) => r.status === "received").length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    const spend = rows.reduce((sum, r) => sum + Number(r.total_amount ?? 0), 0);
    const onTime = total > 0 ? Math.round((received / total) * 100) : 0;
    return { total, received, cancelled, spend, onTime };
  }, [rows]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Scorecard</CardTitle></CardHeader>
      <CardContent>
        <KpiGrid>
          <KpiCard label="POs" value={stats.total} />
          <KpiCard label="Received" value={stats.received} tone="success" />
          <KpiCard label="Cancelled" value={stats.cancelled} tone="danger" />
          <KpiCard label="Fulfilment %" value={`${stats.onTime}%`} tone="info" />
          <KpiCard label="Lifetime spend" value={stats.spend.toFixed(2)} />
          <KpiCard label="Rating" value={s?.meta?.rating != null ? s.meta.rating.toFixed(1) : "—"} tone="info" />
        </KpiGrid>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SupplierPerformanceChart — sparkline-style bar chart of monthly PO counts
// ---------------------------------------------------------------------------
export function SupplierPerformanceChart({ tenantId, supplierId }: { tenantId: string; supplierId: string }) {
  const q = useSupplierPos(tenantId, supplierId);
  const rows = ((q.data as { rows?: PoRow[] } | undefined)?.rows ?? []) as PoRow[];
  const monthly = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      if (!r.po_date) continue;
      const d = new Date(r.po_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [rows]);
  const max = Math.max(1, ...monthly.map(([, v]) => v));
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">PO trend (last 12 months)</CardTitle></CardHeader>
      <CardContent>
        {monthly.length === 0 ? (
          <div className="text-sm text-muted-foreground">No purchase history yet.</div>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {monthly.map(([k, v]) => (
              <div key={k} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/70 rounded-t"
                  style={{ height: `${(v / max) * 100}%` }}
                  title={`${k}: ${v}`}
                />
                <span className="text-[9px] text-muted-foreground rotate-45 origin-left">{k.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SupplierProductsGrid — sourced from supplier.meta.products (server-owned)
// ---------------------------------------------------------------------------
export function SupplierProductsGrid({ tenantId, supplierId }: { tenantId: string; supplierId: string }) {
  const q = useSupplierPos(tenantId, supplierId);
  const rows = ((q.data as { rows?: PoRow[] } | undefined)?.rows ?? []) as PoRow[];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent purchase orders</CardTitle></CardHeader>
      <CardContent>
        <DataGrid<PoRow>
          rows={rows}
          getRowId={(r) => r.id}
          emptyMessage="No purchase orders for this supplier yet."
          columns={[
            { id: "no", header: "PO #", cell: (r) => r.po_number ?? r.id.slice(0, 8) },
            { id: "date", header: "Date", cell: (r) => (r.po_date ? new Date(r.po_date).toLocaleDateString() : "—") },
            { id: "amt", header: "Amount", cell: (r) => (r.total_amount != null ? r.total_amount.toFixed(2) : "—") },
            { id: "status", header: "Status", cell: (r) => <Badge variant="outline">{r.status}</Badge> },
          ]}
        />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SupplierLicensePanel — GST & drug license
// ---------------------------------------------------------------------------
export function SupplierLicensePanel({ tenantId, supplierId }: { tenantId: string; supplierId: string }) {
  const s = useSupplier(tenantId, supplierId);
  if (!s) return null;
  const extra = s.meta?.licenses ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Licenses</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono">{s.gstin ?? "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Drug licence</span><span className="font-mono">{s.drug_license_no ?? "—"}</span></div>
        {extra.map((l, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-muted-foreground">{l.type}</span>
            <span className="font-mono">{l.number} {l.expiry ? `(exp ${l.expiry})` : ""}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SupplierContactsPanel
// ---------------------------------------------------------------------------
export function SupplierContactsPanel({ tenantId, supplierId }: { tenantId: string; supplierId: string }) {
  const s = useSupplier(tenantId, supplierId);
  if (!s) return null;
  const contacts = s.meta?.contacts ?? [];
  const addr = (s.address ?? {}) as Record<string, string>;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Contacts &amp; address</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2"><Phone className="h-4 w-4 opacity-60" /> {s.phone ?? "—"}</div>
        <div className="flex items-center gap-2"><Mail className="h-4 w-4 opacity-60" /> {s.email ?? "—"}</div>
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 opacity-60 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            {[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ") || "No address on file"}
          </div>
        </div>
        {contacts.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className="flex justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.role ?? "—"}</div>
                </div>
                <div className="text-xs text-right text-muted-foreground">
                  {c.phone ?? ""}<br />{c.email ?? ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
