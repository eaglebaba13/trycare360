/**
 * Scheduling Platform — Event contracts (Phase 2.4).
 * All events are routed through the Workflow Engine via
 * `emit_automation_event()`. Do not add hardcoded business logic here.
 */
export const APPOINTMENT_EVENTS = {
  CREATED: "appointment.created",
  CONFIRMED: "appointment.confirmed",
  CANCELLED: "appointment.cancelled",
  RESCHEDULED: "appointment.rescheduled",
  CHECKED_IN: "appointment.checked_in",
  STARTED: "appointment.started",
  COMPLETED: "appointment.completed",
  FEEDBACK_RECEIVED: "appointment.feedback_received",
} as const;

export const QUEUE_EVENTS = {
  TOKEN_ISSUED: "queue.token_issued",
  CALLED: "queue.called",
} as const;

export const WAITLIST_EVENTS = {
  OFFER_SENT: "waitlist.offer_sent",
} as const;

export const CAPACITY_EVENTS = {
  EXHAUSTED: "capacity.exhausted",
} as const;

export const RESOURCE_EVENTS = {
  LOCKED: "resource.locked",
} as const;

export type AppointmentEvent =
  (typeof APPOINTMENT_EVENTS)[keyof typeof APPOINTMENT_EVENTS];
export type QueueEvent = (typeof QUEUE_EVENTS)[keyof typeof QUEUE_EVENTS];
export type WaitlistEvent =
  (typeof WAITLIST_EVENTS)[keyof typeof WAITLIST_EVENTS];
export type CapacityEvent =
  (typeof CAPACITY_EVENTS)[keyof typeof CAPACITY_EVENTS];
export type ResourceEvent =
  (typeof RESOURCE_EVENTS)[keyof typeof RESOURCE_EVENTS];

export type SchedulingEvent =
  | AppointmentEvent
  | QueueEvent
  | WaitlistEvent
  | CapacityEvent
  | ResourceEvent;
