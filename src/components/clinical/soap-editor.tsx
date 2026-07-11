/**
 * SoapEditor (Stage 4) — controlled editor backed by versioned SOAP
 * storage. Save writes a new version via `saveSoapVersion`. History /
 * restore is exposed via the sibling `SoapHistoryPanel`.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { saveSoapVersion, signSoapNote } from "@/lib/clinical/stage4.functions";
import { SignaturePlaceholder } from "./signature-placeholder";

interface SoapValue {
  templateCode?: string | null;
  subjective?: { text?: string } | null;
  objective?: { text?: string } | null;
  assessment?: { text?: string } | null;
  plan?: { text?: string } | null;
}

function readText(json: Tables<"clinical_soap_versions">[keyof Tables<"clinical_soap_versions">] | undefined): string {
  if (!json || typeof json !== "object") return "";
  const v = (json as Record<string, unknown>).text;
  return typeof v === "string" ? v : "";
}

export function SoapEditor({
  tenantId,
  encounterId,
  initial,
  note,
  currentVersion,
  onSaved,
  readOnly,
}: {
  tenantId: string;
  encounterId: string;
  initial?: SoapValue | null;
  note?: Tables<"clinical_soap_notes"> | null;
  currentVersion?: Tables<"clinical_soap_versions"> | null;
  onSaved?: () => void;
  readOnly?: boolean;
}) {
  const derived = useMemo<SoapValue | null>(() => {
    if (currentVersion) {
      return {
        templateCode: currentVersion.template_code ?? null,
        subjective: { text: readText(currentVersion.subjective) },
        objective: { text: readText(currentVersion.objective) },
        assessment: { text: readText(currentVersion.assessment) },
        plan: { text: readText(currentVersion.plan) },
      };
    }
    return initial ?? null;
  }, [currentVersion, initial]);

  const [templateCode, setTemplateCode] = useState(derived?.templateCode ?? "");
  const [subjective, setSubjective] = useState(derived?.subjective?.text ?? "");
  const [objective, setObjective] = useState(derived?.objective?.text ?? "");
  const [assessment, setAssessment] = useState(derived?.assessment?.text ?? "");
  const [plan, setPlan] = useState(derived?.plan?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);

  const save = useServerFn(saveSoapVersion);
  const sign = useServerFn(signSoapNote);
  const qc = useQueryClient();

  useEffect(() => {
    setTemplateCode(derived?.templateCode ?? "");
    setSubjective(derived?.subjective?.text ?? "");
    setObjective(derived?.objective?.text ?? "");
    setAssessment(derived?.assessment?.text ?? "");
    setPlan(derived?.plan?.text ?? "");
  }, [derived]);

  async function persist(isAutosave = false) {
    if (readOnly) return;
    setSaving(true);
    try {
      await save({
        data: {
          tenantId,
          encounterId,
          templateCode: templateCode || null,
          subjective: { text: subjective },
          objective: { text: objective },
          assessment: { text: assessment },
          plan: { text: plan },
          isAutosave,
        },
      });
      if (!isAutosave) toast.success("SOAP version saved");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
      onSaved?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function doSign(signatureNote: string) {
    setSigning(true);
    try {
      await sign({ data: { tenantId, encounterId, signatureNote: signatureNote || null } });
      toast.success("SOAP note signed");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSigning(false);
    }
  }

  const signed = note?.status === "signed";

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          SOAP Note
          {note && (
            <Badge variant="outline" className="text-[10px] uppercase">
              {note.status} · v{note.version_count}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Input
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
            placeholder="Template code"
            className="h-8 w-40 text-xs"
            disabled={readOnly || signed}
          />
          <Button size="sm" onClick={() => persist(false)} disabled={saving || readOnly || signed}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save version"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Field label="Subjective" value={subjective} onChange={setSubjective} readOnly={readOnly || signed} />
        <Field label="Objective" value={objective} onChange={setObjective} readOnly={readOnly || signed} />
        <Field label="Assessment" value={assessment} onChange={setAssessment} readOnly={readOnly || signed} />
        <Field label="Plan" value={plan} onChange={setPlan} readOnly={readOnly || signed} />
        <div className="md:col-span-2">
          <SignaturePlaceholder
            signed={signed}
            signedAt={note?.signed_at ?? null}
            disabled={readOnly || signing || !note}
            onSign={doSign}
            label="Sign note"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={5}
        className="text-sm"
      />
    </div>
  );
}
