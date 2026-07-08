import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/hooks/use-tenant";
import { adminGetSite, adminUpsertSite } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_authenticated/cms/settings")({
  component: SiteSettingsPage,
});

type Row = Record<string, unknown>;
const FIELDS: Array<{ key: string; label: string; type?: "text" | "textarea" | "url" }> = [
  { key: "brand_name", label: "Brand name" },
  { key: "tagline", label: "Tagline" },
  { key: "logo_url", label: "Logo URL", type: "url" },
  { key: "favicon_url", label: "Favicon URL", type: "url" },
  { key: "primary_color", label: "Primary color (hex)" },
  { key: "accent_color", label: "Accent color (hex)" },
  { key: "contact_email", label: "Contact email" },
  { key: "contact_phone", label: "Contact phone" },
  { key: "robots_directives", label: "Additional robots.txt directives", type: "textarea" },
];

function SiteSettingsPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetSite);
  const upsertFn = useServerFn(adminUpsertSite);
  const [values, setValues] = useState<Row>({});
  const key = ["cms-site", tenantId];

  const { data: site, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => getFn({ data: { tenant_id: tenantId } }),
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (site) setValues(site as Row);
  }, [site]);

  const save = useMutation({
    mutationFn: (patch: Row) => upsertFn({ data: { tenant_id: tenantId, patch } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Site settings saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  if (!tenantId) return <EmptyTenant />;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const patch: Row = {};
    for (const f of FIELDS) patch[f.key] = values[f.key] ?? null;
    save.mutate(patch);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Site settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global branding, contact info and SEO defaults for the public site.</p>
      </div>
      <Card className="p-6">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className={`space-y-2 ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>
                  <Label htmlFor={f.key}>{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      id={f.key}
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      rows={4}
                    />
                  ) : (
                    <Input
                      id={f.key}
                      value={(values[f.key] as string) ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      type={f.type === "url" ? "url" : "text"}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function EmptyTenant() {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      Select a tenant to configure site settings.
    </div>
  );
}
