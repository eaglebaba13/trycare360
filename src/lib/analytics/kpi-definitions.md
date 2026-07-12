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



