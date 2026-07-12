/**
 * Phase 2.8 Laboratory / Radiology / Pathology / Microbiology
 * — Workflow event constants.
 *
 * Emitted through the platform Workflow / Automation Engine
 * (`emit_automation_event` RPC). Laboratory NEVER runs its own bus —
 * every event flows through the same engine used by Automation Triggers,
 * Notification Rules, Timeline and Analytics.
 *
 * Stage 1 delivers constants only. Emission is wired in Stage 2 (engines).
 */

export const LAB_EVENTS = {
  // Orders / accessioning
  OrderPlaced:          "lab.order.placed",
  OrderCancelled:       "lab.order.cancelled",
  SpecimenCollected:    "lab.specimen.collected",
  SpecimenReceived:     "lab.specimen.received",
  SpecimenRejected:     "lab.specimen.rejected",
  AccessionCreated:     "lab.accession.created",

  // Analyzer / QC
  AnalyzerResultReceived: "lab.analyzer.result_received",
  AnalyzerOffline:        "lab.analyzer.offline",
  QcOutOfControl:         "lab.qc.out_of_control",
  CalibrationDue:         "lab.calibration.due",
  CalibrationCompleted:   "lab.calibration.completed",

  // Results
  ResultPending:        "lab.result.pending",
  ResultReady:          "lab.result.ready",
  ResultVerified:       "lab.result.verified",
  ResultReleased:       "lab.result.released",
  ResultAmended:        "lab.result.amended",
  ResultCritical:       "lab.result.critical",
  DeltaCheckFailed:     "lab.result.delta_check_failed",

  // Turnaround / SLA
  TatBreached:          "lab.tat.breached",

  // Distribution
  ReportDelivered:      "lab.report.delivered",
  ReportDeliveryFailed: "lab.report.delivery_failed",

  // External / reference lab
  ExternalOrderSubmitted: "lab.external.order_submitted",
  ExternalResultReceived: "lab.external.result_received",
} as const;

export type LabEventType = (typeof LAB_EVENTS)[keyof typeof LAB_EVENTS];

export const RADIOLOGY_EVENTS = {
  OrderPlaced:      "radiology.order.placed",
  OrderScheduled:   "radiology.order.scheduled",
  OrderCancelled:   "radiology.order.cancelled",
  StudyAcquired:    "radiology.study.acquired",
  StudyReading:     "radiology.study.reading",
  ReportDrafted:    "radiology.report.drafted",
  ReportVerified:   "radiology.report.verified",
  ReportReleased:   "radiology.report.released",
  ReportAmended:    "radiology.report.amended",
  CriticalFinding:  "radiology.report.critical_finding",
} as const;

export type RadiologyEventType = (typeof RADIOLOGY_EVENTS)[keyof typeof RADIOLOGY_EVENTS];

export const PATHOLOGY_EVENTS = {
  CaseReceived:  "pathology.case.received",
  CaseGrossing:  "pathology.case.grossing",
  CaseProcessing:"pathology.case.processing",
  CaseReviewing: "pathology.case.reviewing",
  CaseReported:  "pathology.case.reported",
  CaseAmended:   "pathology.case.amended",
} as const;

export type PathologyEventType = (typeof PATHOLOGY_EVENTS)[keyof typeof PATHOLOGY_EVENTS];

export const MICROBIOLOGY_EVENTS = {
  CultureStarted:      "microbiology.culture.started",
  CultureNoGrowth:     "microbiology.culture.no_growth",
  CulturePositive:     "microbiology.culture.positive",
  CultureContaminated: "microbiology.culture.contaminated",
  SensitivityReported: "microbiology.sensitivity.reported",
} as const;

export type MicrobiologyEventType = (typeof MICROBIOLOGY_EVENTS)[keyof typeof MICROBIOLOGY_EVENTS];
