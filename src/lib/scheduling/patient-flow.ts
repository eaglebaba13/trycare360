/**
 * Patient Flow State Machine — CANONICAL lifecycle for a patient's
 * movement through the clinic. Reused by Clinical/EMR, Billing, Pharmacy,
 * Diagnostics, Membership, Feedback and Patient Portal.
 *
 * Do NOT duplicate this list in components. Import `PATIENT_FLOW_STATES`,
 * `PATIENT_FLOW_TRANSITIONS` and `canTransition()` everywhere lifecycle
 * questions are asked.
 */

export const PATIENT_FLOW_STATES = [
  "booked",
  "arrived",
  "checked_in",
  "waiting",
  "called",
  "in_consultation",
  "treatment",
  "checkout",
  "completed",
  "cancelled",
  "rescheduled",
  "no_show",
  "waitlisted",
] as const;

export type PatientFlowState = (typeof PATIENT_FLOW_STATES)[number];

/** Terminal states — no further transitions allowed. */
export const TERMINAL_STATES: PatientFlowState[] = [
  "completed",
  "cancelled",
  "no_show",
];

/** Alternative branches that can be entered from most active states. */
const ALWAYS_AVAILABLE_BRANCHES: PatientFlowState[] = [
  "cancelled",
  "rescheduled",
  "no_show",
];

/** Happy-path transitions. */
export const PATIENT_FLOW_TRANSITIONS: Record<
  PatientFlowState,
  PatientFlowState[]
> = {
  booked: ["arrived", "checked_in", "waitlisted", ...ALWAYS_AVAILABLE_BRANCHES],
  arrived: ["checked_in", ...ALWAYS_AVAILABLE_BRANCHES],
  checked_in: ["waiting", "called", ...ALWAYS_AVAILABLE_BRANCHES],
  waiting: ["called", ...ALWAYS_AVAILABLE_BRANCHES],
  called: ["in_consultation", "waiting", ...ALWAYS_AVAILABLE_BRANCHES],
  in_consultation: ["treatment", "checkout", ...ALWAYS_AVAILABLE_BRANCHES],
  treatment: ["checkout", ...ALWAYS_AVAILABLE_BRANCHES],
  checkout: ["completed"],
  completed: [],
  cancelled: [],
  rescheduled: ["booked"],
  no_show: ["rescheduled", "waitlisted"],
  waitlisted: ["booked", "cancelled"],
};

/** Mapping from `appointments.status_code` values used by Stage 2 engines. */
export const APPOINTMENT_STATUS_TO_FLOW: Record<string, PatientFlowState> = {
  booked: "booked",
  scheduled: "booked",
  confirmed: "booked",
  arrived: "arrived",
  checked_in: "checked_in",
  waiting: "waiting",
  called: "called",
  in_progress: "in_consultation",
  treatment: "treatment",
  checkout: "checkout",
  completed: "completed",
  cancelled: "cancelled",
  rescheduled: "rescheduled",
  rescheduled_pending: "rescheduled",
  no_show: "no_show",
  waitlisted: "waitlisted",
};

export function toPatientFlowState(statusCode: string): PatientFlowState {
  return APPOINTMENT_STATUS_TO_FLOW[statusCode] ?? "booked";
}

export function canTransition(
  from: PatientFlowState,
  to: PatientFlowState,
): boolean {
  return PATIENT_FLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(state: PatientFlowState): boolean {
  return TERMINAL_STATES.includes(state);
}

/** Presentation metadata — labels, colours, ordering — for UI only. */
export const PATIENT_FLOW_META: Record<
  PatientFlowState,
  { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger"; order: number }
> = {
  booked: { label: "Booked", tone: "info", order: 1 },
  arrived: { label: "Arrived", tone: "info", order: 2 },
  checked_in: { label: "Checked-in", tone: "info", order: 3 },
  waiting: { label: "Waiting", tone: "warning", order: 4 },
  called: { label: "Called", tone: "warning", order: 5 },
  in_consultation: { label: "In consultation", tone: "success", order: 6 },
  treatment: { label: "Treatment", tone: "success", order: 7 },
  checkout: { label: "Checkout", tone: "success", order: 8 },
  completed: { label: "Completed", tone: "success", order: 9 },
  cancelled: { label: "Cancelled", tone: "danger", order: 10 },
  rescheduled: { label: "Rescheduled", tone: "warning", order: 11 },
  no_show: { label: "No-show", tone: "danger", order: 12 },
  waitlisted: { label: "Waitlisted", tone: "neutral", order: 13 },
};

export function flowMeta(state: PatientFlowState) {
  return PATIENT_FLOW_META[state];
}
