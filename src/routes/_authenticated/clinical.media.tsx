/**
 * /clinical/media — patient-focused clinical media gallery.
 * Requires ?patientId= to focus a patient. Uploads go to the private
 * `clinical-media` storage bucket via `registerClinicalMedia`.
 */
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import {
  ClinicalHeader,
  ClinicalPlaceholder,
  ClinicalWorkspaceShell,
  NoPatientSelected,
} from "@/components/clinical/workspace-shell";
import { ClinicalMediaGallery } from "@/components/clinical/clinical-media-gallery";
import { useClinicalContext } from "@/components/clinical/use-clinical-context";
import { useTenant } from "@/hooks/use-tenant";

const search = z.object({ patientId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/clinical/media")({
  validateSearch: (s) => search.parse(s),
  component: ClinicalMediaRoute,
});

function ClinicalMediaRoute() {
  const { patientId } = useSearch({ from: "/_authenticated/clinical/media" });
  const { activeTenantId } = useTenant();
  if (!activeTenantId) return <NoPatientSelected />;
  if (!patientId) {
    return (
      <ClinicalWorkspaceShell
        ctx={undefined}
        header={<ClinicalHeader title="Clinical Media" subtitle="Select a patient to browse media" />}
        center={
          <ClinicalPlaceholder
            title="Pick a patient"
            note="Open a patient from /clinical/patients then use ?patientId= to focus this gallery."
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
      header={<ClinicalHeader title="Clinical Media" subtitle="Private per-patient files, images and reports" />}
      center={ctxQ.data ? <ClinicalMediaGallery ctx={ctxQ.data} tenantId={tenantId} /> : null}
    />
  );
}
