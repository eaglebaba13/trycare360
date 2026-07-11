/**
 * /clinical/prescriptions — patient-focused prescription workspace.
 * Requires ?patientId= to focus on a patient (reuses PrescriptionEditor).
 */
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import {
  ClinicalHeader,
  ClinicalPlaceholder,
  ClinicalWorkspaceShell,
  NoPatientSelected,
} from "@/components/clinical/workspace-shell";
import { PrescriptionEditor } from "@/components/clinical/prescription-editor";
import { useClinicalContext } from "@/components/clinical/use-clinical-context";
import { useTenant } from "@/hooks/use-tenant";

const search = z.object({ patientId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/clinical/prescriptions")({
  validateSearch: (s) => search.parse(s),
  component: PrescriptionsRoute,
});

function PrescriptionsRoute() {
  const { patientId } = useSearch({ from: "/_authenticated/clinical/prescriptions" });
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <NoPatientSelected />;
  if (!patientId) {
    return (
      <ClinicalWorkspaceShell
        ctx={undefined}
        header={<ClinicalHeader title="Prescriptions" subtitle="Select a patient to open the workspace" />}
        center={
          <ClinicalPlaceholder
            title="Pick a patient"
            note="Open a patient from /clinical/patients then use ?patientId= to focus this workspace."
          />
        }
      />
    );
  }
  return <Focused tenantId={activeTenantId} patientId={patientId} />;
}

function Focused({ tenantId, patientId }: { tenantId: string; patientId: string }) {
  const ctxQ = useClinicalContext({ tenantId, personId: patientId });
  return (
    <ClinicalWorkspaceShell
      ctx={ctxQ.data}
      isLoading={ctxQ.isLoading}
      header={<ClinicalHeader title="Prescriptions" subtitle="Draft, issue, and print prescriptions" />}
      center={ctxQ.data ? <PrescriptionEditor ctx={ctxQ.data} tenantId={tenantId} /> : null}
    />
  );
}
