/**
 * TreatmentPlanPanel — list, create, and manage treatment plans for
 * the patient in the current clinical context. Writes go through
 * `upsertTreatmentPlan` / `setTreatmentPlanStatus`. No local plan store.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, PlusCircle, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/standards-format";
import type { ClinicalContextData } from "./use-clinical-context";
import { setTreatmentPlanStatus, upsertTreatmentPlan } from "@/lib/clinical/stage4.functions";

type PlanStatus = "draft" | "active" | "completed" | "cancelled";

export function TreatmentPlanPanel({
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
  const plans = ctx.treatmentPlans;
  const qc = useQueryClient();
  const upsert = useServerFn(upsertTreatmentPlan);
  const setStatus = useServerFn(setTreatmentPlanStatus);
  const [drafting, setDrafting] = useState(false);
  const [title, setTitle] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!ctx.person) return;
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setBusy(true);
    try {
      await upsert({
        data: {
          tenantId,
          patientId: ctx.person.id,
          encounterId: encounterId ?? null,
          title: title.trim(),
          diagnosis: diagnosis.trim() || null,
          instructions: instructions.trim() || null,
          goals: [],
          milestones: [],
          status: "draft",
        },
      });
      toast.success("Treatment plan created");
      setTitle("");
      setDiagnosis("");
      setInstructions("");
      setDrafting(false);
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(id: string, status: PlanStatus) {
    try {
      await setStatus({ data: { tenantId, id, status } });
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4" /> Treatment Plans
        </CardTitle>
        {!readOnly && !drafting && (
          <Button size="sm" variant="outline" onClick={() => setDrafting(true)}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" /> New plan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {drafting && (
          <div className="rounded-md border p-3 space-y-2 bg-muted/30">
            <Input
              placeholder="Plan title (e.g. Hair regrowth 12-week protocol)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Working diagnosis (optional)"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
            <Textarea
              rows={3}
              placeholder="Instructions / summary"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setDrafting(false)}>Cancel</Button>
              <Button size="sm" onClick={create} disabled={busy}>
                <Save className="h-3.5 w-3.5 mr-1" /> {busy ? "Saving…" : "Save draft"}
              </Button>
            </div>
          </div>
        )}
        {plans.length === 0 && !drafting && (
          <p className="text-xs text-muted-foreground">No treatment plans on file yet.</p>
        )}
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="rounded-md border px-2 py-2 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{p.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {p.diagnosis || "No diagnosis"} · started {formatDate(p.start_date ?? p.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={p.status === "active" ? "default" : "outline"} className="text-[10px] uppercase">
                  {p.status}
                </Badge>
                {!readOnly && (
                  <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v as PlanStatus)}>
                    <SelectTrigger className="h-7 w-28 text-[11px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
