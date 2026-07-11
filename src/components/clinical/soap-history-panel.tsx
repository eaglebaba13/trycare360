/**
 * SoapHistoryPanel — versioned SOAP note history for an encounter.
 * Consumes the SOAP block returned by `useClinicalContext` (Stage 4
 * extended loader). Restore triggers `restoreSoapVersion` via server fn.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/standards-format";
import { restoreSoapVersion } from "@/lib/clinical/stage4.functions";
import type { ClinicalContextData } from "./use-clinical-context";

export function SoapHistoryPanel({
  ctx,
  tenantId,
  encounterId,
  readOnly,
}: {
  ctx: ClinicalContextData;
  tenantId: string;
  encounterId: string;
  readOnly?: boolean;
}) {
  const restore = useServerFn(restoreSoapVersion);
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const versions = ctx.soap.versions;
  const currentId = ctx.soap.current?.id ?? null;

  async function doRestore(versionId: string) {
    setBusy(versionId);
    try {
      await restore({ data: { tenantId, encounterId, versionId } });
      toast.success("SOAP version restored");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4" /> SOAP History
        </CardTitle>
        <div className="text-[11px] text-muted-foreground">{ctx.soap.versionCount} versions</div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 && (
          <p className="text-xs text-muted-foreground">No versions yet. Save a SOAP note to start history.</p>
        )}
        <ScrollArea className="max-h-64">
          <ul className="space-y-2">
            {versions.map((v) => (
              <li
                key={v.id}
                className="rounded-md border px-2 py-2 flex items-start justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">v{v.version_no}</Badge>
                    {v.is_autosave && (
                      <Badge variant="secondary" className="text-[10px]">autosave</Badge>
                    )}
                    {v.restored_from_version_id && (
                      <Badge variant="secondary" className="text-[10px]">restored</Badge>
                    )}
                    {v.id === currentId && (
                      <Badge className="text-[10px]">current</Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDateTime(v.saved_at)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={readOnly || busy === v.id || v.id === currentId}
                  onClick={() => doRestore(v.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
