import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listWebhooks,
  upsertWebhook,
  deleteWebhook,
  listWebhookEvents,
} from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings/integrations/webhooks")({
  component: Webhooks,
});

function Webhooks() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const listFn = useServerFn(listWebhooks);
  const eventsFn = useServerFn(listWebhookEvents);
  const upsertFn = useServerFn(upsertWebhook);
  const deleteFn = useServerFn(deleteWebhook);

  const { data: hooks = [] } = useQuery({
    queryKey: ["integrations", "webhooks", activeTenantId],
    queryFn: () => listFn({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });
  const { data: events = [] } = useQuery({
    queryKey: ["integrations", "webhook-events", activeTenantId],
    queryFn: () => eventsFn({ data: { tenantId: activeTenantId!, limit: 50 } }),
    enabled: !!activeTenantId,
  });

  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [description, setDescription] = useState("");

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          tenant_id: activeTenantId!,
          url_slug: slug,
          secret_ref: secretRef || null,
          description,
          event_types: [],
        },
      }),
    onSuccess: () => {
      toast.success("Webhook created");
      qc.invalidateQueries({ queryKey: ["integrations", "webhooks"] });
      setOpen(false);
      setSlug("");
      setSecretRef("");
      setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations", "webhooks"] }),
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-x-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-display font-semibold">Endpoints</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste the URL below into the provider dashboard. Signature verification uses HMAC-SHA256.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New endpoint</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create webhook endpoint</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>URL slug</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="razorpay-prod" />
                </div>
                <div className="space-y-1.5">
                  <Label>Secret name (optional)</Label>
                  <Input value={secretRef} onChange={(e) => setSecretRef(e.target.value)} placeholder="RAZORPAY_WEBHOOK_SECRET" />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => save.mutate()} disabled={save.isPending || !slug}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Secret</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(hooks as { id: string; url_slug: string; secret_ref: string | null; is_active: boolean }[]).map((h) => {
              const url = `${baseUrl}/api/public/webhooks/${h.url_slug}`;
              return (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.url_slug}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted rounded px-1.5 py-0.5">{url}</code>
                      <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{h.secret_ref ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant={h.is_active ? "default" : "outline"}>{h.is_active ? "Active" : "Off"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(h.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {(hooks as unknown[]).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No endpoints yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-x-auto">
        <div className="p-4 border-b">
          <h3 className="font-display font-semibold">Recent events</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Signature</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(events as { id: string; created_at: string; event_type: string | null; signature_valid: boolean; error: string | null }[]).map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                <TableCell>{e.event_type ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={e.signature_valid ? "default" : "outline"}>
                    {e.signature_valid ? "verified" : "unverified"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-destructive font-mono">{e.error ?? ""}</TableCell>
              </TableRow>
            ))}
            {(events as unknown[]).length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">No events received yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
