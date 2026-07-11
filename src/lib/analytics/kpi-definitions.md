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

## Future modules (Phase 2.4+)

Before Phase 2.4 (Appointments) ships, standardize these operational KPIs
so Appointment, Clinical, Finance, Franchise, Marketing and BI dashboards
report identical numbers:

- Appointment booking rate = booked / leads_with_intent
- Consultation completion rate = completed / booked
- No-show rate = no_show / booked
- Treatment acceptance rate = accepted / recommended
- Membership conversion rate = membership_events / eligible_patients
- Average revenue per patient = sum(revenue) / distinct(person_id)
- Patient lifetime value = ltv_person.total_amount (already provisioned)
- Doctor utilization = booked_minutes / available_minutes
- Branch utilization = booked_minutes / capacity_minutes
- Franchise performance = revenue_by_franchise / target_by_franchise

Rule: no module rolls its own formula. All new dashboards import from this
document and reuse the analytics tabs under `/analytics/*`.
