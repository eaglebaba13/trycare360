/**
 * Visual page builder — device-responsive preview + JSON blocks editor +
 * publishing workflow (draft / in_review / scheduled / published / archived
 * / rollback). Consumes existing block registry via /cms preview.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Tablet, Smartphone, Undo2, Send, Clock, Archive, FileEdit, GitPullRequest } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import {
  adminGetPage, adminSavePageDraft, adminTransitionPage,
  adminListPublishLog, adminRollbackPage, adminAuditPage,
  adminListSections,
} from "@/lib/cms/marketing.functions";
import { BlockRenderer, type CmsBlock, BLOCK_REGISTRY_KEYS } from "@/lib/cms/blocks";

export const Route = createFileRoute("/_authenticated/cms/builder/$pageId")({
  component: BuilderPage,
});

function BuilderPage() {
  const { pageId } = Route.useParams();
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId ?? "";
  const qc = useQueryClient();

  const getFn = useServerFn(adminGetPage);
  const saveFn = useServerFn(adminSavePageDraft);
  const transFn = useServerFn(adminTransitionPage);
  const logFn = useServerFn(adminListPublishLog);
  const rollbackFn = useServerFn(adminRollbackPage);
  const auditFn = useServerFn(adminAuditPage);
  const sectionsFn = useServerFn(adminListSections);

  const { data: page } = useQuery({
    queryKey: ["cms-page", pageId],
    queryFn: () => getFn({ data: { id: pageId } }),
  });
  const { data: sections = [] } = useQuery({ queryKey: ["cms-sections"], queryFn: () => sectionsFn() });
  const { data: log = [] } = useQuery({
    queryKey: ["cms-publish-log", pageId],
    queryFn: () => logFn({ data: { page_id: pageId } }),
  });

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [blocksJson, setBlocksJson] = useState<string>("");
  const [scheduleAt, setScheduleAt] = useState<string>("");

  useMemo(() => {
    if (page && !blocksJson) setBlocksJson(JSON.stringify(page.blocks ?? [], null, 2));
  }, [page, blocksJson]);

  const parsedBlocks: CmsBlock[] = useMemo(() => {
    try {
      const v = JSON.parse(blocksJson || "[]");
      return Array.isArray(v) ? (v as CmsBlock[]) : [];
    } catch {
      return (page?.blocks ?? []) as CmsBlock[];
    }
  }, [blocksJson, page]);

  const saveMut = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      saveFn({ data: { id: pageId, tenant_id: tenantId, patch } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["cms-page", pageId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const transMut = useMutation({
    mutationFn: (target: "draft" | "in_review" | "scheduled" | "published" | "archived") =>
      transFn({
        data: { id: pageId, tenant_id: tenantId, target, scheduled_at: target === "scheduled" ? scheduleAt || undefined : undefined },
      }),
    onSuccess: (_d, target) => {
      toast.success(`Moved to ${target}`);
      qc.invalidateQueries({ queryKey: ["cms-page", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-publish-log", pageId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rollbackMut = useMutation({
    mutationFn: (log_id: string) => rollbackFn({ data: { log_id, tenant_id: tenantId } }),
    onSuccess: () => {
      toast.success("Rolled back");
      qc.invalidateQueries({ queryKey: ["cms-page", pageId] });
      qc.invalidateQueries({ queryKey: ["cms-publish-log", pageId] });
      setBlocksJson("");
    },
  });
  const auditMut = useMutation({
    mutationFn: () => auditFn({ data: { page_id: pageId, tenant_id: tenantId } }),
    onSuccess: (r: { score: number; issues: unknown[] }) => toast.success(`SEO score ${r.score}/100`),
  });

  const insertSection = (block: unknown) => {
    const b = block as { type?: string };
    const arr = parsedBlocks.concat([{ id: crypto.randomUUID().slice(0, 8), type: b.type ?? "hero", data: (b as { data?: Record<string, unknown> }).data ?? {} }]);
    setBlocksJson(JSON.stringify(arr, null, 2));
  };

  if (!page) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  const previewWidth = device === "desktop" ? "100%" : device === "tablet" ? "820px" : "420px";

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr_320px]">
      {/* Left: block palette */}
      <Card className="p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Block palette</div>
        <div className="grid grid-cols-2 gap-2">
          {BLOCK_REGISTRY_KEYS.map((k) => (
            <Button key={k} variant="outline" size="sm" className="justify-start"
              onClick={() => insertSection({ type: k, data: {} })}>
              + {k}
            </Button>
          ))}
        </div>
        <div className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved sections</div>
        <div className="space-y-1">
          {(sections as Array<Record<string, unknown>>).map((s) => (
            <Button key={s.id as string} variant="ghost" size="sm" className="w-full justify-start"
              onClick={() => insertSection(s.block)}>
              + {s.name as string}
            </Button>
          ))}
          {(sections as unknown[]).length === 0 && <div className="text-xs text-muted-foreground">No saved sections yet.</div>}
        </div>
      </Card>

      {/* Middle: canvas + editor */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="font-semibold">{page.title as string}</div>
            <Badge variant="outline">{page.status as string}</Badge>
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button size="icon" variant={device === "desktop" ? "secondary" : "ghost"} onClick={() => setDevice("desktop")}><Monitor className="h-4 w-4" /></Button>
            <Button size="icon" variant={device === "tablet" ? "secondary" : "ghost"} onClick={() => setDevice("tablet")}><Tablet className="h-4 w-4" /></Button>
            <Button size="icon" variant={device === "mobile" ? "secondary" : "ghost"} onClick={() => setDevice("mobile")}><Smartphone className="h-4 w-4" /></Button>
          </div>
        </div>

        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="blocks">Blocks JSON</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <div className="mx-auto overflow-hidden rounded-xl border bg-background" style={{ maxWidth: previewWidth }}>
              <div className="max-h-[70vh] overflow-y-auto">
                <BlockRenderer blocks={parsedBlocks} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="blocks">
            <Textarea rows={22} className="font-mono text-xs" value={blocksJson} onChange={(e) => setBlocksJson(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <Button onClick={() => saveMut.mutate({ blocks: JSON.parse(blocksJson) })} disabled={saveMut.isPending}>Save draft</Button>
              <Button variant="outline" onClick={() => setBlocksJson(JSON.stringify(page.blocks ?? [], null, 2))}>Reset</Button>
            </div>
          </TabsContent>
          <TabsContent value="seo">
            <SeoEditor page={page} onSave={(patch) => saveMut.mutate(patch)} onAudit={() => auditMut.mutate()} />
          </TabsContent>
          <TabsContent value="tracking">
            <TrackingEditor page={page} onSave={(patch) => saveMut.mutate(patch)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: publish + history */}
      <Card className="p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publishing</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => transMut.mutate("draft")}><FileEdit className="mr-1 h-3 w-3" /> Draft</Button>
          <Button size="sm" variant="outline" onClick={() => transMut.mutate("in_review")}><GitPullRequest className="mr-1 h-3 w-3" /> Review</Button>
          <Button size="sm" onClick={() => transMut.mutate("published")}><Send className="mr-1 h-3 w-3" /> Publish</Button>
          <Button size="sm" variant="ghost" onClick={() => transMut.mutate("archived")}><Archive className="mr-1 h-3 w-3" /> Archive</Button>
        </div>
        <div className="mt-3">
          <Label className="text-xs">Schedule publish</Label>
          <div className="flex gap-2">
            <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value ? new Date(e.target.value).toISOString() : "")} />
            <Button size="sm" variant="outline" onClick={() => transMut.mutate("scheduled")}><Clock className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</div>
        <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
          {(log as Array<Record<string, unknown>>).map((l) => (
            <div key={l.id as string} className="flex items-center justify-between rounded-md border p-2 text-xs">
              <div>
                <div className="font-medium">{l.action as string}</div>
                <div className="text-muted-foreground">{new Date(l.created_at as string).toLocaleString()}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => rollbackMut.mutate(l.id as string)} title="Rollback">
                <Undo2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {(log as unknown[]).length === 0 && <div className="text-xs text-muted-foreground">No history yet.</div>}
        </div>
      </Card>
    </div>
  );
}

function SeoEditor({ page, onSave, onAudit }: { page: Record<string, unknown>; onSave: (p: Record<string, unknown>) => void; onAudit: () => void }) {
  const seo = (page.seo ?? {}) as Record<string, unknown>;
  const [description, setDescription] = useState((seo.description as string) ?? "");
  const [ogImage, setOgImage] = useState((page.og_image_url as string) ?? "");
  return (
    <div className="space-y-3">
      <div><Label>Meta description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div><Label>OG image URL</Label><Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} /></div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave({ seo: { ...seo, description }, og_image_url: ogImage })}>Save</Button>
        <Button size="sm" variant="outline" onClick={onAudit}>Run SEO audit</Button>
      </div>
      {page.seo_score != null && <div className="text-sm">Latest score: <strong>{page.seo_score as number}/100</strong></div>}
    </div>
  );
}

function TrackingEditor({ page, onSave }: { page: Record<string, unknown>; onSave: (p: Record<string, unknown>) => void }) {
  const tracking = (page.tracking ?? {}) as Record<string, unknown>;
  const utm = (page.utm_defaults ?? {}) as Record<string, string>;
  const [goal, setGoal] = useState((page.goal_event as string) ?? "lead_submit");
  const [campaign, setCampaign] = useState((page.campaign_id as string) ?? "");
  const [source, setSource] = useState(utm.utm_source ?? "");
  const [medium, setMedium] = useState(utm.utm_medium ?? "");
  return (
    <div className="space-y-3">
      <div><Label>Goal event</Label><Select value={goal} onValueChange={setGoal}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="lead_submit">lead_submit</SelectItem>
        <SelectItem value="cta_click">cta_click</SelectItem>
        <SelectItem value="page_view">page_view</SelectItem>
      </SelectContent></Select></div>
      <div><Label>Campaign ID</Label><Input value={campaign} onChange={(e) => setCampaign(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><Label>Default utm_source</Label><Input value={source} onChange={(e) => setSource(e.target.value)} /></div>
        <div><Label>Default utm_medium</Label><Input value={medium} onChange={(e) => setMedium(e.target.value)} /></div>
      </div>
      <Button size="sm" onClick={() => onSave({ goal_event: goal, campaign_id: campaign, utm_defaults: { ...utm, utm_source: source, utm_medium: medium }, tracking })}>Save</Button>
    </div>
  );
}
