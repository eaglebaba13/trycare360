/**
 * Lead 360 event contracts (Phase 2.3).
 * All events flow through the Workflow Engine via emit_automation_event().
 */
export const LEAD_EVENTS = {
  CREATED: "lead.created",
  ASSIGNED: "lead.assigned",
  STAGE_CHANGED: "lead.stage_changed",
  WON: "lead.won",
  LOST: "lead.lost",
  CONVERTED: "lead.converted",
  SLA_BREACHED: "lead.sla_breached",
  SLA_ESCALATED: "lead.sla_escalated",
  SCORE_UPDATED: "lead.score_updated",
  SUGGESTION_ADDED: "lead.suggestion_added",
} as const;

export const INTERACTION_EVENTS = {
  LOGGED: "interaction.logged",
} as const;

export const REVENUE_EVENTS = {
  RECORDED: "revenue.recorded",
} as const;

export const COMMISSION_EVENTS = {
  ACCRUED: "commission.accrued",
  UNDER_REVIEW: "commission.under_review",
  APPROVED: "commission.approved",
  LOCKED: "commission.locked",
  PLAN_ACTIVATED: "commission.plan.activated",
  PLAN_ROLLED_BACK: "commission.plan.rolled_back",
} as const;

export type LeadEvent = (typeof LEAD_EVENTS)[keyof typeof LEAD_EVENTS];
export type InteractionEvent = (typeof INTERACTION_EVENTS)[keyof typeof INTERACTION_EVENTS];
export type RevenueEvent = (typeof REVENUE_EVENTS)[keyof typeof REVENUE_EVENTS];
export type CommissionEvent = (typeof COMMISSION_EVENTS)[keyof typeof COMMISSION_EVENTS];
