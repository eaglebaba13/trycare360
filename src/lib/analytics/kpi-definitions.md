# Standard Operational KPI Definitions

Single source of truth for every dashboard (Executive, Marketing, Sales,
Revenue, Commission, Operational — and future Clinical, Finance, Franchise,
BI). All modules MUST derive metrics from these formulas so numbers agree
across the platform.

## Acquisition funnel

| KPI | Formula |
|---|---|
| Total Leads | count(leads) |
| Qualified Leads | count(leads.stage_code in ('qualified','consultation','proposal','negotiation','won')) |
| Converted Leads | count(leads.converted_at is not null) |
| Lost Leads | count(leads.status = 'lost') |
| Lead Conversion % | converted / total |
| Appointment Conversion % | appointments_completed / leads_with_appointment (Phase 2.4) |
| Patient Conversion % | leads.converted_to = 'patient' / total |
| Membership Conversion % | revenue_events.category = 'membership' / converted |
| Subscription Conversion % | revenue_events.category = 'subscription' / converted |

## Marketing

| KPI | Formula |
|---|---|
| CPL | ad_spend / leads_from_campaign (ad_spend integration Phase 3) |
| CAC | ad_spend / converted_leads |
| ROAS | revenue_attributed / ad_spend |
| Campaign ROI | (revenue - spend) / spend |
| Source ROI | revenue_by_source / spend_by_source |
| Creative ROI | revenue_by_creative_id / spend_by_creative_id |
| Landing Page ROI | revenue_by_landing_page / spend_by_landing_page |
| AI Consultation Conversion | consultation_sessions_won / consultation_sessions_total |

## Sales

| KPI | Formula |
|---|---|
| Telecaller Performance | interactions per day / owner |
| Sales Executive Performance | won_leads / assigned_leads / owner |
| Productivity | (calls + follow_ups_completed) / working_hours |
| Lead Ageing | now() - leads.created_at (bucketed 0-1d, 2-7d, 8-30d, >30d) |
| Stage Conversion | leads_in_stage_next / leads_in_stage_prev |
| Won Reasons | group by leads.won_reason_id |
| Lost Reasons | group by leads.lost_reason_id |

## Revenue

| KPI | Formula |
|---|---|
| Revenue | sum(revenue_events.amount) |
| Revenue by Campaign | sum(amount) group by attribution_credits.campaign_id |
| Revenue by Branch | sum(amount) group by branch_id |
| Revenue by Franchise | sum(amount) group by franchise_id / master_franchise_id |
| Revenue by Doctor | sum(amount) group by doctor_id |
| Revenue by Product | sum(amount) group by product_id |
| Revenue by Treatment | sum(amount) group by treatment_id |
| Revenue by Membership | sum(amount) where category='membership' |
| Revenue by Subscription | sum(amount) where category='subscription' |

## Commission

| KPI | Formula |
|---|---|
| Pending | sum(commission_accruals.amount) where status in ('draft','calculated','under_review') |
| Approved | sum(amount) where status='approved' |
| Paid (placeholder) | sum(amount) where status='paid' (Phase 3) |
| Top Earners | top N by beneficiary_id, sum(amount) |
| Incentive Trend | sum(amount) per day (30d) |

## Operational

| KPI | Formula |
|---|---|
| SLA Compliance | 1 - (sla_instances.breached / sla_instances.total) |
| Follow-up Compliance | completed_on_time / scheduled |
| Assignment Efficiency | assigned_within_sla / assigned_total |
| AI Assessment Completion | assessment_sessions.completed / started |
| Queue Health | open_leads_per_owner (std dev / mean) |

## Scheduling KPI Contract (Phase 2.4 — LOCKED)

Every scheduling dashboard, report, widget and export MUST derive its
numbers from these definitions. No module rolls its own formula.

### Appointment (Executive)

| KPI | Formula |
|---|---|
| Total Appointments | count(appointments) in window |
| Completed | count(status_code='completed') |
| Cancelled | count(status_code='cancelled') |
| Rescheduled | count(status_code in ('rescheduled','rescheduled_pending')) OR count(appointment_reschedule rows) |
| No-show | count(status_code='no_show') |
| Check-in Rate | count(status in ('checked_in','arrived','in_progress','completed')) / total_booked |
| Completion Rate | completed / (total - cancelled) |
| Fill Rate | booked_minutes / capacity_minutes |
| Average Wait Time | avg(queue_tokens.called_at - issued_at) minutes |
| Average Consultation Time | avg(appointments.completed_at - started_at) minutes |
| On-time Consultation Rate | count(started_at <= starts_at + grace) / started |
| Average Booking Lead Time | avg(starts_at - created_at) |
| Average Reschedule Delay | avg(new_starts_at - original_starts_at) from appointment_reschedule |
| Walk-in Conversion Rate | count(is_walk_in and status='completed') / count(is_walk_in) |
| Queue Abandonment Rate | count(queue_tokens.status='abandoned' or 'no_show') / total_tokens |

### Resource

| KPI | Formula |
|---|---|
| Doctor Occupancy | booked_minutes(kind='doctor') / available_minutes |
| Room Occupancy | booked_minutes(kind='room') / available_minutes |
| Machine Occupancy | booked_minutes(kind='machine') / available_minutes |
| Therapist Occupancy | booked_minutes(kind='therapist') / available_minutes |
| Idle Time | available_minutes - booked_minutes |
| Peak Hour | argmax(count(appointments) group by hour_of_day) |
| Utilization by Branch | booked_minutes group by branch_id / capacity_minutes(branch) |
| Utilization by Franchise | booked_minutes group by franchise_id / capacity_minutes(franchise) |

### Queue

| KPI | Formula |
|---|---|
| Queue Length | count(queue_tokens.status in ('waiting','recalled')) |
| Average Wait | avg(called_at - issued_at) |
| Average Service Time | avg(completed_at - called_at) |
| Doctor Throughput | count(queue_tokens.status='completed') per doctor_id per hour |
| Queue SLA | 1 - (count(wait>threshold) / total_tokens) |

### Capacity

| KPI | Formula |
|---|---|
| Capacity Planned | sum(capacity_plans.total_slots) |
| Capacity Used | sum(appointments.booked_slots) |
| Walk-in Reserve | sum(capacity_plans.walk_in_reserve) |
| Emergency Reserve | sum(capacity_plans.emergency_reserve) |
| VIP Reserve | sum(capacity_plans.vip_reserve) |
| Capacity Exhaustion | count(day where used >= planned) / total_days |

### Service (Commercial)

| KPI | Formula |
|---|---|
| Appointments by Service | count(appointments) group by service_id |
| Service Completion Rate | completed / booked group by service_id |
| Revenue per Appointment | sum(revenue_events.amount where entity='appointment') / count(appointments) |
| Revenue per Service | sum(revenue_events.amount) group by service_id |
| Revenue per Doctor | sum(revenue_events.amount) group by doctor_id |
| Package Completion Rate | sum(sessions_completed) / sum(sessions_total) from appointment_package_plans |
| Recurring Appointment Adherence | count(occurrences.status='completed') / count(occurrences) group by series_id |

### Patient

| KPI | Formula |
|---|---|
| Repeat Visit Rate | count(distinct person_id with appt_count>1) / count(distinct person_id) |
| Cancellation Rate (patient) | cancelled_by_patient / total group by person_id |
| Reschedule Rate | reschedule_count / total group by person_id |
| No-show Rate (patient) | no_show / total group by person_id |
| Feedback Score | avg(appointment_feedback.rating) |
| NPS | (%promoters - %detractors) from appointment_feedback |

### Calendar & Communication

| KPI | Formula |
|---|---|
| Calendar Sync Success | count(integration_jobs.status='completed' where kind like 'calendar%') / total |
| Calendar Sync Failure | count(integration_jobs.status='failed' where kind like 'calendar%') / total |
| Reminder Delivery | count(appointment_reminders.status='sent') / total |
| Reminder Failure | count(appointment_reminders.status='failed') / total |
| Video Consultations | count(appointments where video_url is not null) |

Rule: no module rolls its own formula. All new dashboards import from this
document and reuse the analytics tabs under `/analytics/*`,
`/scheduling/analytics/*`, and `/clinical/analytics/*`.

## Clinical / EMR (Phase 2.5 Stage 6)

Single source of truth for the Clinical Analytics module
(`/clinical/analytics`). All values are computed server-side by
`ClinicalAnalyticsService` (`src/lib/clinical/stage6.analytics.server.ts`)
over the Stage 1–5 tables. No duplicate reporting engine, no parallel
event bus.

### Operational

| KPI | Formula |
|---|---|
| Daily Consultations | count(clinical_encounters where created_at::date = today) |
| Completed Encounters | count(clinical_encounters.status in ('completed','closed')) |
| Open Encounters | count(clinical_encounters.status in ('open','in_progress')) |
| Treatment Plans | count(clinical_treatment_plans in window) |
| Active Prescriptions | count(clinical_prescriptions.status in ('active','issued')) |
| Follow-ups Due | count(clinical_followups.status in ('pending','scheduled')) |
| Referral Volume | count(clinical_referrals in window) |
| Clinical AI Usage | count(clinical_ai_conversations in window) |

### Doctor Performance

| KPI | Formula |
|---|---|
| Consultation Count | count(encounters group by primary_doctor_id) |
| Avg Consultation Time | avg(ended_at - started_at) minutes per doctor |
| Treatment Plans / Doctor | count(clinical_treatment_plans group by created_by) |
| Follow-up Compliance | followups_completed / followups_total per doctor |
| Referral Rate | referrals_created / encounters per doctor |
| SOAP Completion Rate | count(soap.status in ('final','signed')) / encounters |
| Documentation Quality | count(soap.signed_at is not null) / encounters |
| Patient Satisfaction | avg(appointment_feedback.rating) per doctor |

### Clinical Outcomes

| KPI | Formula |
|---|---|
| Treatment Success | plans.status='completed' / total plans |
| Recovery Rate | plans where progress.status='recovered' or percent>=100 / total |
| Repeat Visit Rate | patients_with_more_than_one_encounter / distinct_patients |
| Follow-up Completion | followups.status='completed' / total followups |
| Drop-off Rate | plans.status in ('cancelled','dropped') / total plans |
| Protocol Compliance | plans where progress.protocol_compliant != false / total |

### Quality

| KPI | Formula |
|---|---|
| Incomplete SOAP | count(closed encounters with soap absent or status='draft') |
| Unsigned Notes | count(clinical_soap_notes.signed_at is null) |
| Missing Consent | count(closed encounters without signed clinical_consent) |
| Overdue Follow-ups | count(followups.status in ('pending','scheduled') and suggested_date < now) |
| Missing Vitals | count(closed encounters without linked clinical_vitals) |
| Missing Diagnosis | count(closed encounters with chief_complaint is null) |
| Open Problems | count(clinical_problems.status in ('active','open')) |
| Duplicate Problems | count(problem_text repeated per patient) |

### Compliance

| KPI | Formula |
|---|---|
| Consent Compliance | signed_consents / total_consents |
| Clinical Signatures | count(soap.signed_at is not null) |
| Documentation Completeness | min(1, notes_total / closed_encounters) |
| Audit Events | count(clinical_ai_audit in window) |
| Access Logs | count(clinical_ai_audit where entity_type like '%access%') |
| Clinical Record Changes | count(clinical_ai_audit where entity_type like '%record%') |
| RLS Compliance | DB-enforced (indicator = 1.0) |

### Clinical AI

| KPI | Formula |
|---|---|
| Assistant Usage | count(clinical_ai_conversations) |
| Prompt Usage | count(conversations group by prompt_template_code) |
| Acceptance Rate | recs.status='accepted' / (accepted + rejected) |
| Rejection Rate | recs.status='rejected' / (accepted + rejected) |
| Recommendation Quality | avg(recommendation.confidence) |
| Model Latency | avg(clinical_ai_conversations.latency_ms) |
| Token Consumption | sum(tokens_input + tokens_output) |
| Estimated Cost | sum(clinical_ai_conversations.cost_usd) |
| Model Error Rate | count(conversations.error is not null) / total |

Enterprise Reporting (Daily / Weekly / Monthly / Custom, grouped by
day, week, month, doctor, branch, service, diagnosis, treatment, or
outcome) is served by the same service (`report()`). CSV export is
in-page; PDF / Excel / scheduled delivery are delegated to the Data
Foundation Reports module — no duplicate reporting engine.

---

## Pharmacy (Phase 2.6)

All formulas read from the Pharmacy Inventory Ledger (immutable append-only)
and the projection tables. No parallel counters. Analytics Engine consumes
these definitions; Reports module handles export and scheduling.

### Inventory & Stock

| KPI | Formula |
|---|---|
| Stock On Hand (value) | sum(pharmacy_stock_on_hand.quantity_on_hand * batch.cost_price) |
| Stock On Hand (units) | sum(pharmacy_stock_on_hand.quantity_on_hand) |
| Inventory Turns | dispensed_units_in_period / avg(stock_on_hand_units_in_period) |
| Days of Supply | avg(stock_on_hand_units) / (dispensed_units_in_period / days_in_period) |
| Stockout Count | count(distinct drug_id where stock_on_hand = 0 at any point in period) |
| Stockout Rate | stockout_count / distinct_active_drugs |
| Slow-Moving SKUs | count(drug_id where no dispense in last 90 days AND stock_on_hand > 0) |
| Dead Stock (value) | sum(cost_price * on_hand) where no dispense in last 180 days |
| Near-Expiry Units (90d) | sum(stock_on_hand) where batch.expiry_date <= now() + interval '90 days' |
| Expired Write-off (value) | sum(ledger.quantity * batch.cost_price) where source_type = 'expiry' |
| Wastage Rate | expired_write_off_value / total_purchase_value_in_period |

### Dispensing

| KPI | Formula |
|---|---|
| Total Dispenses | count(pharmacy_dispenses where status IN ('completed','partial')) |
| Dispensed Units | sum(pharmacy_dispense_items.quantity) |
| Prescription Fill Rate | count(distinct prescription_id filled) / count(distinct clinical_prescriptions in period) |
| Partial Dispense Rate | count(dispenses where status = 'partial') / total_dispenses |
| Generic Substitution Rate | count(dispense_items where substituted_from_drug_id is not null) / total_dispense_items |
| Avg Time to Dispense | avg(dispense.created_at - prescription.created_at) |
| Kit Dispense Count | count(dispense_items where kit_id is not null group by kit_id) |

### Procurement

| KPI | Formula |
|---|---|
| PO Count | count(pharmacy_purchase_orders) |
| PO Value | sum(pharmacy_purchase_orders.grand_total) |
| Avg PO Cycle Time | avg(sent_at - created_at) |
| Avg PO Approval Time | avg(approved_at - created_at) where approved_at is not null |
| GRN Posting Delay | avg(grn.posted_at - grn.grn_date) |
| PO Fulfillment Rate | sum(po_items.quantity_received) / sum(po_items.quantity_ordered) |
| Supplier On-Time Rate | count(grn where posted_at <= po.expected_date) / count(grn) |
| Supplier Score | avg(supplier_score) weighted by PO value |

### Warehouse & Transfers

| KPI | Formula |
|---|---|
| Transfer Count | count(pharmacy_transfers) |
| Transfer Cycle Time | avg(received_at - shipped_at) where status = 'received' |
| Warehouse Stock Value | sum(soh.quantity * batch.cost_price) group by warehouse_id |
| Bin Utilization | sum(soh.quantity) / sum(bin.capacity) where capacity is not null |

### Controlled Drugs

| KPI | Formula |
|---|---|
| Controlled Dispenses | count(pharmacy_controlled_register where entry_type = 'dispense') |
| Controlled Discrepancy Count | count(pharmacy_controlled_register where discrepancy_flag = true) |
| Controlled Balance | latest balance_after per (warehouse_id, drug_id, batch_id) |
| Witness Compliance | count(entries where witness_id is not null) / count(entries where entry_type='dispense') |

### Cold Chain

| KPI | Formula |
|---|---|
| Excursion Count | count(pharmacy_coldchain_logs where is_excursion = true) |
| Excursion Rate | excursion_count / total_readings |
| Quarantine Triggered Count | count(coldchain_logs where quarantine_triggered = true) |
| Longest Excursion Duration | max(consecutive excursion window per location) |

### Recall & Compliance

| KPI | Formula |
|---|---|
| Active Recalls | count(pharmacy_drug_recalls where status = 'active') |
| Recall Response Time | avg(completed_at - initiated_at) where status = 'completed' |
| Recall Return Rate | sum(recall_items.quantity_returned) / sum(recall_items.quantity_in_field) |
| Recall Destroy Rate | sum(recall_items.quantity_destroyed) / sum(recall_items.quantity_in_field) |
| Patient Exposure Count | count(distinct patient_id from dispense_items joined to recall.batch_id) |

### Forecast (Addendum B — dashboards only when engine ships)

| KPI | Formula |
|---|---|
| Forecast Accuracy (MAPE) | avg(abs(actual - predicted) / actual) over forecast horizon |
| Reorder Suggestions Accepted | count(reorder events accepted) / count(reorder events suggested) |
| Predicted Shortage Count | count(distinct drug_id where predicted_demand > (stock_on_hand + on_order) within horizon) |
| Predicted Overstock Count | count(distinct drug_id where stock_on_hand > 3 * predicted_demand within horizon) |




## Billing & Revenue (Phase 2.7)

### Invoicing

| KPI | Formula |
|---|---|
| Invoices Issued | count(invoices where status <> 'draft') |
| Draft Invoice Count | count(invoices where status = 'draft') |
| Voided Invoice Count | count(invoices where status = 'void') |
| Average Invoice Value | avg(invoices.grand_total where status <> 'draft') |
| Gross Billed | sum(invoices.grand_total where status in ('issued','partially_paid','paid')) |
| Net Billed | gross_billed - sum(credit_notes.grand_total) |
| Discount Total | sum(invoice_discounts.amount) |
| Tax Collected | sum(invoice_taxes.tax_amount) |

### Collections & Cash

| KPI | Formula |
|---|---|
| Collections | sum(payments.amount where status = 'succeeded') |
| Outstanding AR | sum(invoices.amount_due where status in ('issued','partially_paid')) |
| DSO (Days Sales Outstanding) | (outstanding_ar / net_billed_last_90d) * 90 |
| Ageing Buckets | count(invoices.amount_due bucketed by (issue_date - now()) 0-30 / 31-60 / 61-90 / 90+) |
| Refund Rate | sum(refunds.amount where status='processed') / collections |
| Refund Count | count(refunds where status='processed') |
| Payment Mix | sum(payments.amount) group by method |

### Recurring

| KPI | Formula |
|---|---|
| Active Recurring Cycles | count(billing_recurring_cycles where status = 'active') |
| Recurring Run Success Rate | count(runs where status='succeeded') / count(runs) |
| Failed Recurring Runs | count(billing_recurring_runs where status='failed') |

## Insurance & Claims (Phase 2.7)

### Coverage & Authorization

| KPI | Formula |
|---|---|
| Active Coverages | count(patient_insurance where status='active') |
| Authorization Approval Rate | count(auths where status in ('approved','partially_approved')) / count(auths where status <> 'draft') |
| Authorization Turnaround | avg(responded_at - requested_at) |

### Claims

| KPI | Formula |
|---|---|
| Claims Submitted | count(insurance_claims where status in ('submitted','acknowledged','in_review','approved','partially_approved','denied','paid','appealed','closed')) |
| First-Pass Approval Rate | count(claims first-pass approved) / count(claims submitted) |
| Denial Rate | count(claims where status='denied') / count(claims submitted) |
| Average Claim Value | avg(insurance_claims.billed_amount where status='submitted') |
| Claim Turnaround Time | avg(paid_at - submitted_at) |
| Claim Yield | sum(insurance_claims.paid_amount) / sum(insurance_claims.billed_amount) |
| Underpayment | sum(billed_amount - allowed_amount) where allowed_amount is not null |
| Adjustments | sum(insurance_remittance_lines.adjustment_amount) |

### Remittance

| KPI | Formula |
|---|---|
| Remittance Posted | sum(insurance_remittances.total_amount where status in ('posted','reconciled')) |
| Reconciliation Rate | count(remittances where status='reconciled') / count(remittances) |
| Days To Post Remittance | avg(status_changed_to_posted_at - remit_date) |

## Laboratory (Phase 2.8)

### Volume & Throughput

| KPI | Formula |
|---|---|
| Orders Placed | count(lab_orders where status <> 'draft') |
| Tests Resulted | count(lab_results where status in ('final','amended','corrected')) |
| Cancellation Rate | count(orders where status='cancelled') / count(orders where status <> 'draft') |
| Reflex Rate | count(order_items where reflex_from_item_id is not null) / count(order_items) |
| Repeat Rate | count(distinct tests re-run within 24h for same patient) / total tests |

### Turnaround (TAT)

| KPI | Formula |
|---|---|
| Order → Collect TAT | avg(collected_at - ordered_at) from lab_turnaround_logs |
| Collect → Received TAT | avg(received_at - collected_at) |
| Received → Verified TAT | avg(verified_at - received_at) |
| Verified → Released TAT | avg(released_at - verified_at) |
| Total TAT | avg(released_at - ordered_at) |
| TAT SLA Breach Rate | count(orders where total_tat > test_catalog.tat_minutes) / count(orders) |

### Quality

| KPI | Formula |
|---|---|
| Specimen Rejection Rate | count(lab_specimens where status='rejected') / count(lab_specimens) |
| Result Amendment Rate | count(lab_results where status='amended') / count(lab_results) |
| Delta Check Failures | count(lab_results where delta_flag is not null) |
| Critical Value Rate | count(lab_results where is_critical=true) / count(lab_results) |
| Critical Value Ack Compliance | count(critical results acked within window) / count(critical results) |

### QC & Calibration

| KPI | Formula |
|---|---|
| QC In-Control Rate | count(lab_qc_runs where status='in_control') / count(lab_qc_runs) |
| QC Out-Of-Control Count | count(lab_qc_runs where status='out_of_control') |
| Westgard Rule Violations | count(lab_qc_runs where jsonb_array_length(violated_rules) > 0) |
| Calibration On-Time Rate | count(calibration_records where calibrated_at <= previous next_due_at) / count(calibration_records) |
| Calibration Failure Rate | count(calibration_records where result='failed') / count(calibration_records) |

### External Lab

| KPI | Formula |
|---|---|
| Send-Out Rate | count(lab_external_orders) / count(lab_orders) |
| Send-Out Cost | sum(lab_external_orders.cost) |
| External TAT | avg(completed_at - submitted_at) |

## Radiology (Phase 2.8)

| KPI | Formula |
|---|---|
| Radiology Orders | count(rad_orders where status <> 'draft') |
| Studies Acquired | count(rad_imaging_studies where status in ('acquired','reading','reported','verified','released')) |
| Study Reporting TAT | avg(reported_at - performed_at) |
| Read → Report TAT | avg(reported_at - status_reading_at) |
| Report Amendment Rate | count(rad_imaging_studies where status='amended') / count(rad_imaging_studies) |
| Critical Finding Count | count(radiology.report.critical_finding events) |
| Modality Utilization | count(studies) group by modality_code |
| No-Show Rate | count(rad_orders where status='cancelled' after scheduled_at) / count(rad_orders where scheduled_at is not null) |

## Pathology (Phase 2.8)

| KPI | Formula |
|---|---|
| Cases Received | count(lab_pathology_cases) |
| Case Reporting TAT | avg(reported_at - created_at) |
| Case Amendment Rate | count(cases where status='amended') / count(cases where status in ('reported','amended')) |
| Case Backlog | count(cases where status in ('received','grossing','processing','embedding','sectioning','staining','reviewing')) |
| Pathologist Workload | count(cases) group by pathologist_id |

## Microbiology (Phase 2.8)

| KPI | Formula |
|---|---|
| Cultures Reported | count(lab_cultures where growth_status <> 'pending') |
| Positive Culture Rate | count(cultures where growth_status='positive') / count(cultures where growth_status <> 'pending') |
| Contamination Rate | count(cultures where growth_status='contaminated') / count(cultures where growth_status <> 'pending') |
| Antibiogram Snapshot | count(sensitivity_panels group by organism, antibiotic, interpretation) |
| Sensitivity Turnaround | avg(sensitivity.reported_at - culture.incubated_at) |

## Turnaround & Quality (Cross-domain, Phase 2.8)

| KPI | Formula |
|---|---|
| Aggregate Diagnostic TAT | weighted avg(total_tat) across lab / radiology / pathology |
| Cross-Domain SLA Breaches | count(sla_instances where entity_type in ('lab_order','rad_order','pathology_case') and status='breached') |
| Report Delivery Success | count(lab_distribution_logs where status='delivered') / count(lab_distribution_logs) |


## Laboratory Phase 2.8

### Executive

| KPI | Formula |
|---|---|
| Orders | count(lab_orders in window) |
| Completed | count(lab_orders where status='completed') |
| Pending | count(lab_orders where status in ('pending','ordered','received')) |
| Released | count(lab_results where status='released') |
| Revenue | sum(invoice.total for lab_orders.invoice_id) — sourced from Revenue module |
| Insurance % | count(lab_orders where authorization_id is not null) / count(lab_orders) |
| External Lab % | count(lab_external_orders in window) / count(lab_orders in window) |
| Specimen Rejection % | count(lab_specimens where status='rejected') / count(lab_specimens) |
| Critical Value % | count(lab_results where is_critical) / count(lab_results) |
| Average Turnaround | avg(last(turnaround_logs) - first(turnaround_logs)) per order |

### Orders

| KPI | Formula |
|---|---|
| Order Volume | count(lab_orders in window) |
| By Status | group by lab_orders.status |
| By Priority | group by lab_orders.priority |

### Specimens

| KPI | Formula |
|---|---|
| Total Specimens | count(lab_specimens for orders in window) |
| Rejected Specimens | count(lab_specimens where status='rejected') |
| Rejection Rate | rejected / total |
| Tracking Status Breakdown | group by lab_specimens.status |

### Turnaround

| KPI | Formula |
|---|---|
| Mean TAT (min) | avg(last-first) of lab_turnaround_logs.occurred_at per order |
| P95 TAT (min) | percentile(0.95, tat_per_order) |
| Sampled Orders | count(orders with >= 2 turnaround logs) |

### Analyzer

| KPI | Formula |
|---|---|
| Instruments | count(lab_analyzer_instruments) |
| Uptime | count(instruments where status='online') / count(instruments) |
| Queue Depth | sum(open lab_analyzer_queues rows) |
| Downtime | count(instruments where status in ('offline','maintenance')) |
| Status Breakdown | group by lab_analyzer_instruments.status |

### Quality

| KPI | Formula |
|---|---|
| Critical Values | count(lab_results where is_critical) |
| Rejected Results | count(lab_results where status='rejected') |
| Delta Check Failures | count(lab_results where meta->>'delta_flag'='fail') — sourced from ResultEngine |
| Westgard Violations | count(qc_runs where meta->>'westgard_flag' is not null) — sourced from QCEngine |

### QC

| KPI | Formula |
|---|---|
| QC Pass Rate | count(qc_runs where result='pass') / count(qc_runs) |
| QC Failures | count(qc_runs where result='fail') |
| Active QC Rules | count(qc_rules where is_active) |
| QC Materials | count(qc_materials) |

### Calibration

| KPI | Formula |
|---|---|
| Calibration Overdue | count(instruments where max(calibration.next_due_at) < now()) |
| Last Calibration | max(calibration_records.performed_at) per instrument |
| Calibration Pass Rate | count(calibrations where result='pass') / count(calibrations) |

### Verification

| KPI | Formula |
|---|---|
| Pending Verification | count(results where status='pending') |
| Auto-Verified | count(results where status='auto_verified') |
| Manual Verified | count(results where status='verified') |
| Released | count(results where status='released') |
| Amended | count(results where status='amended') |

### Release

| KPI | Formula |
|---|---|
| Released Results | count(results where status='released') |
| Doctor Signoff Rate | count(results where meta->>'signed_off_by' is not null) / count(released) |

### Distribution

| KPI | Formula |
|---|---|
| Total Dispatched | count(lab_distribution_logs for orders in window) |
| Delivered | count(logs where status='delivered') |
| Success Rate | delivered / total |
| By Channel | group by lab_distribution_logs.channel |
| By Status | group by lab_distribution_logs.status |

### External Labs

| KPI | Formula |
|---|---|
| External Orders | count(lab_external_orders in window) |
| Cost | sum(cost) |
| By Vendor | group by vendor_code |
| By Status | group by status |

### Radiology

| KPI | Formula |
|---|---|
| Study Volume | count(rad_imaging_studies in window) |
| Average Reporting Time | avg(reported_at - performed_at) |
| Pending Studies | count(studies where reported_at is null) |
| Released Reports | count(studies where reported_at is not null) |
| Modalities | group by modality_code |
| Body Part Distribution | group by rad_orders.body_part_id |

### Pathology

| KPI | Formula |
|---|---|
| Cases | count(lab_pathology_cases) |
| Gross Completed | count(cases where status in ('grossing','processing','reviewing','reported','amended')) |
| Microscopy Completed | count(cases where status in ('reviewing','reported','amended')) |
| Diagnosis Released | count(cases where status='reported') |
| Average TAT | avg(reported_at - created_at) |

### Microbiology

| KPI | Formula |
|---|---|
| Culture Volume | count(lab_cultures) |
| Sensitivity Pending | count(cultures where growth_status='pending') |
| Positive Cultures | count(cultures where growth_status='positive') |
| Negative Cultures | count(cultures where growth_status='no_growth') |
| TAT | avg(reported_at - incubated_at) |

### Revenue

| KPI | Formula |
|---|---|
| Billed Orders | count(lab_orders where invoice_id is not null) |
| External Lab Cost | sum(lab_external_orders.cost) |
| Revenue Attribution | joined via Revenue module (billing.invoices) — not computed here |

### Insurance

| KPI | Formula |
|---|---|
| Authorized Orders | count(lab_orders where authorization_id is not null) |
| Insurance Share | authorized / total_orders |
| Authorization Denials | joined via Insurance module (insurance.authorizations.status='denied') |

### Compliance

| KPI | Formula |
|---|---|
| Audit Events | count(lab_audit rows sampled per order) |
| Results Amended | count(lab_results where status='amended') |
| Critical Values Recorded | count(lab_results where is_critical) |
| Chain-of-Custody Coverage | count(specimens with >= 2 tracking rows) / count(specimens) |

### AI

| KPI | Formula |
|---|---|
| Assistant Turns | count(lab assistant events) |
| Acceptance Rate | count(events where status='accepted') / count(events) |
| Rejection Rate | count(events where status='rejected') / count(events) |
| Suggestion Categories | group by prompt_kind |
| Average Confidence | avg(confidence) |
| Average Response Time | avg(latency_ms) |
| Feedback Score | avg(feedback_score) |
