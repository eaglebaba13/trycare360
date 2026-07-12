/**
 * Clinical / EMR event contracts (Phase 2.5 Stages 2–5).
 * All events flow through the existing Workflow Engine via
 * `emit_automation_event()`. No new event bus is introduced.
 */
export const CLINICAL_EVENTS = {
  // Stage 2
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
  // Stage 4
  SOAP_VERSIONED: "clinical.soap.versioned",
  SOAP_RESTORED: "clinical.soap.restored",
  SOAP_SIGNED: "clinical.soap.signed",
  TREATMENT_PLAN_CREATED: "clinical.treatment_plan.created",
  TREATMENT_PLAN_UPDATED: "clinical.treatment_plan.updated",
  PRESCRIPTION_CREATED: "clinical.prescription.created",
  PRESCRIPTION_UPDATED: "clinical.prescription.updated",
  PRESCRIPTION_ISSUED: "clinical.prescription.issued",
  MEDIA_UPLOADED: "clinical.media.uploaded",
  MEDIA_UPDATED: "clinical.media.updated",
  CONSENT_RECORDED: "clinical.consent.recorded",
  CONSENT_UPDATED: "clinical.consent.updated",
  FOLLOWUP_CREATED: "clinical.followup.created",
  FOLLOWUP_UPDATED: "clinical.followup.updated",
  // Stage 5 — AI Assistant (advisory)
  AI_SUGGESTED: "clinical.ai.suggested",
  AI_RECOMMENDATION_ACCEPTED: "clinical.ai.recommendation.accepted",
  AI_RECOMMENDATION_REJECTED: "clinical.ai.recommendation.rejected",
  AI_RECOMMENDATION_ARCHIVED: "clinical.ai.recommendation.archived",
  AI_FEEDBACK_SUBMITTED: "clinical.ai.feedback.submitted",
} as const;

export type ClinicalEvent = (typeof CLINICAL_EVENTS)[keyof typeof CLINICAL_EVENTS];
