/**
 * DiagnosisPanel — center-column diagnosis capture backed by
 * `upsertProblem` / `resolveProblem` server functions (Stage 2).
 * Data comes from ClinicalContext; no independent fetching.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { upsertProblem, resolveProblem } from "@/lib/clinical/clinical.functions";
import { formatDate } from "@/lib/standards-format";
import type { ClinicalContextData } from "./use-clinical-context";

export function DiagnosisPanel({
  ctx,
  encounterId,
  readOnly,
}: {
  ctx: ClinicalContextData;
  encounterId?: string | null;
  readOnly?: boolean;
}) {
  const tenantId = ctx.patient?.tenant_id ?? null;
  const patientId = ctx.person?.id ?? null;
  const [display, setDisplay] = useState("");
  const [pending, setPending] = useState(false);
  const qc = useQueryClient();
  const upsert = useServerFn(upsertProblem);
  const resolve = useServerFn(resolveProblem);

  async function addProblem() {
    if (!tenantId || !patientId || !display.trim()) return;
    setPending(true);
    try {
      await upsert({
        data: {
          tenantId,
          patientId,
          encounterId: encounterId ?? null,
          category: "diagnosis",
          display: display.trim(),
          status: "active",
        },
      });
      setDisplay("");
      toast.success("Diagnosis added");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function markResolved(id: string) {
    if (!tenantId) return;
    try {
      await resolve({ data: { tenantId, id } });
      toast.success("Problem resolved");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Diagnosis / Problem List</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addProblem();
            }}
          >
            <Input
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder="Add diagnosis or problem"
              className="h-9"
            />
            <Button type="submit" size="sm" disabled={pending || !display.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </form>
        )}
        {ctx.problems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active problems.</p>
        ) : (
          <ul className="divide-y">
            {ctx.problems.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="text-sm truncate">{p.display}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.category} · {p.severity ?? "—"} · onset {p.onset_date ? formatDate(p.onset_date) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {p.status}
                  </Badge>
                  {!readOnly && p.status !== "resolved" && (
                    <Button variant="ghost" size="icon" onClick={() => markResolved(p.id)} aria-label="Resolve">
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
