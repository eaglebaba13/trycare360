/** Patient Portal — Documents workspace. */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDocumentSignedUrl,
  listMyDocumentFolders,
  listMyDocuments,
} from "@/lib/patient/documents.functions";
import { formatDate } from "@/lib/standards-format";
import { PatientShell } from "./shell";

type Doc = { id: string; title: string | null; file_name?: string | null; category?: string | null; folder_id?: string | null; created_at: string };
type Folder = { id: string; name: string };

export function DocumentFolders({ folders, active, onPick }: { folders: Folder[]; active: string | null; onPick: (id: string | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant={active === null ? "default" : "outline"} onClick={() => onPick(null)}>All</Button>
      {folders.map((f) => (
        <Button key={f.id} size="sm" variant={active === f.id ? "default" : "outline"} onClick={() => onPick(f.id)}>{f.name}</Button>
      ))}
    </div>
  );
}

export function DocumentViewer({ doc }: { doc: Doc }) {
  const fn = useServerFn(getDocumentSignedUrl);
  const mut = useMutation({
    mutationFn: () => fn({ data: { documentId: doc.id } }),
    onSuccess: (r) => {
      const url = (r as { url?: string }).url;
      if (url) window.open(url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return <Button size="sm" variant="outline" onClick={() => mut.mutate()} disabled={mut.isPending}><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open</Button>;
}

export function DocumentGrid({ items }: { items: Doc[] }) {
  if (items.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">No documents yet.</div>;
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((d) => (
        <Card key={d.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-sm truncate flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />{d.title ?? d.file_name ?? "Document"}
                </CardTitle>
                <div className="text-xs text-muted-foreground">{formatDate(d.created_at)}</div>
              </div>
              {d.category && <Badge variant="outline" className="text-[10px]">{d.category}</Badge>}
            </div>
          </CardHeader>
          <CardContent><DocumentViewer doc={d} /></CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SavedReports({ items }: { items: Doc[] }) {
  const reports = items.filter((d) => (d.category ?? "").toLowerCase().includes("report"));
  return <DocumentGrid items={reports} />;
}
export function SavedPrescriptions({ items }: { items: Doc[] }) {
  const rx = items.filter((d) => (d.category ?? "").toLowerCase().includes("prescription"));
  return <DocumentGrid items={rx} />;
}

export function DocumentsWorkspace() {
  const [folder, setFolder] = useState<string | null>(null);
  const listFn = useServerFn(listMyDocuments);
  const foldersFn = useServerFn(listMyDocumentFolders);
  const docs = useQuery<Doc[]>({
    queryKey: ["patient-documents", folder],
    queryFn: () => listFn({ data: { folderId: folder } }) as unknown as Promise<Doc[]>,
  });
  const folders = useQuery<Folder[]>({
    queryKey: ["patient-document-folders"],
    queryFn: () => foldersFn({}) as unknown as Promise<Folder[]>,
  });
  return (
    <PatientShell title="Documents" description="Reports, prescriptions and personal files.">
      <div className="space-y-4">
        <DocumentFolders folders={folders.data ?? []} active={folder} onPick={setFolder} />
        <DocumentGrid items={docs.data ?? []} />
      </div>
    </PatientShell>
  );
}
