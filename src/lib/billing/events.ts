/**
 * Phase 2.7 Billing / Insurance — Workflow event constants.
 *
 * Emitted through the platform Workflow / Automation Engine
 * (`emit_automation_event` RPC). Billing NEVER runs its own bus —
 * every event listed here flows through the same engine used by
 * Automation Triggers, Notification Rules, Timeline and Analytics.
 *
 * Stage 1 delivers constants only. Emission is wired in Stage 2 (engines).
 */

export const BILLING_EVENTS = {
  // Estimates
  EstimateCreated:      "billing.estimate.created",
  EstimateAccepted:     "billing.estimate.accepted",
  EstimateConverted:    "billing.estimate.converted",
  EstimateExpired:      "billing.estimate.expired",

  // Invoice lifecycle
  InvoiceDrafted:       "billing.invoice.drafted",
  InvoiceIssued:        "billing.invoice.issued",
  InvoiceEdited:        "billing.invoice.edited",
  InvoicePartiallyPaid: "billing.invoice.partially_paid",
  InvoicePaid:          "billing.invoice.paid",
  InvoiceVoided:        "billing.invoice.voided",
  InvoiceOverdue:       "billing.invoice.overdue",

  // Credit / debit notes
  CreditNoteIssued:     "billing.credit_note.issued",
  DebitNoteIssued:      "billing.debit_note.issued",

  // Payments
  PaymentRecorded:      "billing.payment.recorded",
  PaymentFailed:        "billing.payment.failed",
  PaymentAllocated:     "billing.payment.allocated",

  // Refunds
  RefundRequested:      "billing.refund.requested",
  RefundApproved:       "billing.refund.approved",
  RefundProcessed:      "billing.refund.processed",
  RefundFailed:         "billing.refund.failed",

  // Recurring
  RecurringCycleRunSucceeded: "billing.recurring.run_succeeded",
  RecurringCycleRunFailed:    "billing.recurring.run_failed",

  // Tax / e-invoice
  EInvoiceGenerated:    "billing.einvoice.generated",
  EInvoiceFailed:       "billing.einvoice.failed",
} as const;

export type BillingEventType = (typeof BILLING_EVENTS)[keyof typeof BILLING_EVENTS];

export const INSURANCE_EVENTS = {
  // Coverage / policy
  PatientInsuranceLinked:   "insurance.coverage.linked",
  PatientInsuranceVerified: "insurance.coverage.verified",
  PatientInsuranceExpired:  "insurance.coverage.expired",

  // Authorizations
  AuthorizationRequested:  "insurance.authorization.requested",
  AuthorizationApproved:   "insurance.authorization.approved",
  AuthorizationDenied:     "insurance.authorization.denied",
  AuthorizationExpired:    "insurance.authorization.expired",

  // Claims
  ClaimDrafted:            "insurance.claim.drafted",
  ClaimReady:              "insurance.claim.ready",
  ClaimSubmitted:          "insurance.claim.submitted",
  ClaimAcknowledged:       "insurance.claim.acknowledged",
  ClaimApproved:           "insurance.claim.approved",
  ClaimPartiallyApproved:  "insurance.claim.partially_approved",
  ClaimDenied:             "insurance.claim.denied",
  ClaimPaid:               "insurance.claim.paid",
  ClaimAppealed:           "insurance.claim.appealed",
  ClaimClosed:             "insurance.claim.closed",

  // Remittance
  RemittanceImported:      "insurance.remittance.imported",
  RemittancePosted:        "insurance.remittance.posted",
  RemittanceReconciled:    "insurance.remittance.reconciled",
} as const;

export type InsuranceEventType = (typeof INSURANCE_EVENTS)[keyof typeof INSURANCE_EVENTS];
