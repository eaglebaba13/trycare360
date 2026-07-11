/**
 * ClinicalMediaGallery — private, patient-scoped media browser.
 * Uploads go to the `clinical-media` storage bucket (path
 * `<tenantId>/<patientId>/<uuid>-<filename>`), then register via
 * `registerClinicalMedia`. Signed URLs come from
 * `getClinicalMediaSignedUrl` on click.
 */
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud, ImageIcon, FileText, Video, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/standards-format";
import type { Tables } from "@/integrations/supabase/types";
import type { ClinicalContextData } from "./use-clinical-context";
import {
  getClinicalMediaSignedUrl,
  registerClinicalMedia,
} from "@/lib/clinical/stage4.functions";
import { ClinicalDocumentViewer } from "./clinical-document-viewer";

type MediaRow = Tables<"clinical_media">;
type MediaCategory = "image" | "video" | "pdf" | "report" | "before" | "after" | "body_map";

function iconFor(row: MediaRow) {
  const mime = (row.mime ?? "").toLowerCase();
  if (mime.startsWith("image/") || row.category === "image" || row.category === "before" || row.category === "after") return ImageIcon;
  if (mime.startsWith("video/") || row.category === "video") return Video;
  return FileText;
}

export function ClinicalMediaGallery({
  ctx,
  tenantId,
  encounterId,
  readOnly,
}: {
  ctx: ClinicalContextData;
  tenantId: string;
  encounterId?: string | null;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const register = useServerFn(registerClinicalMedia);
  const signed = useServerFn(getClinicalMediaSignedUrl);
  const [category, setCategory] = useState<MediaCategory>("image");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<{ media: MediaRow; url: string | null } | null>(null);

  async function handleFile(file: File) {
    if (!ctx.person) return;
    setUploading(true);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const uuid = crypto.randomUUID();
      const path = `${tenantId}/${ctx.person.id}/${uuid}${ext ? "." + ext : ""}`;
      const { error: upErr } = await supabase.storage.from("clinical-media").upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw new Error(upErr.message);
      await register({
        data: {
          tenantId,
          patientId: ctx.person.id,
          encounterId: encounterId ?? null,
          category,
          title: file.name,
          storagePath: path,
          mime: file.type || null,
          sizeBytes: file.size,
        },
      });
      toast.success("Uploaded");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openPreview(media: MediaRow) {
    setPreview({ media, url: null });
    try {
      const { url } = await signed({ data: { tenantId, id: media.id, expiresIn: 600 } });
      setPreview({ media, url });
    } catch (e) {
      toast.error((e as Error).message);
      setPreview(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" /> Clinical Media
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">Private</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as MediaCategory)}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="before">Before photo</SelectItem>
                <SelectItem value="after">After photo</SelectItem>
                <SelectItem value="body_map">Body map</SelectItem>
              </SelectContent>
            </Select>
            <Input
              ref={inputRef}
              type="file"
              className="h-8 text-xs max-w-xs"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button size="sm" variant="outline" disabled={uploading}>
              <UploadCloud className="h-3.5 w-3.5 mr-1" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        )}
        {ctx.media.length === 0 && (
          <p className="text-xs text-muted-foreground">No media on file for this patient yet.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {ctx.media.map((m) => {
            const Icon = iconFor(m);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openPreview(m)}
                className="rounded-md border px-2 py-2 text-left hover:bg-muted/50 transition text-xs flex items-start gap-2"
              >
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{m.title ?? m.storage_path.split("/").pop()}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {m.category} · v{m.version_no} · {formatDateTime(m.created_at)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {preview?.media.title ?? preview?.media.storage_path.split("/").pop() ?? "Media"}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <ClinicalDocumentViewer
              url={preview.url}
              mime={preview.media.mime}
              title={preview.media.title}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
