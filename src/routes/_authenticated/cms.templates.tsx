import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "sonner";
import {
  adminListTemplates, adminCreatePageFromTemplate,
} from "@/lib/cms/marketing.functions";

export const Route = createFileRoute("/_authenticated/cms/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const list = useServerFn(adminListTemplates);
  const { data: templates = [] } = useQuery({ queryKey: ["cms-templates"], queryFn: () => list() });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Page templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-built healthcare marketing templates. Create a campaign page from any template in seconds.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(templates as Array<Record<string, unknown>>).map((t) => (
          <TemplateCard key={t.id as string} template={t} tenantId={tenantId} />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, tenantId }: { template: Record<string, unknown>; tenantId: string }) {
  const qc = useQueryClient();
  const create = useServerFn(adminCreatePageFromTemplate);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState((template.name as string) ?? "");
  const [slug, setSlug] = useState("");
  const [campaign, setCampaign] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          tenant_id: tenantId,
          template_id: template.id as string,
          title,
          slug: slug || (template.slug as string),
          path: `/${slug || template.slug}`,
          campaign_id: campaign || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Page created from template");
      qc.invalidateQueries({ queryKey: ["cms-pages"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] uppercase">{(template.category as string) ?? "template"}</Badge>
        {template.vertical ? <Badge variant="secondary" className="text-[10px]">{template.vertical as string}</Badge> : null}
      </div>
      <div className="font-semibold">{template.name as string}</div>
      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{(template.description as string) ?? ""}</p>
      <div className="mt-4 flex flex-wrap gap-1">
        {(template.suggested_forms as string[])?.slice(0, 3).map((f) => (
          <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full" disabled={!tenantId}>Use template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create page from "{template.name as string}"</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>Page title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label>Slug / path</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. hair-transplant-mumbai" /></div>
              <div><Label>Campaign ID (optional)</Label><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="e.g. meta-hair-may26" /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => mut.mutate()} disabled={mut.isPending || !title}>Create page</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
