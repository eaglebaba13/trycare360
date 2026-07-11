/**
 * Clinical → Encounter Workspace
 *
 * The core doctor / therapist screen. Consumes ONLY
 * `useClinicalContext` (Stage 2 loader) — no independent queries for
 * patient data, allergies, vitals, scheduling, or billing. Mutations
 * go through the existing Stage 2 server functions.
 *
 * The route `$id` is a person id. The workspace supports creating a
 * new encounter, opening an existing one, saving SOAP drafts, and
 * closing/resuming — everything routed through server fns.
 */
import { useMemo, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Play, StopCircle, PlusCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ClinicalActionBar,
  ClinicalHeader,
  ClinicalPlaceholder,
  ClinicalWorkspaceShell,
  EncounterStatusBar,
  NoPatientSelected,
} from "@/components/clinical/workspace-shell";
import { SoapEditor } from "@/components/clinical/soap-editor";
import { DiagnosisPanel } from "@/components/clinical/diagnosis-panel";
import { useClinicalContext } from "@/components/clinical/use-clinical-context";
import { useTenant } from "@/hooks/use-tenant";
import {
  closeEncounter,
  createEncounter,
  updateEncounter,
} from "@/lib/clinical/clinical.functions";

const encounterSearch = z.object({
  encounterId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/clinical/encounter/$id")({
  validateSearch: (s) => encounterSearch.parse(s),
  component: EncounterWorkspace,
});

function EncounterWorkspace() {
  const { id: personId } = Route.useParams();
  const { encounterId } = useSearch({ from: "/_authenticated/clinical/encounter/$id" });
  const { activeTenantId } = useTenant();

  const ctxQ = useClinicalContext({
    tenantId: activeTenantId,
    personId,
    encounterId: encounterId ?? null,
  });

  const ctx = ctxQ.data;
  const encounter = ctx?.encounter ?? null;
  const soap = useMemo(() => {
    const meta = (encounter?.meta ?? {}) as Record<string, unknown>;
    const s = meta.soap as
      | { template_code?: string | null; subjective?: { text?: string }; objective?: { text?: string }; assessment?: { text?: string }; plan?: { text?: string } }
      | undefined;
    return s
      ? {
          templateCode: s.template_code ?? null,
          subjective: s.subjective,
          objective: s.objective,
          assessment: s.assessment,
          plan: s.plan,
        }
      : null;
  }, [encounter]);

  if (!activeTenantId) return <NoPatientSelected />;

  return (
    <ClinicalWorkspaceShell
      ctx={ctx}
      isLoading={ctxQ.isLoading}
      header={
        <ClinicalHeader
          title={encounter ? "Encounter" : "Patient Workspace"}
          subtitle={encounter ? "Live clinical encounter" : "No open encounter"}
          actions={
            <EncounterActions
              tenantId={activeTenantId}
              personId={personId}
              encounter={encounter}
            />
          }
        />
      }
      statusBar={ctx ? <EncounterStatusBar ctx={ctx} /> : null}
      center={
        <>
          {ctx && encounter && (
            <>
              <ChiefComplaintCard
                tenantId={activeTenantId}
                encounterId={encounter.id}
                initial={encounter.chief_complaint ?? ""}
              />
              <SoapEditor
                tenantId={activeTenantId}
                encounterId={encounter.id}
                initial={soap}
                readOnly={encounter.status === "closed"}
              />
              <DiagnosisPanel ctx={ctx} encounterId={encounter.id} readOnly={encounter.status === "closed"} />
              <ClinicalPlaceholder
                title="Treatment Plan"
                note="Treatment plans, orders, prescriptions and nutrition land in Stage 4."
              />
              <ClinicalPlaceholder
                title="Orders / Prescriptions / Nutrition"
                note="Prescription and order engines wire in Stage 4 — reuse of existing services only."
              />
            </>
          )}
          {ctx && !encounter && (
            <ClinicalPlaceholder
              title="No encounter open"
              note="Create a new encounter to start capturing SOAP notes, diagnosis, and orders. The patient 360° context on the left/right always stays loaded."
            />
          )}
        </>
      }
    />
  );
}

function ChiefComplaintCard({
  tenantId,
  encounterId,
  initial,
}: {
  tenantId: string;
  encounterId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const fn = useServerFn(updateEncounter);
  const qc = useQueryClient();
  async function save() {
    setSaving(true);
    try {
      await fn({ data: { tenantId, id: encounterId, chiefComplaint: value } });
      toast.success("Chief complaint updated");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Chief Complaint</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Presenting complaint" />
        <Button onClick={save} size="sm" disabled={saving}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </CardContent>
    </Card>
  );
}

function EncounterActions({
  tenantId,
  personId,
  encounter,
}: {
  tenantId: string;
  personId: string;
  encounter: NonNullable<ReturnType<typeof useClinicalContext>["data"]>["encounter"] | null;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createEncounter);
  const updateFn = useServerFn(updateEncounter);
  const closeFn = useServerFn(closeEncounter);
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    try {
      const res = await createFn({
        data: { tenantId, patientId: personId, encounterType: "consultation" },
      });
      toast.success("Encounter created");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
      // Navigate to the fresh encounter
      const url = new URL(window.location.href);
      url.searchParams.set("encounterId", res.encounter.id);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function resume() {
    if (!encounter) return;
    setPending(true);
    try {
      await updateFn({ data: { tenantId, id: encounter.id, status: "active" } });
      toast.success("Encounter resumed");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function close() {
    if (!encounter) return;
    setPending(true);
    try {
      await closeFn({ data: { tenantId, id: encounter.id } });
      toast.success("Encounter closed");
      qc.invalidateQueries({ queryKey: ["clinical-context"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <ClinicalActionBar>
      {!encounter && (
        <Button size="sm" onClick={create} disabled={pending}>
          <PlusCircle className="h-4 w-4 mr-1" /> New encounter
        </Button>
      )}
      {encounter && encounter.status === "closed" && (
        <Button size="sm" variant="outline" onClick={resume} disabled={pending}>
          <Play className="h-4 w-4 mr-1" /> Resume
        </Button>
      )}
      {encounter && encounter.status !== "closed" && (
        <Button size="sm" variant="destructive" onClick={close} disabled={pending}>
          <StopCircle className="h-4 w-4 mr-1" /> Close
        </Button>
      )}
    </ClinicalActionBar>
  );
}
