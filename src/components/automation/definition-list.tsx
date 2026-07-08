/**
 * Metadata-driven definition list.
 * Renders name / description / active state, an inline JSON editor for the
 * configuration blob (schema / graph / definition / levels / ...), and
 * add/edit/delete/save/toggle actions.
 *
 * Every list page in the automation portal composes this.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type ExtraField =
  | { key: string; label: string; type: "text" | "textarea"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; placeholder?: string }
  | { key: string; label: string; type: "json"; placeholder?: string; help?: string };

export type DefinitionListProps<TRow extends { id: string; name?: string; code?: string; is_active?: boolean }> = {
  title: string;
  description?: string;
  rows: TRow[];
  isLoading?: boolean;
  extraFields?: ExtraField[];
  /** Additional columns to render in the table. */
  columns?: { key: string; label: string; render?: (row: TRow) => ReactNode; width?: string }[];
  buildPayload: (form: Record<string, unknown>) => Record<string, unknown>;
  onSave: (row: Record<string, unknown>) => Promise<unknown>;
  onDelete?: (row: TRow) => Promise<unknown>;
  onRun?: (row: TRow) => Promise<unknown>;
  onRefresh: () => void;
  emptyText?: string;
  defaultDraft?: Record<string, unknown>;
};

export function DefinitionList<TRow extends { id: string; name?: string; code?: string; is_active?: boolean }>({
  title,
  description,
  rows,
  isLoading,
  extraFields = [],
  columns = [],
  buildPayload,
  onSave,
  onDelete,
  onRun,
  onRefresh,
  emptyText = "Nothing here yet.",
  defaultDraft = {},
}: DefinitionListProps<TRow>) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<TRow | null>(null);

  const save = useMutation({
    mutationFn: (form: Record<string, unknown>) => onSave(buildPayload(form)),
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
      onRefresh();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (row: TRow) => onDelete!(row),
    onSuccess: () => {
      toast.success("Deleted");
      setToDelete(null);
      onRefresh();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const run = useMutation({
    mutationFn: (row: TRow) => onRun!(row),
    onSuccess: () => {
      toast.success("Run queued");
      onRefresh();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{description}</p>}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing({ is_active: true, ...defaultDraft });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-40">Code</TableHead>
              {columns.map((c) => (
                <TableHead key={c.key} style={{ width: c.width }}>{c.label}</TableHead>
              ))}
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4 + columns.length} className="text-center py-8 text-sm text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4 + columns.length} className="text-center py-8 text-sm text-muted-foreground">{emptyText}</TableCell></TableRow>
            ) : rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.code ?? "—"}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key}>
                    {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? "—")}
                  </TableCell>
                ))}
                <TableCell>
                  <Badge variant={row.is_active ? "default" : "outline"}>
                    {row.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {onRun && (
                      <Button variant="ghost" size="icon" title="Run" disabled={run.isPending}
                        onClick={() => run.mutate(row)}>
                        <Play className="h-3.5 w-3.5 text-primary" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Edit"
                      onClick={() => { setEditing(row as unknown as Record<string, unknown>); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {onDelete && (
                      <Button variant="ghost" size="icon" title="Delete"
                        onClick={() => setToDelete(row)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing && "id" in editing ? "Edit" : "Add"} — {title.slice(0, -1)}</DialogTitle>
          </DialogHeader>
          {editing && <EditorBody value={editing} onChange={setEditing} extraFields={extraFields} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>Related history may be removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && del.mutate(toDelete)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function EditorBody({
  value, onChange, extraFields,
}: {
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  extraFields: ExtraField[];
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });

  const jsonState = useMemo(() => new Map<string, string>(), []);
  const getJsonText = (k: string) => {
    if (jsonState.has(k)) return jsonState.get(k)!;
    const v = value[k];
    return v ? JSON.stringify(v, null, 2) : "";
  };

  return (
    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Name<span className="text-destructive ml-0.5">*</span></Label>
          <Input value={(value.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Code<span className="text-destructive ml-0.5">*</span></Label>
          <Input className="font-mono" value={(value.code as string) ?? ""}
            onChange={(e) => set("code", e.target.value.replace(/\s+/g, "_").toLowerCase())} />
        </div>
      </div>

      {extraFields.map((f) => {
        if (f.type === "text") {
          return (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input value={(value[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          );
        }
        if (f.type === "textarea") {
          return (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Textarea rows={2} value={(value[f.key] as string) ?? ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
            </div>
          );
        }
        if (f.type === "select") {
          return (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Select value={(value[f.key] as string) ?? ""} onValueChange={(v) => set(f.key, v)}>
                <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Select…"} /></SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Textarea
              className="font-mono text-xs"
              rows={8}
              defaultValue={getJsonText(f.key)}
              placeholder={f.placeholder ?? "{}"}
              onChange={(e) => {
                jsonState.set(f.key, e.target.value);
                try {
                  set(f.key, e.target.value.trim() ? JSON.parse(e.target.value) : null);
                } catch {
                  // keep raw text; validation on save
                }
              }}
            />
            {"help" in f && f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
          </div>
        );
      })}

      <div className="flex items-center gap-2 pt-2">
        <Switch checked={!!value.is_active} onCheckedChange={(v) => set("is_active", v)} />
        <Label className="cursor-pointer">Active</Label>
      </div>
    </div>
  );
}
