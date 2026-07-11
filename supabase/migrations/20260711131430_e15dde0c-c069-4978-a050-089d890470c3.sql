
-- Create shared updated_at trigger helper (missing in project)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================================
-- Phase 2.4 Stage 1 — Enterprise Appointment & Scheduling Schema
-- Additive only. Uses has_any_role_code(), current_tenant_id(), update_updated_at_column().
-- =========================================================================

ALTER TABLE public.resources
  ADD COLUMN IF NOT EXISTS org_unit_id uuid REFERENCES public.org_units(id),
  ADD COLUMN IF NOT EXISTS franchise_id uuid REFERENCES public.org_units(id),
  ADD COLUMN IF NOT EXISTS home_branch_id uuid REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_resources_franchise ON public.resources(franchise_id) WHERE franchise_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_resources_home_branch ON public.resources(home_branch_id);

-- =========================================================================
-- SERVICE CATALOG
-- =========================================================================
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  buffer_before_minutes integer NOT NULL DEFAULT 0,
  buffer_after_minutes integer NOT NULL DEFAULT 0,
  default_appointment_type_id uuid REFERENCES public.appointment_types(id),
  queue_priority integer NOT NULL DEFAULT 0,
  pricing_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  clinical_protocol_ref jsonb,
  consent_template_id uuid,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY services_tenant_read ON public.services FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY services_admin_write ON public.services FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_resource_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  required_skills text[] NOT NULL DEFAULT '{}',
  is_required boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_resource_requirements TO authenticated;
GRANT ALL ON public.service_resource_requirements TO service_role;
ALTER TABLE public.service_resource_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY srr_read ON public.service_resource_requirements FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY srr_write ON public.service_resource_requirements FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE INDEX idx_srr_service ON public.service_resource_requirements(service_id);
CREATE TRIGGER trg_srr_updated_at BEFORE UPDATE ON public.service_resource_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_room_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  room_type text NOT NULL,
  equipment text[] NOT NULL DEFAULT '{}',
  is_required boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_room_requirements TO authenticated;
GRANT ALL ON public.service_room_requirements TO service_role;
ALTER TABLE public.service_room_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY srm_read ON public.service_room_requirements FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY srm_write ON public.service_room_requirements FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE INDEX idx_srm_service ON public.service_room_requirements(service_id);
CREATE TRIGGER trg_srm_updated_at BEFORE UPDATE ON public.service_room_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  code text NOT NULL,
  name text NOT NULL,
  duration_minutes integer NOT NULL,
  price_amount numeric(12,2),
  currency text NOT NULL DEFAULT 'INR',
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, service_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_variants TO authenticated;
GRANT ALL ON public.service_variants TO service_role;
ALTER TABLE public.service_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY sv_read ON public.service_variants FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY sv_write ON public.service_variants FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE TRIGGER trg_sv_updated_at BEFORE UPDATE ON public.service_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  depends_on_service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'required',
  min_interval interval,
  max_interval interval,
  mandatory_completion boolean NOT NULL DEFAULT true,
  condition_expr jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, depends_on_service_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_dependencies TO authenticated;
GRANT ALL ON public.service_dependencies TO service_role;
ALTER TABLE public.service_dependencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY sd_read ON public.service_dependencies FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY sd_write ON public.service_dependencies FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']));
CREATE TRIGGER trg_sd_updated_at BEFORE UPDATE ON public.service_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- APPOINTMENT SERIES
-- =========================================================================
CREATE TABLE public.appointment_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  franchise_id uuid REFERENCES public.org_units(id),
  person_id uuid NOT NULL REFERENCES public.persons(id),
  service_id uuid NOT NULL REFERENCES public.services(id),
  resource_id uuid REFERENCES public.resources(id),
  rrule text NOT NULL,
  dtstart timestamptz NOT NULL,
  until timestamptz,
  occurrence_count integer,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_series TO authenticated;
GRANT ALL ON public.appointment_series TO service_role;
ALTER TABLE public.appointment_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY aser_read ON public.appointment_series FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY aser_write ON public.appointment_series FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor']));
CREATE INDEX idx_aser_person ON public.appointment_series(person_id);
CREATE INDEX idx_aser_branch ON public.appointment_series(branch_id);
CREATE TRIGGER trg_aser_updated_at BEFORE UPDATE ON public.appointment_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- PACKAGE PLANS + SEQUENCES
-- =========================================================================
CREATE TABLE public.appointment_package_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_package_plans TO authenticated;
GRANT ALL ON public.appointment_package_plans TO service_role;
ALTER TABLE public.appointment_package_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_read ON public.appointment_package_plans FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY app_write ON public.appointment_package_plans FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']));
CREATE TRIGGER trg_app_updated_at BEFORE UPDATE ON public.appointment_package_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.appointment_package_plans(id) ON DELETE CASCADE,
  sequence_no integer NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id),
  offset_days_min integer NOT NULL DEFAULT 0,
  offset_days_max integer,
  required boolean NOT NULL DEFAULT true,
  depends_on_item_id uuid REFERENCES public.appointment_package_items(id),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, sequence_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_package_items TO authenticated;
GRANT ALL ON public.appointment_package_items TO service_role;
ALTER TABLE public.appointment_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY api_read ON public.appointment_package_items FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY api_write ON public.appointment_package_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']));
CREATE TRIGGER trg_api_updated_at BEFORE UPDATE ON public.appointment_package_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.appointment_package_plans(id),
  person_id uuid NOT NULL REFERENCES public.persons(id),
  membership_id uuid,
  subscription_id uuid,
  package_id uuid,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_sequences TO authenticated;
GRANT ALL ON public.appointment_sequences TO service_role;
ALTER TABLE public.appointment_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY aseq_read ON public.appointment_sequences FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY aseq_write ON public.appointment_sequences FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_aseq_person ON public.appointment_sequences(person_id);
CREATE TRIGGER trg_aseq_updated_at BEFORE UPDATE ON public.appointment_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_sequence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sequence_id uuid NOT NULL REFERENCES public.appointment_sequences(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.appointment_package_items(id),
  appointment_id uuid,
  planned_date date,
  actual_date date,
  status text NOT NULL DEFAULT 'planned',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_sequence_items TO authenticated;
GRANT ALL ON public.appointment_sequence_items TO service_role;
ALTER TABLE public.appointment_sequence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY asqi_read ON public.appointment_sequence_items FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY asqi_write ON public.appointment_sequence_items FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_asqi_seq ON public.appointment_sequence_items(sequence_id);
CREATE TRIGGER trg_asqi_updated_at BEFORE UPDATE ON public.appointment_sequence_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- APPOINTMENTS CORE
-- =========================================================================
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id),
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  franchise_id uuid REFERENCES public.org_units(id),
  person_id uuid NOT NULL REFERENCES public.persons(id),
  lead_id uuid REFERENCES public.leads(id),
  household_id uuid,
  appointment_code text NOT NULL,
  service_id uuid REFERENCES public.services(id),
  service_variant_id uuid REFERENCES public.service_variants(id),
  appointment_type_id uuid REFERENCES public.appointment_types(id),
  appointment_reason_id uuid REFERENCES public.appointment_reasons(id),
  doctor_id uuid REFERENCES public.resources(id),
  primary_resource_id uuid REFERENCES public.resources(id),
  resource_group_id uuid REFERENCES public.resource_groups(id),
  room_resource_id uuid REFERENCES public.resources(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  duration_minutes integer NOT NULL,
  status_code text NOT NULL DEFAULT 'booked',
  status_id uuid REFERENCES public.appointment_statuses(id),
  checked_in_at timestamptz,
  consult_started_at timestamptz,
  consult_completed_at timestamptz,
  checked_out_at timestamptz,
  cancelled_at timestamptz,
  no_show_at timestamptz,
  booking_source text NOT NULL DEFAULT 'internal',
  booking_channel text,
  booked_by uuid,
  attribution_touch_id uuid,
  delivery_mode text NOT NULL DEFAULT 'in_person',
  service_location jsonb,
  video_session_id text,
  video_provider text,
  pickup_location jsonb,
  dropoff_location jsonb,
  sequence_item_id uuid REFERENCES public.appointment_sequence_items(id),
  parent_appointment_id uuid REFERENCES public.appointments(id),
  series_id uuid REFERENCES public.appointment_series(id),
  occurrence_start_at timestamptz,
  estimate_id uuid,
  invoice_id uuid,
  payment_id uuid,
  membership_id uuid,
  subscription_id uuid,
  package_id uuid,
  commission_event_id uuid,
  revenue_event_id uuid,
  clinical_encounter_id uuid,
  admission_id uuid,
  camp_id uuid,
  is_vip boolean NOT NULL DEFAULT false,
  is_emergency boolean NOT NULL DEFAULT false,
  is_walk_in boolean NOT NULL DEFAULT false,
  priority_weight integer NOT NULL DEFAULT 0,
  notes text,
  internal_notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, appointment_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY appt_read ON public.appointments FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY appt_write ON public.appointments FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor','therapist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor','therapist']));
CREATE INDEX idx_appt_tenant_branch_start ON public.appointments(tenant_id, branch_id, starts_at);
CREATE INDEX idx_appt_tenant_doctor_start ON public.appointments(tenant_id, doctor_id, starts_at);
CREATE INDEX idx_appt_person ON public.appointments(person_id);
CREATE INDEX idx_appt_org_unit ON public.appointments(tenant_id, org_unit_id, starts_at);
CREATE INDEX idx_appt_franchise ON public.appointments(franchise_id, starts_at) WHERE franchise_id IS NOT NULL;
CREATE INDEX idx_appt_status ON public.appointments(tenant_id, status_code);
CREATE INDEX idx_appt_series ON public.appointments(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX idx_appt_sequence_item ON public.appointments(sequence_item_id) WHERE sequence_item_id IS NOT NULL;
CREATE INDEX idx_appt_lead ON public.appointments(lead_id) WHERE lead_id IS NOT NULL;
CREATE TRIGGER trg_appt_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.appointment_sequence_items
  ADD CONSTRAINT asqi_appointment_fk FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE TABLE public.appointment_recurrence_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES public.appointment_series(id) ON DELETE CASCADE,
  original_start_at timestamptz NOT NULL,
  exception_type text NOT NULL,
  new_start_at timestamptz,
  replacement_appointment_id uuid REFERENCES public.appointments(id),
  reason_code text,
  actor uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_recurrence_exceptions TO authenticated;
GRANT ALL ON public.appointment_recurrence_exceptions TO service_role;
ALTER TABLE public.appointment_recurrence_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY are_read ON public.appointment_recurrence_exceptions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY are_write ON public.appointment_recurrence_exceptions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor']));
CREATE INDEX idx_are_series ON public.appointment_recurrence_exceptions(series_id);
CREATE TRIGGER trg_are_updated_at BEFORE UPDATE ON public.appointment_recurrence_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- STATUS HISTORY / REMINDERS / CHECK-IN / CANCEL / RESCHED / NOSHOW / FEEDBACK
-- =========================================================================
CREATE TABLE public.appointment_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid,
  reason text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT ON public.appointment_status_history TO authenticated;
GRANT ALL ON public.appointment_status_history TO service_role;
ALTER TABLE public.appointment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY ash_read ON public.appointment_status_history FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY ash_write ON public.appointment_status_history FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor','therapist']));
CREATE INDEX idx_ash_appt ON public.appointment_status_history(appointment_id, changed_at);

CREATE TABLE public.appointment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  template_code text,
  provider_ref text,
  attempt_no integer NOT NULL DEFAULT 0,
  last_error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_reminders TO authenticated;
GRANT ALL ON public.appointment_reminders TO service_role;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY arem_read ON public.appointment_reminders FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY arem_write ON public.appointment_reminders FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE INDEX idx_arem_scheduled ON public.appointment_reminders(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_arem_appt ON public.appointment_reminders(appointment_id);
CREATE TRIGGER trg_arem_updated_at BEFORE UPDATE ON public.appointment_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_checkin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL,
  arrived_at timestamptz NOT NULL DEFAULT now(),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'reception',
  token_id uuid,
  checked_in_by uuid,
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_checkin TO authenticated;
GRANT ALL ON public.appointment_checkin TO service_role;
ALTER TABLE public.appointment_checkin ENABLE ROW LEVEL SECURITY;
CREATE POLICY aci_read ON public.appointment_checkin FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY aci_write ON public.appointment_checkin FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor']));
CREATE TRIGGER trg_aci_updated_at BEFORE UPDATE ON public.appointment_checkin
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id),
  rating integer,
  nps_score integer,
  comments text,
  channel text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_feedback TO authenticated;
GRANT ALL ON public.appointment_feedback TO service_role;
ALTER TABLE public.appointment_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY afb_read ON public.appointment_feedback FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY afb_write ON public.appointment_feedback FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor','patient']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor','patient']));
CREATE INDEX idx_afb_appt ON public.appointment_feedback(appointment_id);
CREATE TRIGGER trg_afb_updated_at BEFORE UPDATE ON public.appointment_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_cancellation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  cancelled_at timestamptz NOT NULL DEFAULT now(),
  cancelled_by uuid,
  cancelled_by_role text,
  reason_id uuid REFERENCES public.appointment_cancellation_reasons(id),
  reason_notes text,
  refund_status text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_cancellation TO authenticated;
GRANT ALL ON public.appointment_cancellation TO service_role;
ALTER TABLE public.appointment_cancellation ENABLE ROW LEVEL SECURITY;
CREATE POLICY acx_read ON public.appointment_cancellation FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY acx_write ON public.appointment_cancellation FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_acx_appt ON public.appointment_cancellation(appointment_id);
CREATE TRIGGER trg_acx_updated_at BEFORE UPDATE ON public.appointment_cancellation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_reschedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  rescheduled_at timestamptz NOT NULL DEFAULT now(),
  rescheduled_by uuid,
  rescheduled_by_role text,
  from_starts_at timestamptz NOT NULL,
  to_starts_at timestamptz NOT NULL,
  from_resource_id uuid,
  to_resource_id uuid,
  from_branch_id uuid,
  to_branch_id uuid,
  reason text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_reschedule TO authenticated;
GRANT ALL ON public.appointment_reschedule TO service_role;
ALTER TABLE public.appointment_reschedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY arsc_read ON public.appointment_reschedule FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY arsc_write ON public.appointment_reschedule FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_arsc_appt ON public.appointment_reschedule(appointment_id);
CREATE TRIGGER trg_arsc_updated_at BEFORE UPDATE ON public.appointment_reschedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.appointment_no_show (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  waited_minutes integer,
  auto_marked boolean NOT NULL DEFAULT false,
  reason text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_no_show TO authenticated;
GRANT ALL ON public.appointment_no_show TO service_role;
ALTER TABLE public.appointment_no_show ENABLE ROW LEVEL SECURITY;
CREATE POLICY ans_read ON public.appointment_no_show FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY ans_write ON public.appointment_no_show FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor']));
CREATE TRIGGER trg_ans_updated_at BEFORE UPDATE ON public.appointment_no_show
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- QUEUE ENGINE
-- =========================================================================
CREATE TABLE public.appointment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  resource_id uuid REFERENCES public.resources(id),
  queue_date date NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  queue_type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  avg_service_minutes integer NOT NULL DEFAULT 15,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, branch_id, queue_date, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_queue TO authenticated;
GRANT ALL ON public.appointment_queue TO service_role;
ALTER TABLE public.appointment_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY aq_read ON public.appointment_queue FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY aq_write ON public.appointment_queue FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist']));
CREATE INDEX idx_aq_branch_date ON public.appointment_queue(branch_id, queue_date);
CREATE TRIGGER trg_aq_updated_at BEFORE UPDATE ON public.appointment_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.queue_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  queue_id uuid NOT NULL REFERENCES public.appointment_queue(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.persons(id),
  token_number integer NOT NULL,
  token_label text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'waiting',
  issued_at timestamptz NOT NULL DEFAULT now(),
  called_at timestamptz,
  served_at timestamptz,
  completed_at timestamptz,
  expected_wait_minutes integer,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (queue_id, token_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_tokens TO authenticated;
GRANT ALL ON public.queue_tokens TO service_role;
ALTER TABLE public.queue_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY qt_read ON public.queue_tokens FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY qt_write ON public.queue_tokens FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','receptionist','doctor']));
CREATE INDEX idx_qt_queue_status ON public.queue_tokens(queue_id, status, priority DESC, token_number);
CREATE INDEX idx_qt_appt ON public.queue_tokens(appointment_id) WHERE appointment_id IS NOT NULL;
CREATE TRIGGER trg_qt_updated_at BEFORE UPDATE ON public.queue_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- WAITLIST + OFFERS
-- =========================================================================
CREATE TABLE public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  person_id uuid NOT NULL REFERENCES public.persons(id),
  service_id uuid REFERENCES public.services(id),
  appointment_type_id uuid REFERENCES public.appointment_types(id),
  earliest_at timestamptz,
  latest_at timestamptz,
  preferred_doctor_ids uuid[] NOT NULL DEFAULT '{}',
  preferred_branch_ids uuid[] NOT NULL DEFAULT '{}',
  preferred_time_of_day text[] NOT NULL DEFAULT '{}',
  max_distance_km numeric,
  package_context_id uuid,
  sequence_id uuid REFERENCES public.appointment_sequences(id),
  vip_flag boolean NOT NULL DEFAULT false,
  priority_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  offer_ttl_seconds integer NOT NULL DEFAULT 900,
  last_offer_at timestamptz,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_waitlist TO authenticated;
GRANT ALL ON public.appointment_waitlist TO service_role;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY awl_read ON public.appointment_waitlist FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY awl_write ON public.appointment_waitlist FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_awl_active ON public.appointment_waitlist(tenant_id, service_id, status, priority_score DESC) WHERE status = 'active';
CREATE INDEX idx_awl_person ON public.appointment_waitlist(person_id);
CREATE TRIGGER trg_awl_updated_at BEFORE UPDATE ON public.appointment_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.waitlist_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  waitlist_id uuid NOT NULL REFERENCES public.appointment_waitlist(id) ON DELETE CASCADE,
  candidate_starts_at timestamptz NOT NULL,
  candidate_branch_id uuid REFERENCES public.branches(id),
  candidate_resource_id uuid REFERENCES public.resources(id),
  candidate_service_id uuid REFERENCES public.services(id),
  appointment_id uuid REFERENCES public.appointments(id),
  offered_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  response_channel text,
  responded_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_offers TO authenticated;
GRANT ALL ON public.waitlist_offers TO service_role;
ALTER TABLE public.waitlist_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY wo_read ON public.waitlist_offers FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY wo_write ON public.waitlist_offers FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_wo_pending ON public.waitlist_offers(waitlist_id, status);
CREATE INDEX idx_wo_expires ON public.waitlist_offers(expires_at) WHERE status = 'pending';
CREATE TRIGGER trg_wo_updated_at BEFORE UPDATE ON public.waitlist_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- RESOURCE CONFLICT ENGINE
-- =========================================================================
CREATE TABLE public.resource_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason_code text NOT NULL,
  reason_notes text,
  override_allowed boolean NOT NULL DEFAULT false,
  created_by uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_locks TO authenticated;
GRANT ALL ON public.resource_locks TO service_role;
ALTER TABLE public.resource_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY rl_read ON public.resource_locks FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY rl_write ON public.resource_locks FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE INDEX idx_rl_resource_range ON public.resource_locks(resource_id, starts_at, ends_at);
CREATE TRIGGER trg_rl_updated_at BEFORE UPDATE ON public.resource_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.resource_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id),
  slot_key text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  held_by uuid,
  held_for_person_id uuid REFERENCES public.persons(id),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_holds TO authenticated;
GRANT ALL ON public.resource_holds TO service_role;
ALTER TABLE public.resource_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY rh_read ON public.resource_holds FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY rh_write ON public.resource_holds FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist']));
CREATE INDEX idx_rh_active ON public.resource_holds(resource_id, starts_at) WHERE status = 'active';
CREATE INDEX idx_rh_expires ON public.resource_holds(expires_at) WHERE status = 'active';
CREATE TRIGGER trg_rh_updated_at BEFORE UPDATE ON public.resource_holds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.resource_conflict_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  conflict_type text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution text,
  actor uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE ON public.resource_conflict_log TO authenticated;
GRANT ALL ON public.resource_conflict_log TO service_role;
ALTER TABLE public.resource_conflict_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY rcl_read ON public.resource_conflict_log FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY rcl_write ON public.resource_conflict_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','telecaller','receptionist','doctor']));
CREATE POLICY rcl_update ON public.resource_conflict_log FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id());
CREATE INDEX idx_rcl_resource ON public.resource_conflict_log(resource_id, detected_at);

-- =========================================================================
-- CAPACITY PLANNING
-- =========================================================================
CREATE TABLE public.capacity_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id),
  code text NOT NULL,
  name text NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, branch_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capacity_plans TO authenticated;
GRANT ALL ON public.capacity_plans TO service_role;
ALTER TABLE public.capacity_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY cp_read ON public.capacity_plans FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY cp_write ON public.capacity_plans FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE TRIGGER trg_cp_updated_at BEFORE UPDATE ON public.capacity_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.capacity_dimensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.capacity_plans(id) ON DELETE CASCADE,
  dimension text NOT NULL,
  scope_id uuid,
  time_bucket text NOT NULL DEFAULT 'day',
  max_units integer NOT NULL,
  soft_max_units integer,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capacity_dimensions TO authenticated;
GRANT ALL ON public.capacity_dimensions TO service_role;
ALTER TABLE public.capacity_dimensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cd_read ON public.capacity_dimensions FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY cd_write ON public.capacity_dimensions FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE INDEX idx_cd_plan ON public.capacity_dimensions(plan_id);
CREATE TRIGGER trg_cd_updated_at BEFORE UPDATE ON public.capacity_dimensions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.capacity_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.capacity_plans(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  dimension text NOT NULL,
  scope_id uuid,
  delta_units integer NOT NULL,
  reason_code text,
  actor uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.capacity_overrides TO authenticated;
GRANT ALL ON public.capacity_overrides TO service_role;
ALTER TABLE public.capacity_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY co_read ON public.capacity_overrides FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY co_write ON public.capacity_overrides FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin']));
CREATE INDEX idx_co_plan_date ON public.capacity_overrides(plan_id, override_date);
CREATE TRIGGER trg_co_updated_at BEFORE UPDATE ON public.capacity_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- SCHEDULING POLICIES
-- =========================================================================
CREATE TABLE public.scheduling_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'tenant',
  scope_id uuid,
  policy_key text NOT NULL,
  policy_value jsonb NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduling_policies TO authenticated;
GRANT ALL ON public.scheduling_policies TO service_role;
ALTER TABLE public.scheduling_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY sp_read ON public.scheduling_policies FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY sp_write ON public.scheduling_policies FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','operations_admin']));
CREATE INDEX idx_sp_lookup ON public.scheduling_policies(tenant_id, scope, scope_id, policy_key) WHERE is_active;
CREATE TRIGGER trg_sp_updated_at BEFORE UPDATE ON public.scheduling_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- EXTERNAL CALENDAR ACCOUNTS
-- =========================================================================
CREATE TABLE public.external_calendar_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL,
  owner_resource_id uuid REFERENCES public.resources(id),
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  display_name text,
  sync_enabled boolean NOT NULL DEFAULT true,
  sync_direction text NOT NULL DEFAULT 'two_way',
  last_sync_at timestamptz,
  last_sync_status text,
  channel_id text,
  channel_expiry timestamptz,
  connection_id uuid REFERENCES public.integration_connections(id),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, provider_account_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_calendar_accounts TO authenticated;
GRANT ALL ON public.external_calendar_accounts TO service_role;
ALTER TABLE public.external_calendar_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY eca_read ON public.external_calendar_accounts FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY eca_write ON public.external_calendar_accounts FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','doctor','therapist']))
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin','doctor','therapist']));
CREATE TRIGGER trg_eca_updated_at BEFORE UPDATE ON public.external_calendar_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
