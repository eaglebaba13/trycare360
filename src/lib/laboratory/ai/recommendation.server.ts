/**
 * Recommendation surface for the laboratory AI assistant — thin wrappers
 * around `runAssistant` with pre-baked purpose selection and payload
 * shaping. Each function returns the assistant turn so the UI can render
 * it without knowing about the prompt library.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { runAssistant, type AssistantRunResult } from "./assistant.server";
import type { LabAiPurpose } from "./prompt-library";

type SB = SupabaseClient<Database>;

type Common = {
  supabase: SB;
  tenantId: string;
  scope: string;
  actorId: string | null;
};

async function ask(
  base: Common,
  purpose: LabAiPurpose,
  payload: Record<string, unknown>,
): Promise<AssistantRunResult> {
  return runAssistant({ ...base, purpose, payload });
}

export const recommend = {
  referenceRange: (b: Common, p: Record<string, unknown>) => ask(b, "reference_range_explain", p),
  deltaCheck: (b: Common, p: Record<string, unknown>) => ask(b, "delta_check_explain", p),
  criticalValue: (b: Common, p: Record<string, unknown>) => ask(b, "critical_value_explain", p),
  qcInterpretation: (b: Common, p: Record<string, unknown>) => ask(b, "qc_interpretation", p),
  westgard: (b: Common, p: Record<string, unknown>) => ask(b, "westgard_explanation", p),
  analyzerTroubleshoot: (b: Common, p: Record<string, unknown>) => ask(b, "analyzer_troubleshoot", p),
  instrumentHealth: (b: Common, p: Record<string, unknown>) => ask(b, "instrument_health", p),
  turnaround: (b: Common, p: Record<string, unknown>) => ask(b, "turnaround_optimize", p),
  externalLab: (b: Common, p: Record<string, unknown>) => ask(b, "external_lab_recommend", p),
  specimenRouting: (b: Common, p: Record<string, unknown>) => ask(b, "specimen_routing_suggest", p),
  pathology: (b: Common, p: Record<string, unknown>) => ask(b, "pathology_report_assist", p),
  radiology: (b: Common, p: Record<string, unknown>) => ask(b, "radiology_report_assist", p),
  microbiology: (b: Common, p: Record<string, unknown>) => ask(b, "microbiology_interpret", p),
  resultSummary: (b: Common, p: Record<string, unknown>) => ask(b, "result_summary", p),
  doctorExplanation: (b: Common, p: Record<string, unknown>) => ask(b, "doctor_explanation", p),
  patientExplanation: (b: Common, p: Record<string, unknown>) => ask(b, "patient_explanation", p),
};
