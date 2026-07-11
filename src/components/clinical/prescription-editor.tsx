/**
 * PrescriptionEditor — prescription workspace panel. Reads the recent
 * prescription list from ClinicalContext; writes via
 * `upsertPrescription` / `issuePrescription`. Allergy validation runs
 * server-side (PrescriptionEngine) and the returned `allergyFlags`
 * surface immediately.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Pill, PlusCircle, Save, ShieldAlert, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/standards-format";
import type { ClinicalContextData } from "./use-clinical-context";
import { issuePrescription, upsertPrescription } from "@/lib/clinical/stage4.functions";
import { SignaturePlaceholder } from "./signature-placeholder";

interface DraftItem {
  medication: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
  refills: number;
}

function emptyItem(): DraftItem {
  return { medication: "", dose: "", frequency: "", duration: "", route: "", instructions: "", refills: 0 };
}

export function PrescriptionEditor({
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
  const upsert = useServerFn(upsertPrescription);
  const issue = useServerFn(issuePrescription);
  const qc = useQueryClient();
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [busy, setBusy] = useState(false);
  const [flags, setFlags] = useState<Record<number, string[]>>({});
  const [lastId, setLastId] = useState<string | null>(null);

  const allergyList = useMemo(
    () => ctx.allergies.map((a) => a.substance.toLowerCase()),
    [ctx.allergies],
  );
  const clientFlags = useMemo(() => {
    const out: Record<number, string[]> = {};
    items.forEach((it, idx) => {
      const med = it.medication.toLowerCase();
      const hits = allergyList.filter((s) => s && med.includes(s));
      if (hits.length) out[idx] = hits;
    });
    return out;
  }, [items, allergyList]);

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function save(status: "draft" | "issued") {
    if (!ctx.person) return;
    const valid = items.filter((it) => it.medication.trim());
    if (!valid.length) {
      toast.error("Add at least one medication");
      return;
    }
    setBusy(true);
    try {
      const res = await upsert({
        data: {
          tenantId,
          patientId: ctx.person.id,
          encounterId: encounterId ?? null,
          notes: notes.trim() || null,
          status: "draft",
          items: valid.map((it, idx) => ({
            position: idx,
            medication: it.medication.trim(),
            dose: it.dose.trim() || null,
            frequency: it.frequency.trim() || null,
            duration: it.duration.trim() || null,
            route: it.route.trim() || null,
            instructions: it.instructions.trim() || null,
            refills: it.refills,
            warnings: [],
          })),
        },
      });
      setFlags(res.allergyFlags);
      setLastId(res.prescription.id);
      if (status === "issued") {
        await issue({ data: { tenantId, id: res.prescription.id, signatureNote: null } });
        toast.success("Prescription issued");
      } else {
        toast.success("Prescription saved");
      }
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signIssued(note: string) {
    if (!lastId) return;
    try {
      await issue({ data: { tenantId, id: lastId, signatureNote: note || null } });
      toast.success("Prescription issued");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const hasFlags = Object.keys(clientFlags).length > 0 || Object.keys(flags).length > 0;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pill className="h-4 w-4" /> Prescriptions
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5 mr-1" /> Print
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasFlags && (
          <div className="rounded-md border bg-destructive/5 border-destructive/40 p-2 text-xs flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive mt-0.5" />
            <div>
              <div className="font-medium text-destructive">Allergy flags detected</div>
              <div className="text-muted-foreground">
                Review medications flagged against active allergies before issuing.
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {items.map((it, idx) => {
            const itemFlags = flags[idx] ?? clientFlags[idx] ?? [];
            return (
              <div key={idx} className="rounded-md border p-3 space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input
                    placeholder="Medication *"
                    value={it.medication}
                    onChange={(e) => updateItem(idx, { medication: e.target.value })}
                    disabled={readOnly}
                  />
                  <Input
                    placeholder="Dose (e.g. 500 mg)"
                    value={it.dose}
                    onChange={(e) => updateItem(idx, { dose: e.target.value })}
                    disabled={readOnly}
                  />
                  <Input
                    placeholder="Frequency (e.g. BID)"
                    value={it.frequency}
                    onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                    disabled={readOnly}
                  />
                  <Input
                    placeholder="Duration (e.g. 7 days)"
                    value={it.duration}
                    onChange={(e) => updateItem(idx, { duration: e.target.value })}
                    disabled={readOnly}
                  />
                  <Input
                    placeholder="Route (e.g. PO)"
                    value={it.route}
                    onChange={(e) => updateItem(idx, { route: e.target.value })}
                    disabled={readOnly}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    placeholder="Refills"
                    value={it.refills}
                    onChange={(e) => updateItem(idx, { refills: Number(e.target.value) || 0 })}
                    disabled={readOnly}
                  />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Instructions to patient"
                  value={it.instructions}
                  onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                  disabled={readOnly}
                />
                {itemFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {itemFlags.map((f) => (
                      <Badge key={f} variant="destructive" className="text-[10px]">Allergy: {f}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, emptyItem()])} disabled={readOnly}>
          <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add medication
        </Button>
        <Textarea
          rows={2}
          placeholder="Prescription notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
        />
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" disabled={busy || readOnly} onClick={() => save("draft")}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save draft
          </Button>
        </div>
        <SignaturePlaceholder
          signed={false}
          disabled={busy || readOnly || !lastId}
          onSign={signIssued}
          label="Sign & issue"
        />
        {ctx.prescriptions.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Recent</div>
            <ul className="space-y-1">
              {ctx.prescriptions.slice(0, 5).map((rx) => (
                <li key={rx.id} className="text-xs flex items-center justify-between rounded border px-2 py-1">
                  <span className="truncate">
                    {rx.prescribed_at ? formatDateTime(rx.prescribed_at) : "Draft"} · {rx.notes ?? "—"}
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase">{rx.status}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
