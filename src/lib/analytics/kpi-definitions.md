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
document and reuse the analytics tabs under `/analytics/*` and
`/scheduling/analytics/*`.
