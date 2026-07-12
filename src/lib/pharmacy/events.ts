/**
 * Phase 2.6 Pharmacy — Workflow event constants.
 *
 * These are emitted through the existing Workflow / Automation Engine
 * (`emit_automation_event` RPC or the workflow engine wrapper). Pharmacy
 * NEVER introduces its own event bus — every event listed here flows
 * through the platform-wide Workflow Engine and is subscribed to by
 * Automation Triggers, Notification Rules, Timeline, and Analytics.
 *
 * Stage 1 delivers constants only. Emission is wired in Stage 2 (engines).
 */

export const PHARMACY_EVENTS = {
  // Stock movements
  StockReceived:      "pharmacy.stock.received",
  StockAdjusted:      "pharmacy.stock.adjusted",
  StockTransferred:   "pharmacy.stock.transferred",

  // Batch lifecycle
  BatchNearExpiry:    "pharmacy.batch.near_expiry",
  BatchExpired:       "pharmacy.batch.expired",
  BatchQuarantined:   "pharmacy.batch.quarantined",

  // Dispensing
  DispenseCompleted:  "pharmacy.dispense.completed",
  DispensePartial:    "pharmacy.dispense.partial",
  DispenseCancelled:  "pharmacy.dispense.cancelled",

  // Returns
  ReturnRecorded:     "pharmacy.return.recorded",

  // Procurement
  PoCreated:          "pharmacy.po.created",
  PoApproved:         "pharmacy.po.approved",
  PoSent:             "pharmacy.po.sent",
  GrnPosted:          "pharmacy.grn.posted",

  // Recall
  RecallStarted:      "pharmacy.recall.started",
  RecallCompleted:    "pharmacy.recall.completed",

  // Cold chain
  ColdChainBreach:    "pharmacy.coldchain.breach",

  // Controlled drugs
  ControlledDispensed:  "pharmacy.controlled.dispensed",
  ControlledDiscrepancy:"pharmacy.controlled.discrepancy",

  // Forecast / reorder suggestions
  ReorderSuggested:   "pharmacy.reorder.suggested",
} as const;

export type PharmacyEventType = (typeof PHARMACY_EVENTS)[keyof typeof PHARMACY_EVENTS];
