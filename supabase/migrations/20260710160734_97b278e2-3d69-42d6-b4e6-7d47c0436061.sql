
-- =========================================================================
-- Phase 2.3 Stage 1 — Lead 360 / Interactions / SLA / Attribution / Commissions
-- Schema, RLS, GRANTs, triggers, seeds, RPCs, permissions.
-- =========================================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public._lead_current_tenant() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.current_tenant_id();
$$;

-- ============================
-- 1. Lookups
-- ============================
CREATE TABLE public.lead_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  probability numeric(5,2) NOT NULL DEFAULT 0,
  sla_minutes int,
  is_terminal boolean NOT NULL DEFAULT false,
  terminal_kind text CHECK (terminal_kind IN ('won','lost') OR terminal_kind IS NULL),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_stages TO authenticated;
GRANT ALL ON public.lead_stages TO service_role;
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_stages_read ON public.lead_stages FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lead_stages_write ON public.lead_stages FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL));

CREATE TABLE public.lead_dispositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL,
  kind text NOT NULL DEFAULT 'general',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_dispositions TO authenticated;
GRANT ALL ON public.lead_dispositions TO service_role;
ALTER TABLE public.lead_dispositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_disp_read ON public.lead_dispositions FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lead_disp_write ON public.lead_dispositions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL));

CREATE TABLE public.lead_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('won','lost')),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, kind, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_reasons TO authenticated;
GRANT ALL ON public.lead_reasons TO service_role;
ALTER TABLE public.lead_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_reasons_read ON public.lead_reasons FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lead_reasons_write ON public.lead_reasons FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL));

CREATE TABLE public.lead_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL, name text NOT NULL, body text NOT NULL,
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_scripts TO authenticated;
GRANT ALL ON public.lead_scripts TO service_role;
ALTER TABLE public.lead_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_scripts_read ON public.lead_scripts FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lead_scripts_write ON public.lead_scripts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL));

-- ============================
-- 2. Leads (must reference person_id)
-- ============================
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  lead_code text NOT NULL,
  source text,
  sub_source text,
  campaign_id text,
  meta_campaign_id text,
  google_campaign_id text,
  ad_id text, creative_id text, keyword text,
  landing_page text, referrer text,
  device text, browser text,
  city text, region text, country text,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  first_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_id uuid,
  branch_id uuid,
  franchise_id uuid,
  master_franchise_id uuid,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  stage_code text NOT NULL DEFAULT 'new',
  ai_score numeric(6,2) NOT NULL DEFAULT 0,
  behavior_score numeric(6,2) NOT NULL DEFAULT 0,
  marketing_score numeric(6,2) NOT NULL DEFAULT 0,
  sales_score numeric(6,2) NOT NULL DEFAULT 0,
  manual_score numeric(6,2) NOT NULL DEFAULT 0,
  lead_score numeric(6,2) NOT NULL DEFAULT 0,
  probability numeric(5,2) NOT NULL DEFAULT 0,
  expected_value numeric(14,2),
  currency text NOT NULL DEFAULT 'INR',
  assessment_session_id uuid,
  referral_source text,
  referral_partner_id uuid,
  converted_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  converted_at timestamptz,
  converted_to text,
  won_reason_id uuid,
  lost_reason_id uuid,
  next_follow_up_at timestamptz,
  first_response_sla_at timestamptz,
  follow_up_sla_at timestamptz,
  sla_breached_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, lead_code)
);
CREATE INDEX idx_leads_tenant_person ON public.leads(tenant_id, person_id);
CREATE INDEX idx_leads_owner ON public.leads(tenant_id, owner_id);
CREATE INDEX idx_leads_stage ON public.leads(tenant_id, stage_code);
CREATE INDEX idx_leads_next_fu ON public.leads(tenant_id, next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_read ON public.leads FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY leads_write ON public.leads FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL)));

-- ownership history
CREATE TABLE public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  assigned_from uuid,
  assigned_to uuid,
  assigned_from_type text,
  assigned_to_type text NOT NULL DEFAULT 'user',
  assigned_by uuid,
  assignment_kind text NOT NULL DEFAULT 'manual'
    CHECK (assignment_kind IN ('auto','manual','round_robin','escalation','transfer','system')),
  reason text,
  effective_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  sla_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_assign_lead ON public.lead_assignments(lead_id, effective_at DESC);
CREATE INDEX idx_lead_assign_person ON public.lead_assignments(tenant_id, person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_assignments TO authenticated;
GRANT ALL ON public.lead_assignments TO service_role;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_assign_read ON public.lead_assignments FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lead_assign_write ON public.lead_assignments FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:assign',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:assign',NULL)));

CREATE TABLE public.lead_scoring_events (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind text NOT NULL,
  delta numeric(6,2) NOT NULL DEFAULT 0,
  reason text,
  actor_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_scoring_lead ON public.lead_scoring_events(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_scoring_events TO authenticated;
GRANT ALL ON public.lead_scoring_events TO service_role;
ALTER TABLE public.lead_scoring_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_scoring_read ON public.lead_scoring_events FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lead_scoring_write ON public.lead_scoring_events FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.lead_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind text NOT NULL, title text NOT NULL, body text,
  confidence numeric(5,2),
  status text NOT NULL DEFAULT 'new',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_suggestions TO authenticated;
GRANT ALL ON public.lead_suggestions TO service_role;
ALTER TABLE public.lead_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_sug_all ON public.lead_suggestions FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.lead_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  owner_id uuid,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  outcome text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_callbacks_due ON public.lead_callbacks(tenant_id, scheduled_at) WHERE status = 'scheduled';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_callbacks TO authenticated;
GRANT ALL ON public.lead_callbacks TO service_role;
ALTER TABLE public.lead_callbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_cb_all ON public.lead_callbacks FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.lead_source_history (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  source text, sub_source text,
  campaign_id text, meta_campaign_id text, google_campaign_id text,
  ad_id text, creative_id text,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  landing_page text, referrer text,
  device text, geo jsonb,
  external_ref text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_src_hist_lead ON public.lead_source_history(lead_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_source_history TO authenticated;
GRANT ALL ON public.lead_source_history TO service_role;
ALTER TABLE public.lead_source_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_src_all ON public.lead_source_history FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.lead_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  kind text NOT NULL DEFAULT 'call',
  notes text,
  status text NOT NULL DEFAULT 'pending',
  owner_id uuid,
  completed_at timestamptz,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_fu_due ON public.lead_follow_ups(tenant_id, due_at) WHERE status='pending';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_follow_ups TO authenticated;
GRANT ALL ON public.lead_follow_ups TO service_role;
ALTER TABLE public.lead_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_fu_all ON public.lead_follow_ups FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.lead_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  document_id uuid NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_documents TO authenticated;
GRANT ALL ON public.lead_documents TO service_role;
ALTER TABLE public.lead_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_docs_all ON public.lead_documents FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- Meta / Google / WhatsApp mappings
CREATE TABLE public.lead_channel_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('meta','google','whatsapp','web_form','import','manual','other')),
  external_form_id text,
  external_ad_id text,
  external_campaign_id text,
  external_page_id text,
  external_conversation_id text,
  field_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_default uuid,
  branch_default uuid,
  franchise_default uuid,
  campaign_alias text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, external_form_id, external_campaign_id, external_page_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_channel_mappings TO authenticated;
GRANT ALL ON public.lead_channel_mappings TO service_role;
ALTER TABLE public.lead_channel_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY lcm_read ON public.lead_channel_mappings FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lcm_write ON public.lead_channel_mappings FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'leads:write',NULL)));

-- ============================
-- 3. Unified Interaction Engine
-- ============================
CREATE TABLE public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  patient_id uuid,
  appointment_id uuid,
  channel text NOT NULL CHECK (channel IN
    ('call','whatsapp','sms','email','ai_consult','note','task','workflow','document',
     'payment_reminder','follow_up','appointment','meeting','walk_in','system','push')),
  direction text NOT NULL DEFAULT 'system' CHECK (direction IN ('in','out','system')),
  interaction_type text,
  subject text, body text,
  status text NOT NULL DEFAULT 'logged',
  outcome text,
  disposition_code text,
  duration_sec int,
  recording_url text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid,
  source text,
  external_ref text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_interactions_person ON public.interactions(person_id, occurred_at DESC);
CREATE INDEX idx_interactions_lead ON public.interactions(lead_id, occurred_at DESC) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_interactions_patient ON public.interactions(patient_id, occurred_at DESC) WHERE patient_id IS NOT NULL;
CREATE INDEX idx_interactions_tenant_channel ON public.interactions(tenant_id, channel, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interactions TO authenticated;
GRANT ALL ON public.interactions TO service_role;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY interactions_read ON public.interactions FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY interactions_write ON public.interactions FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'interactions:write',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'interactions:write',NULL)));

-- ============================
-- 4. SLA
-- ============================
CREATE TABLE public.sla_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('first_response','follow_up','callback','stage_dwell')),
  target_minutes int NOT NULL,
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  escalation_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_definitions TO authenticated;
GRANT ALL ON public.sla_definitions TO service_role;
ALTER TABLE public.sla_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_def_read ON public.sla_definitions FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY sla_def_write ON public.sla_definitions FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'sla:manage',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'sla:manage',NULL)));

CREATE TABLE public.sla_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  sla_def_id uuid REFERENCES public.sla_definitions(id) ON DELETE SET NULL,
  sla_kind text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  satisfied_at timestamptz,
  breached_at timestamptz,
  escalated_at timestamptz,
  escalation_level int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sla_inst_entity ON public.sla_instances(entity_type, entity_id);
CREATE INDEX idx_sla_inst_open ON public.sla_instances(tenant_id, status, due_at) WHERE status='open';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_instances TO authenticated;
GRANT ALL ON public.sla_instances TO service_role;
ALTER TABLE public.sla_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY sla_inst_read ON public.sla_instances FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY sla_inst_write ON public.sla_instances FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================
-- 5. Revenue Attribution
-- ============================
CREATE TABLE public.attribution_touches (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  touch_kind text NOT NULL CHECK (touch_kind IN ('first','last','assist')),
  source text, medium text,
  campaign_id text, meta_campaign_id text, google_campaign_id text,
  ad_id text, creative_id text,
  utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
  landing_page text, device text, geo jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attr_touch_person ON public.attribution_touches(person_id, occurred_at DESC);
CREATE INDEX idx_attr_touch_lead ON public.attribution_touches(lead_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_touches TO authenticated;
GRANT ALL ON public.attribution_touches TO service_role;
ALTER TABLE public.attribution_touches ENABLE ROW LEVEL SECURITY;
CREATE POLICY attr_t_read ON public.attribution_touches FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY attr_t_write ON public.attribution_touches FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.revenue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  source_module text NOT NULL,
  source_ref text,
  category text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  doctor_id uuid, therapist_id uuid,
  branch_id uuid, franchise_id uuid, master_franchise_id uuid,
  product_id uuid, treatment_id uuid, membership_id uuid, subscription_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rev_person ON public.revenue_events(person_id, occurred_at DESC);
CREATE INDEX idx_rev_tenant_period ON public.revenue_events(tenant_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_events TO authenticated;
GRANT ALL ON public.revenue_events TO service_role;
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY rev_read ON public.revenue_events FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY rev_write ON public.revenue_events FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.attribution_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  revenue_event_id uuid NOT NULL REFERENCES public.revenue_events(id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  lead_id uuid,
  model text NOT NULL DEFAULT 'last',
  lead_source text,
  campaign_id text, meta_campaign_id text, google_campaign_id text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  branch_id uuid, franchise_id uuid, master_franchise_id uuid,
  doctor_id uuid, therapist_id uuid,
  sales_owner_id uuid, telecaller_id uuid,
  referral_source text, referral_partner_id uuid,
  product_id uuid, treatment_id uuid, membership_id uuid, subscription_id uuid,
  credit_pct numeric(6,3) NOT NULL DEFAULT 100,
  credit_amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_attr_credit_person ON public.attribution_credits(person_id);
CREATE INDEX idx_attr_credit_rev ON public.attribution_credits(revenue_event_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attribution_credits TO authenticated;
GRANT ALL ON public.attribution_credits TO service_role;
ALTER TABLE public.attribution_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY attr_c_read ON public.attribution_credits FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY attr_c_write ON public.attribution_credits FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.ltv_person (
  tenant_id uuid NOT NULL,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  total_revenue numeric(16,2) NOT NULL DEFAULT 0,
  treatment_rev numeric(16,2) NOT NULL DEFAULT 0,
  product_rev numeric(16,2) NOT NULL DEFAULT 0,
  membership_rev numeric(16,2) NOT NULL DEFAULT 0,
  subscription_rev numeric(16,2) NOT NULL DEFAULT 0,
  consultation_rev numeric(16,2) NOT NULL DEFAULT 0,
  other_rev numeric(16,2) NOT NULL DEFAULT 0,
  first_conversion_at timestamptz,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltv_person TO authenticated;
GRANT ALL ON public.ltv_person TO service_role;
ALTER TABLE public.ltv_person ENABLE ROW LEVEL SECURITY;
CREATE POLICY ltv_read ON public.ltv_person FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY ltv_write ON public.ltv_person FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================
-- 6. Commission & Incentive Engine
-- ============================
CREATE TABLE public.commission_beneficiary_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.commission_beneficiary_types TO authenticated, anon;
GRANT ALL ON public.commission_beneficiary_types TO service_role;
ALTER TABLE public.commission_beneficiary_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY cbt_read ON public.commission_beneficiary_types FOR SELECT USING (true);
CREATE POLICY cbt_write ON public.commission_beneficiary_types FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.commission_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  beneficiary_type text NOT NULL REFERENCES public.commission_beneficiary_types(code),
  currency text NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT false,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  version int NOT NULL DEFAULT 1,
  parent_plan_id uuid REFERENCES public.commission_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_plans TO authenticated;
GRANT ALL ON public.commission_plans TO service_role;
ALTER TABLE public.commission_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_read ON public.commission_plans FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY cp_write ON public.commission_plans FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)));

CREATE TABLE public.commission_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.commission_plans(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  activated_at timestamptz,
  activated_by uuid,
  replaced_at timestamptz,
  rollback_of_version int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_plan_versions TO authenticated;
GRANT ALL ON public.commission_plan_versions TO service_role;
ALTER TABLE public.commission_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpv_read ON public.commission_plan_versions FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY cpv_write ON public.commission_plan_versions FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)));

CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.commission_plans(id) ON DELETE CASCADE,
  calc_kind text NOT NULL CHECK (calc_kind IN
    ('fixed','percent','slab','target','revenue','product','treatment','membership','subscription','campaign')),
  applies_to jsonb NOT NULL DEFAULT '{}'::jsonb,
  calc_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority int NOT NULL DEFAULT 100,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crule_plan ON public.commission_rules(plan_id, priority);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY cr_read ON public.commission_rules FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY cr_write ON public.commission_rules FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)));

CREATE TABLE public.commission_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  beneficiary_type text NOT NULL REFERENCES public.commission_beneficiary_types(code),
  beneficiary_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.commission_plans(id) ON DELETE CASCADE,
  entity_scope text NOT NULL DEFAULT 'global',
  scope_ref uuid,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  split_pct numeric(6,3),
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ca_ben ON public.commission_assignments(tenant_id, beneficiary_type, beneficiary_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_assignments TO authenticated;
GRANT ALL ON public.commission_assignments TO service_role;
ALTER TABLE public.commission_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ca_read ON public.commission_assignments FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY ca_write ON public.commission_assignments FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:configure',NULL)));

CREATE TABLE public.commission_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  period_key text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','locked','paid')),
  locked_at timestamptz,
  locked_by uuid,
  paid_at timestamptz,
  paid_by uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, period_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_periods TO authenticated;
GRANT ALL ON public.commission_periods TO service_role;
ALTER TABLE public.commission_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY cper_read ON public.commission_periods FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY cper_write ON public.commission_periods FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:lock',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:lock',NULL)));

CREATE TABLE public.commission_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  revenue_event_id uuid NOT NULL REFERENCES public.revenue_events(id) ON DELETE CASCADE,
  attribution_credit_id uuid REFERENCES public.attribution_credits(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.commission_plans(id) ON DELETE SET NULL,
  plan_version int,
  rule_id uuid REFERENCES public.commission_rules(id) ON DELETE SET NULL,
  beneficiary_type text NOT NULL,
  beneficiary_id uuid NOT NULL,
  base_amount numeric(14,2) NOT NULL,
  calc_amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  period_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN
    ('draft','calculated','under_review','approved','locked','paid','hold','reversed')),
  computed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid, reviewed_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  locked_at timestamptz,
  paid_at timestamptz, payout_ref text,
  notes text,
  audit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_accrual_period ON public.commission_accruals(tenant_id, period_key, status);
CREATE INDEX idx_accrual_ben ON public.commission_accruals(tenant_id, beneficiary_type, beneficiary_id, period_key);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_accruals TO authenticated;
GRANT ALL ON public.commission_accruals TO service_role;
ALTER TABLE public.commission_accruals ENABLE ROW LEVEL SECURITY;
CREATE POLICY cac_read ON public.commission_accruals FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY cac_write ON public.commission_accruals FOR ALL TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:review',NULL)))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:review',NULL)));

CREATE TABLE public.commission_audit_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  plan_id uuid,
  rule_id uuid,
  accrual_id uuid,
  actor_id uuid,
  action text NOT NULL,
  before jsonb, after jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cal_tenant ON public.commission_audit_logs(tenant_id, at DESC);
GRANT SELECT, INSERT ON public.commission_audit_logs TO authenticated;
GRANT ALL ON public.commission_audit_logs TO service_role;
ALTER TABLE public.commission_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY cal_read ON public.commission_audit_logs FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(),'commissions:read',NULL)));
CREATE POLICY cal_insert ON public.commission_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================
-- 7. Triggers (updated_at + actor + audit)
-- ============================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'lead_stages','lead_dispositions','lead_reasons','lead_scripts',
    'leads','lead_suggestions','lead_callbacks','lead_follow_ups',
    'lead_channel_mappings','interactions',
    'sla_definitions','sla_instances','revenue_events','ltv_person',
    'commission_plans','commission_rules','commission_assignments',
    'commission_periods','commission_accruals'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_actor BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row()', t, t);
  END LOOP;
END $$;

-- ============================
-- 8. RPCs — log_interaction, record_revenue_event, refresh_ltv_person, evaluate_sla, sweep_sla_breaches
-- ============================
CREATE OR REPLACE FUNCTION public.log_interaction(
  _tenant_id uuid,
  _person_id uuid,
  _channel text,
  _direction text,
  _subject text DEFAULT NULL,
  _body text DEFAULT NULL,
  _lead_id uuid DEFAULT NULL,
  _patient_id uuid DEFAULT NULL,
  _outcome text DEFAULT NULL,
  _disposition_code text DEFAULT NULL,
  _duration_sec int DEFAULT NULL,
  _occurred_at timestamptz DEFAULT now(),
  _owner_id uuid DEFAULT NULL,
  _source text DEFAULT NULL,
  _external_ref text DEFAULT NULL,
  _attachments jsonb DEFAULT '[]'::jsonb,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_tenant_access(auth.uid(), _tenant_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.interactions(
    tenant_id, person_id, lead_id, patient_id, channel, direction, subject, body,
    outcome, disposition_code, duration_sec, occurred_at, owner_id, source,
    external_ref, attachments, meta, created_by
  ) VALUES (
    _tenant_id, _person_id, _lead_id, _patient_id, _channel, COALESCE(_direction,'system'),
    _subject, _body, _outcome, _disposition_code, _duration_sec, COALESCE(_occurred_at, now()),
    _owner_id, _source, _external_ref, COALESCE(_attachments,'[]'::jsonb), COALESCE(_meta,'{}'::jsonb),
    auth.uid()
  ) RETURNING id INTO new_id;

  PERFORM public.log_timeline_event(
    _tenant_id, 'person', _person_id::text, 'interaction.' || _channel,
    COALESCE(_subject, _channel), _body,
    jsonb_build_object('interaction_id', new_id, 'lead_id', _lead_id, 'patient_id', _patient_id)
  );
  IF _lead_id IS NOT NULL THEN
    PERFORM public.log_timeline_event(
      _tenant_id, 'lead', _lead_id::text, 'interaction.' || _channel,
      COALESCE(_subject, _channel), _body,
      jsonb_build_object('interaction_id', new_id)
    );
  END IF;

  PERFORM public.emit_automation_event(
    _tenant_id, 'interaction.logged',
    jsonb_build_object('interaction_id', new_id, 'channel', _channel, 'person_id', _person_id, 'lead_id', _lead_id),
    jsonb_build_object('type','interaction','id', new_id)
  );

  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_ltv_person(_person_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.persons WHERE id = _person_id;
  IF v_tenant IS NULL THEN RETURN; END IF;
  INSERT INTO public.ltv_person(tenant_id, person_id,
    total_revenue, treatment_rev, product_rev, membership_rev, subscription_rev, consultation_rev, other_rev,
    first_conversion_at, last_activity_at, updated_at)
  SELECT v_tenant, _person_id,
    COALESCE(SUM(amount),0),
    COALESCE(SUM(amount) FILTER (WHERE category='treatment'),0),
    COALESCE(SUM(amount) FILTER (WHERE category='product'),0),
    COALESCE(SUM(amount) FILTER (WHERE category='membership'),0),
    COALESCE(SUM(amount) FILTER (WHERE category='subscription'),0),
    COALESCE(SUM(amount) FILTER (WHERE category='consultation'),0),
    COALESCE(SUM(amount) FILTER (WHERE category NOT IN ('treatment','product','membership','subscription','consultation')),0),
    MIN(occurred_at), MAX(occurred_at), now()
  FROM public.revenue_events WHERE person_id = _person_id
  ON CONFLICT (person_id) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    treatment_rev = EXCLUDED.treatment_rev,
    product_rev = EXCLUDED.product_rev,
    membership_rev = EXCLUDED.membership_rev,
    subscription_rev = EXCLUDED.subscription_rev,
    consultation_rev = EXCLUDED.consultation_rev,
    other_rev = EXCLUDED.other_rev,
    first_conversion_at = EXCLUDED.first_conversion_at,
    last_activity_at = EXCLUDED.last_activity_at,
    updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.attribute_conversion(_revenue_event_id uuid) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE re public.revenue_events; touch public.attribution_touches; model text := 'last'; created int := 0;
BEGIN
  SELECT * INTO re FROM public.revenue_events WHERE id = _revenue_event_id;
  IF re.id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO touch FROM public.attribution_touches
   WHERE person_id = re.person_id ORDER BY occurred_at DESC LIMIT 1;

  INSERT INTO public.attribution_credits(
    tenant_id, revenue_event_id, person_id, lead_id, model,
    lead_source, campaign_id, meta_campaign_id, google_campaign_id, utm,
    branch_id, franchise_id, master_franchise_id, doctor_id, therapist_id,
    product_id, treatment_id, membership_id, subscription_id,
    credit_pct, credit_amount, currency
  ) VALUES (
    re.tenant_id, re.id, re.person_id, re.lead_id, model,
    COALESCE(touch.source, NULL),
    COALESCE(touch.campaign_id, NULL),
    COALESCE(touch.meta_campaign_id, NULL),
    COALESCE(touch.google_campaign_id, NULL),
    jsonb_strip_nulls(jsonb_build_object(
      'utm_source', touch.utm_source, 'utm_medium', touch.utm_medium,
      'utm_campaign', touch.utm_campaign, 'utm_term', touch.utm_term, 'utm_content', touch.utm_content
    )),
    re.branch_id, re.franchise_id, re.master_franchise_id, re.doctor_id, re.therapist_id,
    re.product_id, re.treatment_id, re.membership_id, re.subscription_id,
    100, re.amount, re.currency
  );
  created := 1;
  RETURN created;
END $$;

CREATE OR REPLACE FUNCTION public.accrue_commissions_for_event(_revenue_event_id uuid) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- Skeleton: creates zero rows in stage 1; full calc arrives in stage 2.
-- Kept here so record_revenue_event can call it unconditionally.
BEGIN
  RETURN 0;
END $$;

CREATE OR REPLACE FUNCTION public.record_revenue_event(
  _tenant_id uuid, _person_id uuid, _source_module text, _source_ref text,
  _category text, _amount numeric, _currency text DEFAULT 'INR',
  _occurred_at timestamptz DEFAULT now(),
  _lead_id uuid DEFAULT NULL,
  _doctor_id uuid DEFAULT NULL, _therapist_id uuid DEFAULT NULL,
  _branch_id uuid DEFAULT NULL, _franchise_id uuid DEFAULT NULL, _master_franchise_id uuid DEFAULT NULL,
  _product_id uuid DEFAULT NULL, _treatment_id uuid DEFAULT NULL,
  _membership_id uuid DEFAULT NULL, _subscription_id uuid DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_tenant_access(auth.uid(), _tenant_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.revenue_events(
    tenant_id, person_id, lead_id, source_module, source_ref, category, amount, currency,
    occurred_at, doctor_id, therapist_id, branch_id, franchise_id, master_franchise_id,
    product_id, treatment_id, membership_id, subscription_id, meta, created_by
  ) VALUES (
    _tenant_id, _person_id, _lead_id, _source_module, _source_ref, _category, _amount, COALESCE(_currency,'INR'),
    COALESCE(_occurred_at, now()), _doctor_id, _therapist_id, _branch_id, _franchise_id, _master_franchise_id,
    _product_id, _treatment_id, _membership_id, _subscription_id, COALESCE(_meta,'{}'::jsonb), auth.uid()
  ) RETURNING id INTO new_id;

  PERFORM public.attribute_conversion(new_id);
  PERFORM public.refresh_ltv_person(_person_id);
  PERFORM public.accrue_commissions_for_event(new_id);

  PERFORM public.emit_automation_event(
    _tenant_id, 'revenue.recorded',
    jsonb_build_object('revenue_event_id', new_id, 'person_id', _person_id, 'amount', _amount, 'category', _category),
    jsonb_build_object('type','revenue_event','id', new_id)
  );
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.evaluate_sla(_entity_type text, _entity_id text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sla_instances
     SET status = CASE WHEN satisfied_at IS NOT NULL THEN 'satisfied'
                       WHEN due_at < now() THEN 'breached' ELSE 'open' END,
         breached_at = CASE WHEN satisfied_at IS NULL AND due_at < now() AND breached_at IS NULL
                            THEN now() ELSE breached_at END
   WHERE entity_type = _entity_type AND entity_id = _entity_id;
END $$;

CREATE OR REPLACE FUNCTION public.sweep_sla_breaches() RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  WITH breached AS (
    UPDATE public.sla_instances
       SET status='breached', breached_at=now()
     WHERE status='open' AND satisfied_at IS NULL AND due_at < now()
     RETURNING id, tenant_id, entity_type, entity_id, sla_kind
  ),
  emitted AS (
    SELECT public.emit_automation_event(
      b.tenant_id, 'sla.breached',
      jsonb_build_object('sla_instance_id', b.id, 'entity_type', b.entity_type,
                         'entity_id', b.entity_id, 'kind', b.sla_kind),
      jsonb_build_object('type', b.entity_type, 'id', b.entity_id)
    ) AS fired FROM breached b
  )
  SELECT COUNT(*) INTO n FROM emitted;
  RETURN COALESCE(n,0);
END $$;

-- ============================
-- 9. Lead lifecycle triggers → workflow events + ownership + search + timeline
-- ============================
CREATE OR REPLACE FUNCTION public.leads_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_assignments(tenant_id, lead_id, person_id, assigned_to,
    assigned_to_type, assignment_kind, reason, assigned_by, effective_at)
  VALUES (NEW.tenant_id, NEW.id, NEW.person_id, NEW.owner_id,
    'user', 'system', 'initial_assignment', auth.uid(), now());

  PERFORM public.log_timeline_event(NEW.tenant_id, 'lead', NEW.id::text, 'lead.created',
    COALESCE(NEW.lead_code,'Lead created'), NULL,
    jsonb_build_object('source', NEW.source, 'campaign', NEW.campaign_id, 'person_id', NEW.person_id));
  PERFORM public.log_timeline_event(NEW.tenant_id, 'person', NEW.person_id::text, 'lead.created',
    COALESCE(NEW.lead_code,'Lead created'), NULL,
    jsonb_build_object('lead_id', NEW.id));

  PERFORM public.index_search_entity(
    NEW.tenant_id, 'lead', NEW.id::text,
    COALESCE(NEW.lead_code, 'Lead'),
    NEW.source,
    NEW.stage_code,
    concat_ws(' ', NEW.source, NEW.campaign_id, NEW.utm_campaign),
    '/leads/' || NEW.id::text,
    '{}'::jsonb
  );

  PERFORM public.emit_automation_event(
    NEW.tenant_id, 'lead.created',
    jsonb_build_object('lead_id', NEW.id, 'person_id', NEW.person_id, 'source', NEW.source),
    jsonb_build_object('type','lead','id', NEW.id)
  );
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.leads_after_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    UPDATE public.lead_assignments SET ended_at = now()
      WHERE lead_id = NEW.id AND ended_at IS NULL;
    INSERT INTO public.lead_assignments(tenant_id, lead_id, person_id,
      assigned_from, assigned_to, assigned_from_type, assigned_to_type,
      assignment_kind, reason, assigned_by, effective_at)
    VALUES (NEW.tenant_id, NEW.id, NEW.person_id,
      OLD.owner_id, NEW.owner_id, 'user', 'user',
      'manual', 'owner_change', auth.uid(), now());
    PERFORM public.emit_automation_event(
      NEW.tenant_id, 'lead.assigned',
      jsonb_build_object('lead_id', NEW.id, 'from', OLD.owner_id, 'to', NEW.owner_id),
      jsonb_build_object('type','lead','id', NEW.id)
    );
  END IF;

  IF NEW.stage_code IS DISTINCT FROM OLD.stage_code THEN
    PERFORM public.emit_automation_event(
      NEW.tenant_id, 'lead.stage_changed',
      jsonb_build_object('lead_id', NEW.id, 'from', OLD.stage_code, 'to', NEW.stage_code),
      jsonb_build_object('type','lead','id', NEW.id)
    );
    IF NEW.stage_code = 'won' THEN
      PERFORM public.emit_automation_event(NEW.tenant_id,'lead.won',
        jsonb_build_object('lead_id', NEW.id, 'reason_id', NEW.won_reason_id),
        jsonb_build_object('type','lead','id', NEW.id));
    ELSIF NEW.stage_code = 'lost' THEN
      PERFORM public.emit_automation_event(NEW.tenant_id,'lead.lost',
        jsonb_build_object('lead_id', NEW.id, 'reason_id', NEW.lost_reason_id),
        jsonb_build_object('type','lead','id', NEW.id));
    END IF;
  END IF;

  IF NEW.converted_person_id IS DISTINCT FROM OLD.converted_person_id AND NEW.converted_person_id IS NOT NULL THEN
    PERFORM public.emit_automation_event(NEW.tenant_id,'lead.converted',
      jsonb_build_object('lead_id', NEW.id, 'person_id', NEW.converted_person_id, 'to', NEW.converted_to),
      jsonb_build_object('type','lead','id', NEW.id));
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_after_insert AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_after_insert();
CREATE TRIGGER trg_leads_after_update AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_after_update();

-- ============================
-- 10. Permissions & role bindings
-- ============================
INSERT INTO public.permissions(code, resource, action, description) VALUES
  ('leads:read','leads','read','View leads'),
  ('leads:write','leads','write','Create or edit leads and lead lookups'),
  ('leads:assign','leads','assign','Assign or transfer leads'),
  ('leads:convert','leads','convert','Convert leads to patient/appointment/membership/subscription'),
  ('interactions:read','interactions','read','View interactions'),
  ('interactions:write','interactions','write','Log or edit interactions'),
  ('sla:read','sla','read','View SLA state'),
  ('sla:manage','sla','manage','Configure SLA definitions'),
  ('attribution:read','attribution','read','View attribution and LTV'),
  ('attribution:manage','attribution','manage','Configure attribution models'),
  ('commissions:read','commissions','read','View commission plans and accruals'),
  ('commissions:configure','commissions','configure','Create and edit commission plans and rules'),
  ('commissions:review','commissions','review','Move accruals through review workflow'),
  ('commissions:approve','commissions','approve','Approve commission accruals'),
  ('commissions:lock','commissions','lock','Lock commission periods'),
  ('commissions:payout','commissions','payout','Execute commission payouts (deferred)'),
  ('telecaller:queue','telecaller','queue','Access telecaller queue'),
  ('telecaller:log','telecaller','log','Log telecaller outcomes'),
  ('sales:pipeline','sales','pipeline','Use sales pipeline'),
  ('sales:analytics','sales','analytics','View sales analytics')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions(role_code, permission_code) VALUES
  ('admin','leads:read'),('admin','leads:write'),('admin','leads:assign'),('admin','leads:convert'),
  ('admin','interactions:read'),('admin','interactions:write'),
  ('admin','sla:read'),('admin','sla:manage'),
  ('admin','attribution:read'),('admin','attribution:manage'),
  ('admin','commissions:read'),('admin','commissions:configure'),
  ('admin','commissions:review'),('admin','commissions:approve'),('admin','commissions:lock'),
  ('admin','telecaller:queue'),('admin','telecaller:log'),
  ('admin','sales:pipeline'),('admin','sales:analytics'),

  ('platform_admin','leads:read'),('platform_admin','leads:write'),('platform_admin','leads:assign'),('platform_admin','leads:convert'),
  ('platform_admin','interactions:read'),('platform_admin','interactions:write'),
  ('platform_admin','sla:read'),('platform_admin','sla:manage'),
  ('platform_admin','attribution:read'),('platform_admin','attribution:manage'),
  ('platform_admin','commissions:read'),('platform_admin','commissions:configure'),
  ('platform_admin','commissions:review'),('platform_admin','commissions:approve'),('platform_admin','commissions:lock'),

  ('telecaller','leads:read'),('telecaller','interactions:read'),('telecaller','interactions:write'),
  ('telecaller','telecaller:queue'),('telecaller','telecaller:log'),('telecaller','sla:read'),

  ('sales_executive','leads:read'),('sales_executive','leads:write'),('sales_executive','leads:assign'),
  ('sales_executive','leads:convert'),('sales_executive','interactions:read'),('sales_executive','interactions:write'),
  ('sales_executive','sales:pipeline'),('sales_executive','sales:analytics'),('sales_executive','sla:read'),

  ('marketing','leads:read'),('marketing','attribution:read'),('marketing','sales:analytics'),
  ('marketing','interactions:read'),

  ('franchise_owner','leads:read'),('franchise_owner','attribution:read'),
  ('franchise_owner','commissions:read'),('franchise_owner','sales:analytics'),

  ('accounts','commissions:read'),('accounts','commissions:review'),
  ('accounts','commissions:approve'),('accounts','commissions:lock'),('accounts','attribution:read')
ON CONFLICT DO NOTHING;

-- ============================
-- 11. Seeds
-- ============================
INSERT INTO public.commission_beneficiary_types(code, name, sort_order) VALUES
  ('telecaller','Telecaller',10),
  ('sales_executive','Sales Executive',20),
  ('doctor','Doctor',30),
  ('therapist','Therapist',40),
  ('branch','Branch',50),
  ('franchise','Franchise',60),
  ('master_franchise','Master Franchise',70),
  ('referral_partner','Referral Partner',80),
  ('corporate_partner','Corporate Partner',90),
  ('influencer','Influencer',100),
  ('academy_counselor','Academy Counselor',110)
ON CONFLICT DO NOTHING;

-- Per-tenant seed (stages / dispositions / reasons / SLA defs) for all existing tenants
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    INSERT INTO public.lead_stages(tenant_id, code, name, sort_order, probability, sla_minutes, is_terminal, terminal_kind) VALUES
      (t.id,'new','New',10,10,15,false,NULL),
      (t.id,'contacted','Contacted',20,20,60,false,NULL),
      (t.id,'qualified','Qualified',30,40,1440,false,NULL),
      (t.id,'proposal','Proposal',40,60,2880,false,NULL),
      (t.id,'won','Won',90,100,NULL,true,'won'),
      (t.id,'lost','Lost',99,0,NULL,true,'lost')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.lead_dispositions(tenant_id, code, name, sort_order) VALUES
      (t.id,'connected','Connected',10),
      (t.id,'no_answer','No Answer',20),
      (t.id,'wrong_number','Wrong Number',30),
      (t.id,'interested','Interested',40),
      (t.id,'not_interested','Not Interested',50),
      (t.id,'callback','Callback',60),
      (t.id,'dnd','Do Not Disturb',70),
      (t.id,'language_barrier','Language Barrier',80)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.lead_reasons(tenant_id, code, name, kind, sort_order) VALUES
      (t.id,'price','Price','lost',10),
      (t.id,'distance','Distance','lost',20),
      (t.id,'competitor','Chose Competitor','lost',30),
      (t.id,'timing','Timing','lost',40),
      (t.id,'trust','Trust','lost',50),
      (t.id,'no_response','No Response','lost',60),
      (t.id,'consultation_booked','Consultation Booked','won',10),
      (t.id,'treatment_signed','Treatment Signed','won',20),
      (t.id,'membership_signed','Membership Signed','won',30),
      (t.id,'referral','Referral','won',40)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.sla_definitions(tenant_id, code, name, kind, target_minutes) VALUES
      (t.id,'first_response_15','First response 15 min','first_response',15),
      (t.id,'follow_up_24h','Follow-up 24 h','follow_up',1440),
      (t.id,'callback_on_time','Callback on time','callback',0)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ============================
-- 12. Realtime (opt-in)
-- ============================
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads, public.interactions,
  public.lead_assignments, public.sla_instances, public.commission_accruals;
