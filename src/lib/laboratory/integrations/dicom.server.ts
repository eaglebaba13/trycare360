/**
 * DICOM / DICOMweb WADO-RS + STOW-RS adapter. Metadata-only helper here —
 * pixel data is streamed by the PACS side. Uses Integration Dispatcher.
 */
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = Parameters<typeof dispatch>[0]["supabase"];

export interface DicomStudyMetadata {
  studyInstanceUID: string;
  accession?: string;
  patientId: string;
  modality: string;
  seriesCount?: number;
  instanceCount?: number;
  performedAt?: string;
  description?: string;
}

export function buildQidoQuery(args: { patientId?: string; accession?: string; modality?: string }) {
  const q = new URLSearchParams();
  if (args.patientId) q.set("PatientID", args.patientId);
  if (args.accession) q.set("AccessionNumber", args.accession);
  if (args.modality) q.set("ModalitiesInStudy", args.modality);
  return q.toString();
}

export async function fetchStudyMetadata(args: {
  supabase: SB;
  tenantId: string;
  providerCode?: string;
  studyInstanceUID: string;
}) {
  return dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.providerCode ?? "dicom",
    action: "lab.dicom.wado.metadata",
    payload: { studyInstanceUID: args.studyInstanceUID },
  });
}

export async function pushStudyMetadata(args: {
  supabase: SB;
  tenantId: string;
  providerCode?: string;
  metadata: DicomStudyMetadata;
}) {
  return dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.providerCode ?? "dicom",
    action: "lab.dicom.stow.metadata",
    payload: { metadata: args.metadata },
  });
}
