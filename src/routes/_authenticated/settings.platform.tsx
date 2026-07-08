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
import { PermissionGuard } from "@/components/permission-guard";

export const Route = createFileRoute("/_authenticated/settings/platform")({
  component: PlatformSettingsPage,
});

type Setting = {
  key: string;
  value: unknown;
  category: string | null;
  description: string | null;
};

function PlatformSettingsPage() {
  const list = useServerFn(listRows);
  const upsert = useServerFn(upsertRow);
  const del = useServerFn(deleteRow);
  const qc = useQueryClient();
  const key = ["config", "platform_settings"];

  const { data: rows = [] } = useQuery({
    queryKey: key,
    queryFn: () =>
      list({ data: { table: "platform_settings", orderBy: { column: "key" } } }) as Promise<Setting[]>,
  });

  const [draft, setDraft] = useState({ key: "", value: "{}", category: "", description: "" });

  const save = useMutation({
    mutationFn: async (row: typeof draft) => {
      let parsed: unknown = row.value;
      try { parsed = JSON.parse(row.value); } catch { /* keep */ }
      return upsert({
        data: {
          table: "platform_settings",
          row: { key: row.key, value: parsed, category: row.category || null, description: row.description || null },
          onConflict: "key",
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
    <PermissionGuard roles={["super_admin", "platform_admin", "admin"]} fallback={
      <PageContainer title="Platform Settings">
        <Card className="p-6 text-sm text-muted-foreground">Only administrators can access platform settings.</Card>
      </PageContainer>
    }>
      <PageContainer
        title="Platform Settings"
        description="Cross-tenant platform-level settings. Only administrators can view or edit."
      >
        <Card className="p-4 mb-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} placeholder="platform.branding.primary_color" />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
            </div>
            <Button onClick={() => save.mutate(draft)} disabled={!draft.key || save.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-display font-semibold mb-3">Current platform settings</div>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No platform settings yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <PlatformRow
                  key={r.key}
                  row={r}
                  onDelete={() => del({ data: { table: "platform_settings", id: r.key, idColumn: "key" } }).then(() => qc.invalidateQueries({ queryKey: key }))}
                  onSaved={() => qc.invalidateQueries({ queryKey: key })}
                />
              ))}
            </div>
          )}
        </Card>
      </PageContainer>
    </PermissionGuard>
  );
}

function PlatformRow({ row, onDelete, onSaved }: { row: Setting; onDelete: () => void; onSaved: () => void }) {
  const upsert = useServerFn(upsertRow);
  const [value, setValue] = useState(JSON.stringify(row.value, null, 2));
  const save = async () => {
    let parsed: unknown = value;
    try { parsed = JSON.parse(value); } catch { /* keep */ }
    try {
      await upsert({
        data: {
          table: "platform_settings",
          row: { key: row.key, value: parsed, category: row.category, description: row.description },
          onConflict: "key",
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
