/**
 * Clinical / EMR event contracts (Phase 2.5 Stage 2).
 * All events flow through the existing Workflow Engine via
 * `emit_automation_event()`. No new event bus is introduced.
 */
export const CLINICAL_EVENTS = {
  ENCOUNTER_CREATED: "clinical.encounter.created",
  ENCOUNTER_UPDATED: "clinical.encounter.updated",
  ENCOUNTER_CLOSED: "clinical.encounter.closed",
  PARTICIPANT_ADDED: "clinical.participant.added",
  PARTICIPANT_REMOVED: "clinical.participant.removed",
  PROBLEM_CREATED: "clinical.problem.created",
  PROBLEM_UPDATED: "clinical.problem.updated",
  PROBLEM_RESOLVED: "clinical.problem.resolved",
  ALLERGY_RECORDED: "clinical.allergy.recorded",
  ALLERGY_UPDATED: "clinical.allergy.updated",
  VITALS_RECORDED: "clinical.vitals.recorded",
  MEDICAL_HISTORY_RECORDED: "clinical.medical_history.recorded",
  FAMILY_HISTORY_RECORDED: "clinical.family_history.recorded",
  LIFESTYLE_RECORDED: "clinical.lifestyle.recorded",
  REFERRAL_CREATED: "clinical.referral.created",
  REFERRAL_UPDATED: "clinical.referral.updated",
  SECOND_OPINION_REQUESTED: "clinical.second_opinion.requested",
  SECOND_OPINION_COMPLETED: "clinical.second_opinion.completed",
  SOAP_SAVED: "clinical.soap.saved",
} as const;

export type ClinicalEvent = (typeof CLINICAL_EVENTS)[keyof typeof CLINICAL_EVENTS];
