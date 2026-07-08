import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/api/integrations.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Copy, Ban } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/settings/integrations/api-keys")({
  component: ApiKeys,
});

function ApiKeys() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const listFn = useServerFn(listApiKeys);
  const createFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);

  const { data = [] } = useQuery({
    queryKey: ["api-keys", activeTenantId],
    queryFn: () => listFn({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [reveal, setReveal] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createFn({ data: { tenantId: activeTenantId!, label, scopes: [] } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setReveal(r.key);
      setLabel("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-x-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-display font-semibold">Platform API keys</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              For external systems that need to call your platform. Only the hash is stored — the raw key is shown once.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Issue key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Issue new API key</DialogTitle></DialogHeader>
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Zapier integration" />
              </div>
              <DialogFooter>
                <Button onClick={() => create.mutate()} disabled={!label || create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Prefix</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data as { id: string; label: string; prefix: string; last_used_at: string | null; is_active: boolean }[]).map((k) => (
              <TableRow key={k.id}>
                <TableCell className="font-medium">{k.label}</TableCell>
                <TableCell><code className="text-xs bg-muted rounded px-1.5 py-0.5">tc_{k.prefix}…</code></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                </TableCell>
                <TableCell><Badge variant={k.is_active ? "default" : "outline"}>{k.is_active ? "Active" : "Revoked"}</Badge></TableCell>
                <TableCell className="text-right">
                  {k.is_active && (
                    <Button size="icon" variant="ghost" onClick={() => revoke.mutate(k.id)}>
                      <Ban className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(data as unknown[]).length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">No API keys yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!reveal} onOpenChange={(v) => !v && setReveal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save this key — it won't be shown again</DialogTitle></DialogHeader>
          <div className="rounded border bg-muted p-3 font-mono text-xs break-all">{reveal}</div>
          <DialogFooter>
            <Button onClick={() => { navigator.clipboard.writeText(reveal ?? ""); toast.success("Copied"); }}>
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
