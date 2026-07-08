import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listDocumentFolders, upsertDocumentFolder, deleteDocumentFolder,
  listDocuments, upsertDocument, deleteDocument, listDocumentTags,
} from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Folder, Trash2, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/documents")({
  component: DocumentsPage,
});

type Folder = { id: string; name: string; parent_id: string | null; category: string | null };
type Doc = {
  id: string; name: string; category: string | null; visibility: string;
  folder_id: string | null; entity_type: string | null; entity_id: string | null;
  current_version: number; updated_at: string;
};

const CATEGORIES = ["medical", "invoice", "certificate", "photo", "report", "contract", "other"];

function DocumentsPage() {
  const { activeTenantId } = useTenant();
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [docOpen, setDocOpen] = useState(false);
  const [docForm, setDocForm] = useState<Partial<Doc>>({ visibility: "private" });

  const foldersFn = useServerFn(listDocumentFolders);
  const saveFolder = useServerFn(upsertDocumentFolder);
  const delFolder = useServerFn(deleteDocumentFolder);
  const docsFn = useServerFn(listDocuments);
  const saveDoc = useServerFn(upsertDocument);
  const delDoc = useServerFn(deleteDocument);
  const tagsFn = useServerFn(listDocumentTags);

  const { data: folders = [] } = useQuery({
    queryKey: ["data", "folders", activeTenantId],
    queryFn: () => foldersFn({ data: { tenantId: activeTenantId! } }) as Promise<Folder[]>,
    enabled: !!activeTenantId,
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["data", "docs", activeTenantId, selectedFolder],
    queryFn: () => docsFn({ data: { tenantId: activeTenantId!, folderId: selectedFolder } }) as Promise<Doc[]>,
    enabled: !!activeTenantId,
  });
  const { data: tags = [] } = useQuery({
    queryKey: ["data", "doctags", activeTenantId],
    queryFn: () => tagsFn({ data: { tenantId: activeTenantId! } }),
    enabled: !!activeTenantId,
  });

  const createFolder = useMutation({
    mutationFn: () => saveFolder({ data: { tenant_id: activeTenantId!, name: folderName, parent_id: selectedFolder } }),
    onSuccess: () => { toast.success("Folder created"); setFolderOpen(false); setFolderName(""); qc.invalidateQueries({ queryKey: ["data", "folders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeFolder = useMutation({
    mutationFn: (id: string) => delFolder({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["data", "folders"] }); },
  });
  const createDoc = useMutation({
    mutationFn: () => saveDoc({ data: {
      tenant_id: activeTenantId!,
      folder_id: selectedFolder,
      name: docForm.name!,
      category: docForm.category ?? null,
      visibility: (docForm.visibility as "private" | "tenant" | "public") ?? "private",
      entity_type: docForm.entity_type ?? null,
      entity_id: docForm.entity_id ?? null,
    } }),
    onSuccess: () => { toast.success("Saved"); setDocOpen(false); setDocForm({ visibility: "private" }); qc.invalidateQueries({ queryKey: ["data", "docs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeDoc = useMutation({
    mutationFn: (id: string) => delDoc({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["data", "docs"] }); },
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Folders</h3>
          <Button size="sm" variant="outline" onClick={() => setFolderOpen(true)}><Plus className="h-3 w-3" /></Button>
        </div>
        <div className="space-y-1">
          <button type="button" onClick={() => setSelectedFolder(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm ${selectedFolder === null ? "bg-muted" : "hover:bg-muted/50"}`}>
            <Folder className="h-4 w-4" /> All folders
          </button>
          {folders.map((f) => (
            <div key={f.id} className={`group flex items-center gap-2 rounded ${selectedFolder === f.id ? "bg-muted" : "hover:bg-muted/50"}`}>
              <button type="button" onClick={() => setSelectedFolder(f.id)} className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                <Folder className="h-4 w-4" /> {f.name}
                {f.category && <Badge variant="secondary" className="ml-auto text-xs">{f.category}</Badge>}
              </button>
              <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={() => removeFolder.mutate(f.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">Tags</div>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>)}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">Documents {selectedFolder && `— ${folders.find((f) => f.id === selectedFolder)?.name}`}</h3>
          <Button size="sm" onClick={() => setDocOpen(true)}><Plus className="h-4 w-4 mr-1" />New document</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Linked to</TableHead>
              <TableHead>v</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docs.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No documents.</TableCell></TableRow>
            )}
            {docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{d.name}</TableCell>
                <TableCell>{d.category && <Badge variant="secondary">{d.category}</Badge>}</TableCell>
                <TableCell><Badge variant="outline">{d.visibility}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.entity_type ? `${d.entity_type}:${d.entity_id?.slice(0, 8)}` : "—"}
                </TableCell>
                <TableCell>{d.current_version}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => removeDoc.mutate(d.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New folder</DialogTitle></DialogHeader>
          <div><Label>Name</Label><Input value={folderName} onChange={(e) => setFolderName(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => createFolder.mutate()} disabled={!folderName}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={docForm.name ?? ""} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={docForm.category ?? undefined} onValueChange={(v) => setDocForm({ ...docForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <Select value={docForm.visibility ?? "private"} onValueChange={(v) => setDocForm({ ...docForm, visibility: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Linked entity type</Label><Input value={docForm.entity_type ?? ""} onChange={(e) => setDocForm({ ...docForm, entity_type: e.target.value })} placeholder="lead, patient…" /></div>
              <div><Label>Linked entity id</Label><Input value={docForm.entity_id ?? ""} onChange={(e) => setDocForm({ ...docForm, entity_id: e.target.value })} /></div>
            </div>
            <div className="text-xs text-muted-foreground">Upload wiring is delivered through the Files framework; this creates the metadata record and version 1.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button>
            <Button onClick={() => createDoc.mutate()} disabled={!docForm.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
