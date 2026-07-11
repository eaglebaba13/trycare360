/**
 * ClinicalDocumentViewer — inline viewer for PDF/image/video assets
 * behind a Stage 4 signed URL. Purely presentational.
 */
import { FileText } from "lucide-react";

export function ClinicalDocumentViewer({
  url,
  mime,
  title,
}: {
  url: string | null | undefined;
  mime?: string | null;
  title?: string | null;
}) {
  if (!url) {
    return (
      <div className="rounded-md border bg-muted/30 p-4 text-xs text-muted-foreground flex items-center gap-2">
        <FileText className="h-4 w-4" /> No document available.
      </div>
    );
  }
  const kind = (mime ?? "").toLowerCase();
  if (kind.startsWith("image/")) {
    return (
      <img
        src={url}
        alt={title ?? "clinical document"}
        className="rounded-md border max-h-[70vh] w-full object-contain bg-black/5"
      />
    );
  }
  if (kind.startsWith("video/")) {
    return (
      <video controls className="rounded-md border w-full max-h-[70vh] bg-black">
        <source src={url} type={mime ?? undefined} />
      </video>
    );
  }
  if (kind === "application/pdf") {
    return (
      <iframe
        src={url}
        title={title ?? "PDF document"}
        className="w-full h-[70vh] rounded-md border bg-background"
      />
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm underline text-primary inline-flex items-center gap-1"
    >
      <FileText className="h-4 w-4" /> Open {title ?? "document"}
    </a>
  );
}
