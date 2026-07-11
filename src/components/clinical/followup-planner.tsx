/**
 * FollowupPlanner — capture follow-up recommendations linked to the
 * current encounter / treatment plan. Persists via
 * `upsertClinicalFollowup`. Actual booking is handled downstream by the
 * Scheduling module via workflow events.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Save } from "lucide-react";
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
import { upsertClinicalFollowup } from "@/lib/clinical/stage4.functions";

type Priority = "low" | "normal" | "high" | "urgent";

export function FollowupPlanner({
  ctx,
  tenantId,
  encounterId,
  treatmentPlanId,
  readOnly,
}: {
  ctx: ClinicalContextData;
  tenantId: string;
  encounterId?: string | null;
  treatmentPlanId?: string | null;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const upsert = useServerFn(upsertClinicalFollowup);
  const [reason, setReason] = useState("");
  const [intervalDays, setIntervalDays] = useState<number>(30);
  const [priority, setPriority] = useState<Priority>("normal");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!ctx.person || !reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setBusy(true);
    try {
      const suggested = intervalDays
        ? new Date(Date.now() + intervalDays * 86400_000).toISOString().slice(0, 10)
        : null;
      await upsert({
        data: {
          tenantId,
          patientId: ctx.person.id,
          encounterId: encounterId ?? null,
          treatmentPlanId: treatmentPlanId ?? null,
          suggestedIntervalDays: intervalDays,
          suggestedDate: suggested,
          reason: reason.trim(),
          priority,
          status: "pending",
          notes: notes.trim() || null,
        },
      });
      toast.success("Follow-up created");
      setReason("");
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
          <CalendarPlus className="h-4 w-4" /> Follow-ups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="rounded-md border p-3 space-y-2 bg-muted/20">
            <Input
              placeholder="Reason (e.g. Review response to protocol)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                type="number"
                min={0}
                max={3650}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value) || 0)}
                placeholder="Interval (days)"
              />
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex justify-end">
              <Button size="sm" onClick={create} disabled={busy}>
                <Save className="h-3.5 w-3.5 mr-1" /> {busy ? "Saving…" : "Add follow-up"}
              </Button>
            </div>
          </div>
        )}
        {ctx.followups.length === 0 && (
          <p className="text-xs text-muted-foreground">No follow-ups planned.</p>
        )}
        <ul className="space-y-1">
          {ctx.followups.slice(0, 10).map((f) => (
            <li key={f.id} className="rounded border px-2 py-1 text-xs flex items-center justify-between">
              <div className="min-w-0">
                <div className="truncate">{f.reason}</div>
                <div className="text-[11px] text-muted-foreground">
                  {f.suggested_date ? `Due ${formatDate(f.suggested_date)}` : "No date"} · {f.priority}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">{f.status}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
