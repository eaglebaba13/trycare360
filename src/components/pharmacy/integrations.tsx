/**
 * Phase 2.6 Stage 5 — Pharmacy Integrations panels.
 *
 * Displays the status of pharmacy-related connectors (supplier EDI, email,
 * e-invoice, label printer, IoT temperature) sourced from the platform
 * Integration Center. All test/dispatch calls go through the existing
 * `testConnection` server function which uses the Integration Dispatcher —
 * this UI never touches external APIs directly.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  listConnections,
  testConnection,
} from "@/lib/api/integrations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug, Truck, Mail, FileText, Printer, Thermometer, ArrowUpRight, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

type Connection = {
  id: string;
  label: string;
  provider_code: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
};

// Pharmacy cares about these five provider codes (dispatched via IntegrationDispatcher).
const PHARMACY_PROVIDERS: Array<{
  code: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { code: "supplier_edi", label: "Supplier EDI", description: "PO dispatch & GRN acknowledgements via supplier EDI", icon: Truck },
  { code: "email", label: "Email (SMTP)", description: "Send POs, PO confirmations, GRN receipts to suppliers", icon: Mail },
  { code: "einvoice_gst", label: "E-Invoice (GST)", description: "IRN generation for tax-compliant invoices", icon: FileText },
  { code: "label_printer", label: "Label Printer", description: "Batch/dispense/shelf labels", icon: Printer },
  { code: "iot_temperature", label: "IoT Temperature", description: "Cold-chain telemetry ingestion", icon: Thermometer },
];

// ---------------------------------------------------------------------------
// IntegrationStatusPanel — overview of pharmacy connectors
// ---------------------------------------------------------------------------
export function IntegrationStatusPanel({ tenantId }: { tenantId: string }) {
  const fn = useServerFn(listConnections);
  const q = useQuery({
    queryKey: ["pharmacy-integrations", tenantId],
    queryFn: () => fn({ data: { tenantId } as never }),
    enabled: !!tenantId,
  });
  const all = (q.data ?? []) as Connection[];
  const byCode = useMemo(() => {
    const map = new Map<string, Connection[]>();
    for (const c of all) {
      if (!map.has(c.provider_code)) map.set(c.provider_code, []);
      map.get(c.provider_code)!.push(c);
    }
    return map;
  }, [all]);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {PHARMACY_PROVIDERS.map((p) => (
        <ConnectorCard
          key={p.code}
          provider={p}
          connections={byCode.get(p.code) ?? []}
          tenantId={tenantId}
          onChange={() => q.refetch()}
        />
      ))}
    </div>
  );
}

function ConnectorCard({
  provider,
  connections,
  tenantId,
  onChange,
}: {
  provider: { code: string; label: string; description: string; icon: LucideIcon };
  connections: Connection[];
  tenantId: string;
  onChange: () => void;
}) {
  const Icon = provider.icon;
  const test = useServerFn(testConnection);
  const doTest = useMutation({
    mutationFn: (id: string) => test({ data: { id } as never }),
    onSuccess: (res: unknown) => {
      const r = res as { ok?: boolean; error?: string };
      if (r.ok) toast.success(`${provider.label} — connection OK`);
      else toast.error(`${provider.label} — ${r.error ?? "failed"}`);
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" /> {provider.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">{provider.description}</p>
        {connections.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            No connection configured. Add one from Settings → Integrations.
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-md border p-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{c.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.last_sync_at ? `Last sync ${new Date(c.last_sync_at).toLocaleString()}` : "Never synced"}
                  </div>
                </div>
                <Badge
                  variant={c.status === "connected" ? "default" : c.status === "error" ? "destructive" : "outline"}
                  className="text-[10px]"
                >
                  {c.status}
                </Badge>
                <Button size="icon" variant="ghost" title="Test connection" disabled={doTest.isPending} onClick={() => doTest.mutate(c.id)}>
                  <PlayCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Link
            to="/settings/integrations/connections/$providerCode"
            params={{ providerCode: provider.code }}
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            Manage <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Named panels — each is a thin wrapper around the IntegrationStatusPanel
// filter, kept for blueprint parity so consumers can compose them individually.
// ---------------------------------------------------------------------------
function SingleProviderPanel({ tenantId, code }: { tenantId: string; code: string }) {
  const provider = PHARMACY_PROVIDERS.find((p) => p.code === code);
  if (!provider) return null;
  const fn = useServerFn(listConnections);
  const q = useQuery({
    queryKey: ["pharmacy-integrations", tenantId],
    queryFn: () => fn({ data: { tenantId } as never }),
    enabled: !!tenantId,
  });
  const conns = ((q.data ?? []) as Connection[]).filter((c) => c.provider_code === code);
  return <ConnectorCard provider={provider} connections={conns} tenantId={tenantId} onChange={() => q.refetch()} />;
}

export function SupplierConnectorPanel({ tenantId }: { tenantId: string }) {
  return <SingleProviderPanel tenantId={tenantId} code="supplier_edi" />;
}
export function DistributorConnectorPanel({ tenantId }: { tenantId: string }) {
  return <SingleProviderPanel tenantId={tenantId} code="email" />;
}
export function EInvoicePanel({ tenantId }: { tenantId: string }) {
  return <SingleProviderPanel tenantId={tenantId} code="einvoice_gst" />;
}
export function LabelPrinterPanel({ tenantId }: { tenantId: string }) {
  return <SingleProviderPanel tenantId={tenantId} code="label_printer" />;
}
export function IoTTemperaturePanel({ tenantId }: { tenantId: string }) {
  return <SingleProviderPanel tenantId={tenantId} code="iot_temperature" />;
}

export function PharmacyIntegrationsHeader() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plug className="h-4 w-4" /> Pharmacy connectors
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        All third-party traffic (supplier EDI, e-invoice, label printers, IoT sensors,
        transactional email) is routed through the platform Integration Dispatcher.
        No pharmacy code calls external APIs directly.
      </CardContent>
    </Card>
  );
}
