/**
 * Generic entity manager used by every CMS admin list screen.
 * Table + tenant are passed in; row shape is dynamic (uses `title | name`
 * for display + a JSON editor drawer for full editing).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminList, adminUpsert, adminDelete, adminPublish } from "@/lib/api/cms.functions";

type Row = Record<string, unknown>;

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "json" | "url";
  placeholder?: string;
  required?: boolean;
};

export type EntityConfig = {
  table: string;
  singular: string;
  plural: string;
  titleField: "title" | "name";
  hasStatus?: boolean;
  publicPath?: (row: Row) => string;
  fields: FieldDef[];
};

const STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export function EntityManager({ tenantId, config }: { tenantId: string; config: EntityConfig }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminList);
  const upsertFn = useServerFn(adminUpsert);
  const deleteFn = useServerFn(adminDelete);
  const publishFn = useServerFn(adminPublish);

  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);

  const key = ["cms-admin", config.table, tenantId];
  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => listFn({ data: { table: config.table, tenant_id: tenantId, limit: 500 } }),
    enabled: !!tenantId,
  });

  const upsert = useMutation({
    mutationFn: (row: Row) => upsertFn({ data: { table: config.table, tenant_id: tenantId, row } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(`${config.singular} saved`);
      setEditing(null);
      setCreating(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { table: config.table, tenant_id: tenantId, id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success(`${config.singular} deleted`);
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const publish = useMutation({
    mutationFn: ({ id, status }: { id: string; status: (typeof STATUSES)[number] }) =>
      publishFn({ data: { table: config.table, tenant_id: tenantId, id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Publish failed"),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{config.plural}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the {config.plural.toLowerCase()} shown on the public website.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" /> New {config.singular.toLowerCase()}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (rows as Row[]).length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            No {config.plural.toLowerCase()} yet. Click "New {config.singular.toLowerCase()}" to create one.
          </div>
        ) : (
          <div className="divide-y">
            {(rows as Row[]).map((r) => {
              const id = r.id as string;
              const title = (r[config.titleField] as string) ?? "(untitled)";
              const status = r.status as string | undefined;
              const slug = r.slug as string | undefined;
              return (
                <div key={id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{title}</div>
                      {status && (
                        <Badge variant={status === "published" ? "default" : "outline"} className="text-[10px]">
                          {status}
                        </Badge>
                      )}
                    </div>
                    {slug && <div className="text-xs text-muted-foreground">/{slug}</div>}
                  </div>
                  {config.hasStatus && (
                    <Select value={status ?? "draft"} onValueChange={(v) => publish.mutate({ id, status: v as (typeof STATUSES)[number] })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {config.publicPath && status === "published" && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={config.publicPath(r)} target="_blank" rel="noreferrer" title="View live">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(r)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {(editing || creating) && (
        <EditorSheet
          config={config}
          initial={editing ?? {}}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => upsert.mutate(row)}
          saving={upsert.isPending}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {config.singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone. The item will be removed from the public site immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && remove.mutate(deleteTarget.id as string)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditorSheet({
  config, initial, onClose, onSave, saving,
}: {
  config: EntityConfig;
  initial: Row;
  onClose: () => void;
  onSave: (row: Row) => void;
  saving: boolean;
}) {
  const [values, setValues] = useState<Row>(() => ({ ...initial }));
  function set(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const out: Row = { ...values };
    // Coerce JSON fields
    for (const f of config.fields) {
      if (f.type === "json" && typeof out[f.key] === "string") {
        try { out[f.key] = JSON.parse(out[f.key] as string); }
        catch { toast.error(`Invalid JSON in "${f.label}"`); return; }
      }
      if (f.type === "number" && out[f.key] !== undefined && out[f.key] !== "") {
        out[f.key] = Number(out[f.key]);
      }
      if (out[f.key] === "") out[f.key] = null;
    }
    onSave(out);
  }
  const isNew = !initial.id;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? `New ${config.singular}` : `Edit ${config.singular}`}</SheetTitle>
          <SheetDescription>Fields marked optional can be left blank.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {config.fields.map((f) => {
            const raw = values[f.key];
            const value =
              f.type === "json"
                ? typeof raw === "string" ? raw : raw ? JSON.stringify(raw, null, 2) : ""
                : raw == null ? "" : String(raw);
            return (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>
                  {f.label}
                  {f.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                {f.type === "textarea" || f.type === "json" ? (
                  <Textarea
                    id={f.key}
                    value={value}
                    onChange={(e) => set(f.key, e.target.value)}
                    rows={f.type === "json" ? 8 : 4}
                    placeholder={f.placeholder}
                    className={f.type === "json" ? "font-mono text-xs" : undefined}
                    required={f.required}
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                    value={value}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                )}
              </div>
            );
          })}
          {config.hasStatus && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={(values.status as string) ?? "draft"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <SheetFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
