import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFiles } from "@/lib/api/data.functions";
import { useTenant } from "@/hooks/use-tenant";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HardDrive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/data/files")({
  component: FilesPage,
});

type FileRow = {
  id: string; bucket: string; path: string; kind: string | null;
  mime: string | null; size_bytes: number | null; created_at: string;
};

function FilesPage() {
  const { activeTenantId } = useTenant();
  const list = useServerFn(listFiles);
  const { data = [] } = useQuery({
    queryKey: ["data", "files", activeTenantId],
    queryFn: () => list({ data: { tenantId: activeTenantId! } }) as Promise<FileRow[]>,
    enabled: !!activeTenantId,
  });

  if (!activeTenantId) return <div className="text-sm text-muted-foreground">Select a tenant.</div>;

  const totalBytes = data.reduce((s, f) => s + (f.size_bytes ?? 0), 0);
  const fmt = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium">File storage framework</div>
            <div className="text-sm text-muted-foreground">Every module registers uploaded files here. Signed URLs, compression, virus-scan and image processing hooks are wired through this metadata layer.</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-semibold font-display">{data.length}</div>
            <div className="text-xs text-muted-foreground">{fmt(totalBytes)} used</div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>MIME</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No files yet.</TableCell></TableRow>}
            {data.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs truncate max-w-md">{f.path}</TableCell>
                <TableCell><Badge variant="secondary">{f.bucket}</Badge></TableCell>
                <TableCell>{f.kind && <Badge variant="outline">{f.kind}</Badge>}</TableCell>
                <TableCell className="text-xs">{f.mime}</TableCell>
                <TableCell className="text-xs">{f.size_bytes ? fmt(f.size_bytes) : "—"}</TableCell>
                <TableCell className="text-xs">{new Date(f.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
