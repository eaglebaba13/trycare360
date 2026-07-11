/**
 * ConsentPanel — attach existing consent templates to the current
 * clinical encounter and record accept/decline/sign transitions.
 * Persists via `upsertClinicalConsent`; templates come from the Stage 1
 * `clinical_consent_templates` layer (loaded via listClinicalKnowledge).
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/standards-format";
import type { ClinicalContextData } from "./use-clinical-context";
import { listClinicalKnowledge } from "@/lib/clinical/clinical.functions";
import { upsertClinicalConsent } from "@/lib/clinical/stage4.functions";
import { SignaturePlaceholder } from "./signature-placeholder";

type ConsentStatus = "pending" | "accepted" | "declined" | "signed" | "revoked";

export function ConsentPanel({
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
  const upsert = useServerFn(upsertClinicalConsent);
  const listKb = useServerFn(listClinicalKnowledge);
  const [templateId, setTemplateId] = useState<string>("");
  const [templateCode, setTemplateCode] = useState<string>("");
  const [status, setStatus] = useState<ConsentStatus>("accepted");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const templatesQ = useQuery({
    queryKey: ["clinical-consent-templates", tenantId],
    queryFn: () =>
      listKb({ data: { tenantId, kind: "consent_templates", activeOnly: true, limit: 100, offset: 0 } }),
    enabled: !!tenantId,
    staleTime: 60_000,
  });

  useEffect(() => {
    const rows = templatesQ.data?.rows;
    if (!templateId && rows && rows.length) {
      const first = rows[0] as Record<string, unknown>;
      setTemplateId((first.id as string) ?? "");
      setTemplateCode((first.code as string) ?? "");
    }
  }, [templatesQ.data, templateId]);

  async function save(nextStatus: ConsentStatus, signatureNote?: string) {
    if (!ctx.person) return;
    setBusy(true);
    try {
      await upsert({
        data: {
          tenantId,
          patientId: ctx.person.id,
          encounterId: encounterId ?? null,
          templateId: templateId || null,
          templateCode: templateCode || null,
          status: nextStatus,
          notes: notes.trim() || null,
          signatureNote: signatureNote ?? null,
        },
      });
      toast.success(`Consent ${nextStatus}`);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileSignature className="h-4 w-4" /> Consents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={templateId}
              onValueChange={(v) => {
                setTemplateId(v);
                const row = (templatesQ.data?.rows ?? []).find((r) => (r as Record<string, unknown>).id === v);
                setTemplateCode(((row ?? {}) as Record<string, unknown>).code as string ?? "");
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Consent template" /></SelectTrigger>
              <SelectContent>
                {(templatesQ.data?.rows ?? []).map((r) => {
                  const row = r as Record<string, unknown>;
                  return (
                    <SelectItem key={row.id as string} value={row.id as string}>
                      {(row.name as string) ?? (row.code as string)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as ConsentStatus)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {!readOnly && (
          <Textarea
            rows={2}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
        {!readOnly && (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => save(status)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Record
            </Button>
          </div>
        )}
        {!readOnly && (
          <SignaturePlaceholder
            signed={false}
            disabled={busy}
            onSign={async (note) => save("signed", note)}
            label="Sign consent"
          />
        )}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">History</div>
          {ctx.clinicalConsents.length === 0 && (
            <p className="text-xs text-muted-foreground">No consent records yet.</p>
          )}
          <ul className="space-y-1">
            {ctx.clinicalConsents.slice(0, 8).map((c) => (
              <li key={c.id} className="rounded border px-2 py-1 text-xs flex items-center justify-between">
                <span className="truncate">
                  {c.template_code ?? "consent"} · {formatDateTime(c.updated_at)}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase">{c.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
