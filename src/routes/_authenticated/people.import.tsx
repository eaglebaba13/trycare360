import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, FileDown } from "lucide-react";
import { PageContainer } from "@/components/app-shell";
import { KpiCard, KpiGrid } from "@/components/standards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTenant } from "@/hooks/use-tenant";
import {
  previewCsvImport,
  commitCsvImport,
  exportPersonsCsv,
} from "@/lib/identity/services.functions";

export const Route = createFileRoute("/_authenticated/people/import")({
  component: ImportCenter,
});

interface PreviewResult {
  rows: number;
  valid: number;
  invalid: number;
  duplicates: number;
  errors: Array<{ row: number; message: string }>;
}

function ImportCenter() {
  const { activeTenantId } = useTenant();
  const [csv, setCsv] = useState("");
  const [skipDup, setSkipDup] = useState(true);
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const previewFn = useServerFn(previewCsvImport);
  const commitFn = useServerFn(commitCsvImport);
  const exportFn = useServerFn(exportPersonsCsv);

  const previewMut = useMutation({
    mutationFn: () => previewFn({ data: { tenant_id: activeTenantId!, csv } }),
    onSuccess: (r) => setPreview(r as unknown as PreviewResult),
    onError: (e: Error) => toast.error(e.message),
  });

  const commitMut = useMutation({
    mutationFn: () => commitFn({ data: { tenant_id: activeTenantId!, csv, skip_duplicates: skipDup } }),
    onSuccess: () => {
      toast.success("Import complete");
      setCsv("");
      setPreview(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exportMut = useMutation({
    mutationFn: () => exportFn({ data: { tenant_id: activeTenantId! } }),
    onSuccess: (r) => {
      const csvOut = typeof r === "string" ? r : (r as { csv?: string }).csv ?? "";
      const blob = new Blob([csvOut], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `persons-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PageContainer
      title="Import center"
      description="Bulk import persons via CSV. Duplicates are detected before commit."
      actions={
        <Button variant="outline" onClick={() => exportMut.mutate()} disabled={exportMut.isPending}>
          <FileDown className="h-4 w-4 mr-1" /> Export persons
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Paste CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={12}
              placeholder="full_name,phone,email,dob,gender&#10;Rahul Sharma,+919999900001,rahul@example.com,1988-05-14,male"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => previewMut.mutate()} disabled={!csv.trim() || previewMut.isPending}>
                {previewMut.isPending ? "Validating…" : "Preview"}
              </Button>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={skipDup} onCheckedChange={(v) => setSkipDup(!!v)} />
                Skip duplicates on commit
              </label>
              <Button
                variant="default"
                disabled={!preview || preview.valid === 0 || commitMut.isPending}
                onClick={() => commitMut.mutate()}
              >
                {commitMut.isPending ? "Importing…" : "Commit import"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {preview && (
            <>
              <KpiGrid>
                <KpiCard label="Rows" value={preview.rows} />
                <KpiCard label="Valid" value={preview.valid} tone="success" />
                <KpiCard label="Invalid" value={preview.invalid} tone="danger" />
                <KpiCard label="Duplicates" value={preview.duplicates} tone="warning" />
              </KpiGrid>
              {preview.errors.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Error report</CardTitle></CardHeader>
                  <CardContent className="space-y-1 max-h-64 overflow-auto text-xs">
                    {preview.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 border-b py-1 last:border-0">
                        <Badge variant="destructive">row {e.row}</Badge>
                        <span>{e.message}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
          {!preview && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Paste CSV with a header row and click <strong>Preview</strong> to validate and detect duplicates before committing.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
