/**
 * Laboratory AI prompt library — client-safe constants.
 * Every recommendation surface (result, delta, critical, QC, TAT, etc.)
 * picks one of these purposes. New prompts must be added here, never
 * inlined into components.
 */

export const LAB_AI_PURPOSES = [
  "reference_range_explain",
  "delta_check_explain",
  "critical_value_explain",
  "qc_interpretation",
  "westgard_explanation",
  "analyzer_troubleshoot",
  "instrument_health",
  "turnaround_optimize",
  "external_lab_recommend",
  "specimen_routing_suggest",
  "pathology_report_assist",
  "radiology_report_assist",
  "microbiology_interpret",
  "result_summary",
  "doctor_explanation",
  "patient_explanation",
] as const;

export type LabAiPurpose = (typeof LAB_AI_PURPOSES)[number];

export const LAB_AI_LABELS: Record<LabAiPurpose, string> = {
  reference_range_explain: "Reference range explanation",
  delta_check_explain: "Delta check interpretation",
  critical_value_explain: "Critical value interpretation",
  qc_interpretation: "QC run interpretation",
  westgard_explanation: "Westgard rule explanation",
  analyzer_troubleshoot: "Analyzer troubleshooting",
  instrument_health: "Instrument health assessment",
  turnaround_optimize: "Turnaround-time optimisation",
  external_lab_recommend: "External lab recommendation",
  specimen_routing_suggest: "Specimen routing suggestion",
  pathology_report_assist: "Pathology reporting assistant",
  radiology_report_assist: "Radiology reporting assistant",
  microbiology_interpret: "Microbiology interpretation",
  result_summary: "Result summary",
  doctor_explanation: "Doctor-friendly explanation",
  patient_explanation: "Patient-friendly explanation",
};

export const LAB_AI_SYSTEM_PROMPT = [
  "You are a laboratory clinical decision-support assistant for a multi-branch diagnostics platform.",
  "Every response is advisory only and must never replace a qualified pathologist / radiologist / microbiologist review.",
  "Always: cite reference ranges by name when known, flag when a value is critical/panic, describe the confidence level explicitly, and prefer short structured bullets over long prose.",
  "Never: fabricate patient identifiers, invent lab values, output PHI beyond what is in the prompt, or recommend definitive diagnoses.",
].join("\n");

export function buildPrompt(purpose: LabAiPurpose, payload: Record<string, unknown>): string {
  const label = LAB_AI_LABELS[purpose];
  return [
    `# Task: ${label}`,
    "",
    "Context (JSON):",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
    "Respond with a short, structured, clinician-facing note.",
  ].join("\n");
}
