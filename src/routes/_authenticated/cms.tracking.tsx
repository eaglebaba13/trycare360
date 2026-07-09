/**
 * Site-wide tracking config editor: GA4 ID, GTM ID, Meta Pixel ID, GSC.
 * Persists onto cms_sites.tracking JSON (existing column).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/hooks/use-tenant";
import { adminGetSite, adminUpsertSite } from "@/lib/api/cms.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cms/tracking")({
  component: TrackingPage,
});

function TrackingPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const getFn = useServerFn(adminGetSite);
  const upsertFn = useServerFn(adminUpsertSite);
  const { data: site, refetch } = useQuery({
    queryKey: ["cms-site", tenantId],
    queryFn: () => getFn({ data: { tenant_id: tenantId } }),
    enabled: !!tenantId,
  });

  const tracking = (site?.tracking ?? {}) as Record<string, string>;
  const [ga4, setGa4] = useState("");
  const [gtm, setGtm] = useState("");
  const [pixel, setPixel] = useState("");
  const [gsc, setGsc] = useState("");
  const [capiToken, setCapiToken] = useState("");

  useMemo(() => {
    setGa4(tracking.ga4_id ?? "");
    setGtm(tracking.gtm_id ?? "");
    setPixel(tracking.meta_pixel_id ?? "");
    setGsc(tracking.gsc_verification ?? "");
    setCapiToken(tracking.meta_capi_token_ref ?? "");
  }, [tracking.ga4_id, tracking.gtm_id, tracking.meta_pixel_id, tracking.gsc_verification, tracking.meta_capi_token_ref]);

  const save = useMutation({
    mutationFn: () => upsertFn({ data: { tenant_id: tenantId, patch: { tracking: { ga4_id: ga4, gtm_id: gtm, meta_pixel_id: pixel, gsc_verification: gsc, meta_capi_token_ref: capiToken } } } }),
    onSuccess: () => { toast.success("Tracking saved"); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight">Tracking & pixels</h1>
      <Card className="space-y-4 p-6">
        <div><Label>Google Analytics 4 measurement ID</Label><Input value={ga4} onChange={(e) => setGa4(e.target.value)} placeholder="G-XXXXXXX" /></div>
        <div><Label>Google Tag Manager ID</Label><Input value={gtm} onChange={(e) => setGtm(e.target.value)} placeholder="GTM-XXXXX" /></div>
        <div><Label>Meta Pixel ID</Label><Input value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder="1234567890" /></div>
        <div><Label>Meta Conversions API token secret name</Label><Input value={capiToken} onChange={(e) => setCapiToken(e.target.value)} placeholder="META_CAPI_TOKEN" /></div>
        <div><Label>Google Search Console verification</Label><Input value={gsc} onChange={(e) => setGsc(e.target.value)} placeholder="google-site-verification=..." /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
        <p className="text-xs text-muted-foreground">
          Snippets inject on every public page. Server-side Conversions API events are dispatched via the integration layer using the referenced secret.
        </p>
      </Card>
    </div>
  );
}
