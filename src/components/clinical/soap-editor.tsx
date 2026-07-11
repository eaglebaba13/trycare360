/**
 * SoapEditor — thin controlled editor for the SOAP note stored on
 * `clinical_encounters.meta.soap`. Persists via the existing
 * `saveSoap` server function (Stage 2); no new business logic.
 */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { saveSoap } from "@/lib/clinical/clinical.functions";

interface SoapValue {
  templateCode?: string | null;
  subjective?: { text?: string } | null;
  objective?: { text?: string } | null;
  assessment?: { text?: string } | null;
  plan?: { text?: string } | null;
}

export function SoapEditor({
  tenantId,
  encounterId,
  initial,
  onSaved,
  readOnly,
}: {
  tenantId: string;
  encounterId: string;
  initial?: SoapValue | null;
  onSaved?: () => void;
  readOnly?: boolean;
}) {
  const [templateCode, setTemplateCode] = useState(initial?.templateCode ?? "");
  const [subjective, setSubjective] = useState(initial?.subjective?.text ?? "");
  const [objective, setObjective] = useState(initial?.objective?.text ?? "");
  const [assessment, setAssessment] = useState(initial?.assessment?.text ?? "");
  const [plan, setPlan] = useState(initial?.plan?.text ?? "");
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(saveSoap);

  useEffect(() => {
    setTemplateCode(initial?.templateCode ?? "");
    setSubjective(initial?.subjective?.text ?? "");
    setObjective(initial?.objective?.text ?? "");
    setAssessment(initial?.assessment?.text ?? "");
    setPlan(initial?.plan?.text ?? "");
  }, [initial]);

  async function save() {
    if (readOnly) return;
    setSaving(true);
    try {
      await fn({
        data: {
          tenantId,
          encounterId,
          templateCode: templateCode || null,
          subjective: { text: subjective },
          objective: { text: objective },
          assessment: { text: assessment },
          plan: { text: plan },
        },
      });
      toast.success("SOAP note saved");
      onSaved?.();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">SOAP Note</CardTitle>
        <div className="flex items-center gap-2">
          <Input
            value={templateCode}
            onChange={(e) => setTemplateCode(e.target.value)}
            placeholder="Template code"
            className="h-8 w-40 text-xs"
            disabled={readOnly}
          />
          <Button size="sm" onClick={save} disabled={saving || readOnly}>
            <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Field label="Subjective" value={subjective} onChange={setSubjective} readOnly={readOnly} />
        <Field label="Objective" value={objective} onChange={setObjective} readOnly={readOnly} />
        <Field label="Assessment" value={assessment} onChange={setAssessment} readOnly={readOnly} />
        <Field label="Plan" value={plan} onChange={setPlan} readOnly={readOnly} />
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
