/**
 * Reusable CRUD table.
 * Drive it with a column spec + a table name — used for every master, territory
 * level, company, brand, GST, bank, address, and branch screen.
 */
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listRows, upsertRow, deleteRow, type ConfigTable } from "@/lib/api/config.functions";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "hidden";

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean | null;
  hideInTable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
  width?: string;
};

export type CrudTableProps = {
  table: ConfigTable;
  fields: FieldSpec[];
  filters?: Record<string, string | number | boolean | null>;
  orderBy?: { column: string; ascending?: boolean };
  title?: string;
  description?: string;
  searchKey?: string;
  emptyText?: string;
  /** Extra values injected into every insert (e.g. tenant_id, parent id). */
  contextValues?: Record<string, unknown>;
  queryKeyExtra?: unknown[];
};

export function CrudTable({
  table,
  fields,
  filters,
  orderBy,
  title,
  description,
  searchKey,
  emptyText = "No records yet.",
  contextValues,
  queryKeyExtra = [],
}: CrudTableProps) {
  const list = useServerFn(listRows);
  const upsert = useServerFn(upsertRow);
  const del = useServerFn(deleteRow);
  const qc = useQueryClient();
  const queryKey = ["config", table, filters, orderBy, ...queryKeyExtra];

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => list({ data: { table, filters, orderBy, limit: 500 } }),
  });

  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState("");

  const visibleFields = fields.filter((f) => !f.hideInTable && f.type !== "hidden");
  const filtered = useMemo(() => {
    if (!search || !searchKey) return rows;
    const s = search.toLowerCase();
    return (rows as Record<string, unknown>[]).filter((r) =>
      String(r[searchKey] ?? "").toLowerCase().includes(s),
    );
  }, [rows, search, searchKey]);

  const saveMut = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const merged = { ...contextValues, ...row };
      return upsert({ data: { table, row: merged } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Saved");
      setOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => del({ data: { table, id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Deleted");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          {title && <h3 className="font-display text-lg font-semibold">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {searchKey && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-8 h-9 w-56"
              />
            </div>
          )}
          <Button
            size="sm"
            onClick={() => {
              const draft: Record<string, unknown> = {};
              for (const f of fields) {
                if (f.defaultValue !== undefined) draft[f.key] = f.defaultValue;
              }
              setEditing(draft);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleFields.map((f) => (
                <TableHead key={f.key} style={{ width: f.width }}>
                  {f.label}
                </TableHead>
              ))}
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 1} className="text-center text-sm text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleFields.length + 1} className="text-center text-sm text-muted-foreground py-8">
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              (filtered as Record<string, unknown>[]).map((row) => (
                <TableRow key={String(row.id ?? row.code ?? row.key)}>
                  {visibleFields.map((f) => (
                    <TableCell key={f.key}>{renderCell(f, row)}</TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(row);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit" : "Add"} {title ?? "record"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <RecordForm
              fields={fields}
              value={editing}
              onChange={setEditing}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>
              Cancel
            </Button>
            <Button
              onClick={() => editing && saveMut.mutate(editing)}
              disabled={saveMut.isPending}
            >
              {saveMut.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Related records may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete?.id && deleteMut.mutate(String(confirmDelete.id))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function renderCell(f: FieldSpec, row: Record<string, unknown>) {
  const v = row[f.key];
  if (f.render) return f.render(v, row);
  if (f.type === "boolean") {
    return <Badge variant={v ? "default" : "outline"}>{v ? "Active" : "Inactive"}</Badge>;
  }
  if (f.type === "select" && f.options) {
    return f.options.find((o) => o.value === v)?.label ?? String(v ?? "—");
  }
  if (v === null || v === undefined || v === "") return <span className="text-muted-foreground">—</span>;
  return String(v);
}

function RecordForm({
  fields,
  value,
  onChange,
}: {
  fields: FieldSpec[];
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {fields
        .filter((f) => f.type !== "hidden")
        .map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={f.key}>
              {f.label}
              {f.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                id={f.key}
                value={(value[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={3}
              />
            ) : f.type === "boolean" ? (
              <div className="flex items-center gap-2">
                <Switch
                  id={f.key}
                  checked={!!value[f.key]}
                  onCheckedChange={(v) => set(f.key, v)}
                />
                <span className="text-sm text-muted-foreground">
                  {value[f.key] ? "Active" : "Inactive"}
                </span>
              </div>
            ) : f.type === "number" ? (
              <Input
                id={f.key}
                type="number"
                value={(value[f.key] as number | string) ?? ""}
                onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
                placeholder={f.placeholder}
              />
            ) : f.type === "select" ? (
              <Select
                value={(value[f.key] as string) ?? ""}
                onValueChange={(v) => set(f.key, v)}
              >
                <SelectTrigger id={f.key}>
                  <SelectValue placeholder={f.placeholder ?? "Select…"} />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={f.key}
                value={(value[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
    </div>
  );
}
