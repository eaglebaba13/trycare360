import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { listRows, upsertRow, deleteRow } from "@/lib/api/config.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/settings/global")({
  component: GlobalSettingsPage,
});

type Setting = {
  tenant_id: string;
  key: string;
  value: unknown;
  category: string | null;
  description: string | null;
};

function GlobalSettingsPage() {
  const { data: session } = useSession();
  const tenantId = session?.profile?.active_tenant_id ?? null;
  const list = useServerFn(listRows);
  const upsert = useServerFn(upsertRow);
  const del = useServerFn(deleteRow);
  const qc = useQueryClient();
  const key = ["config", "global_settings", tenantId];

  const { data: rows = [] } = useQuery({
    queryKey: key,
    queryFn: () =>
      list({
        data: { table: "global_settings", filters: { tenant_id: tenantId }, orderBy: { column: "key" } },
      }) as Promise<Setting[]>,
    enabled: !!tenantId,
  });

  const [draft, setDraft] = useState({ key: "", value: "{}", category: "", description: "" });

  const save = useMutation({
    mutationFn: async (row: { key: string; value: string; category: string; description: string }) => {
      let parsed: unknown = row.value;
      try { parsed = JSON.parse(row.value); } catch { /* keep as string */ }
      return upsert({
        data: {
          table: "global_settings",
          row: {
            tenant_id: tenantId,
            key: row.key,
            value: parsed,
            category: row.category || null,
            description: row.description || null,
          },
          onConflict: "tenant_id,key",
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Saved");
      setDraft({ key: "", value: "{}", category: "", description: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer
      title="Global Settings"
      description="Tenant-wide key/value settings. Feature toggles, default values, integration switches — read by every module."
    >
      {!tenantId && (
        <Card className="p-4 mb-4 bg-destructive/10 text-sm">
          You must have an active tenant to manage global settings.
        </Card>
      )}

      <Card className="p-4 mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
          <div className="space-y-1.5">
            <Label>Key</Label>
            <Input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="feature.crm.enabled" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="features" />
          </div>
          <div className="space-y-1.5">
            <Label>Value (JSON or text)</Label>
            <Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder='true or {"limit":10}' />
          </div>
          <Button onClick={() => save.mutate(draft)} disabled={!draft.key || !tenantId || save.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label>Description</Label>
          <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What this setting controls" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="font-display font-semibold mb-3">Current settings</div>
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No settings yet.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <SettingRow key={r.key} row={r} tenantId={tenantId!} onDelete={() => del({ data: { table: "global_settings", id: r.key, idColumn: "key" } }).then(() => qc.invalidateQueries({ queryKey: key }))} onSaved={() => qc.invalidateQueries({ queryKey: key })} />
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

function SettingRow({ row, tenantId, onDelete, onSaved }: { row: Setting; tenantId: string; onDelete: () => void; onSaved: () => void }) {
  const upsert = useServerFn(upsertRow);
  const [value, setValue] = useState(JSON.stringify(row.value, null, 2));
  const save = async () => {
    let parsed: unknown = value;
    try { parsed = JSON.parse(value); } catch { /* keep string */ }
    try {
      await upsert({
        data: {
          table: "global_settings",
          row: { tenant_id: tenantId, key: row.key, value: parsed, category: row.category, description: row.description },
          onConflict: "tenant_id,key",
        },
      });
      toast.success(`Updated ${row.key}`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-mono text-sm font-medium">{row.key}</div>
          {row.category && <div className="text-xs text-muted-foreground">{row.category}</div>}
          {row.description && <div className="text-xs text-muted-foreground mt-0.5">{row.description}</div>}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={save}><Save className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
        </div>
      </div>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="font-mono text-xs" />
    </div>
  );
}
