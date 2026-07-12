/**
 * FHIR R4 adapter — DiagnosticReport, Observation, ServiceRequest, ImagingStudy.
 * Serialisation-only + Integration Dispatcher call; no direct fetch.
 */
import { dispatch } from "@/lib/integrations/dispatcher.server";

type SB = Parameters<typeof dispatch>[0]["supabase"];

export interface FhirObservationInput {
  id: string;
  code: string;
  display?: string;
  system?: string;
  value: number | string | null;
  unit?: string;
  refRange?: { low?: number; high?: number };
  status?: "registered" | "preliminary" | "final" | "amended";
  patientRef: string;
}

export function buildObservation(o: FhirObservationInput) {
  const isNumeric = typeof o.value === "number";
  return {
    resourceType: "Observation",
    id: o.id,
    status: o.status ?? "final",
    code: { coding: [{ system: o.system ?? "http://loinc.org", code: o.code, display: o.display ?? o.code }] },
    subject: { reference: `Patient/${o.patientRef}` },
    ...(isNumeric
      ? { valueQuantity: { value: o.value, unit: o.unit } }
      : { valueString: o.value == null ? "" : String(o.value) }),
    ...(o.refRange
      ? { referenceRange: [{ low: o.refRange.low ? { value: o.refRange.low } : undefined, high: o.refRange.high ? { value: o.refRange.high } : undefined }] }
      : {}),
  };
}

export interface FhirDiagnosticReportInput {
  id: string;
  patientRef: string;
  status?: "registered" | "partial" | "preliminary" | "final" | "amended";
  effective?: string;
  observations: FhirObservationInput[];
  conclusion?: string;
  category?: string;
}

export function buildDiagnosticReport(input: FhirDiagnosticReportInput) {
  return {
    resourceType: "DiagnosticReport",
    id: input.id,
    status: input.status ?? "final",
    effectiveDateTime: input.effective ?? new Date().toISOString(),
    subject: { reference: `Patient/${input.patientRef}` },
    category: input.category
      ? [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", code: input.category }] }]
      : undefined,
    result: input.observations.map((o) => ({ reference: `Observation/${o.id}` })),
    contained: input.observations.map(buildObservation),
    conclusion: input.conclusion,
  };
}

export function buildServiceRequest(args: {
  id: string;
  patientRef: string;
  code: string;
  display?: string;
  priority?: "routine" | "urgent" | "asap" | "stat";
  status?: "draft" | "active" | "completed" | "revoked";
}) {
  return {
    resourceType: "ServiceRequest",
    id: args.id,
    status: args.status ?? "active",
    intent: "order",
    priority: args.priority ?? "routine",
    code: { coding: [{ system: "http://loinc.org", code: args.code, display: args.display ?? args.code }] },
    subject: { reference: `Patient/${args.patientRef}` },
  };
}

export function buildImagingStudy(args: {
  id: string;
  patientRef: string;
  modality: string;
  started?: string;
  seriesCount?: number;
  instanceCount?: number;
  accession?: string;
}) {
  return {
    resourceType: "ImagingStudy",
    id: args.id,
    status: "available",
    subject: { reference: `Patient/${args.patientRef}` },
    started: args.started ?? new Date().toISOString(),
    numberOfSeries: args.seriesCount ?? 1,
    numberOfInstances: args.instanceCount ?? 1,
    identifier: args.accession ? [{ value: args.accession }] : undefined,
    modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: args.modality }],
  };
}

export async function pushFhir(args: {
  supabase: SB;
  tenantId: string;
  providerCode?: string;
  resourceType: "DiagnosticReport" | "Observation" | "ServiceRequest" | "ImagingStudy";
  resource: Record<string, unknown>;
}) {
  return dispatch({
    supabase: args.supabase,
    tenantId: args.tenantId,
    providerCode: args.providerCode ?? "fhir",
    action: `lab.fhir.${args.resourceType.toLowerCase()}`,
    payload: { resource: args.resource },
  });
}
