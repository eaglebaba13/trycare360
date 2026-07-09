import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { adminSeoDashboard, adminAuditPage } from "@/lib/cms/marketing.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/cms/seo")({
  component: SeoPage,
});

function scoreColor(s: number | null | undefined) {
  if (s == null) return "bg-muted text-muted-foreground";
  if (s >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s >= 50) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-destructive/15 text-destructive";
}

function SeoPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const dash = useServerFn(adminSeoDashboard);
  const audit = useServerFn(adminAuditPage);
  const { data: pages = [], refetch } = useQuery({
    queryKey: ["cms-seo-dash", tenantId],
    queryFn: () => dash({ data: { tenant_id: tenantId } }),
    enabled: !!tenantId,
  });
  const auditMut = useMutation({
    mutationFn: (id: string) => audit({ data: { page_id: id, tenant_id: tenantId } }),
    onSuccess: (r: { score: number }) => { toast.success(`Score ${r.score}/100`); refetch(); },
  });

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight">SEO manager</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Meta checker, alt/canonical/schema validation and Core Web Vitals-ready scoring per page.
      </p>
      <div className="grid gap-2">
        {pages.map((p) => (
          <Card key={p.id as string} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{p.title as string}</div>
              <div className="text-xs text-muted-foreground">
                <Badge variant="outline" className="mr-2">{p.status as string}</Badge>
                {p.path as string}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${scoreColor(p.seo_score as number)}`}>
                {p.seo_score != null ? `${p.seo_score}/100` : "not scored"}
              </span>
              <Button size="sm" variant="outline" onClick={() => auditMut.mutate(p.id as string)}>Run audit</Button>
              <Link to="/cms/builder/$pageId" params={{ pageId: p.id as string }} className="text-sm font-medium text-primary hover:underline">
                Edit →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
