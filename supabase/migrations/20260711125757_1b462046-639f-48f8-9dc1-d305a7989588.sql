
-- Helpers
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND tenant_id = _tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role_code(_tenant_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND role_code = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Role constant used in policies
-- roles: super_admin, platform_admin, admin, corporate_admin, master_franchise, franchise_owner, center_manager

-- =====================================================================
-- 1. CATALOG
-- =====================================================================

CREATE TABLE public.appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  duration_min int NOT NULL DEFAULT 30 CHECK (duration_min > 0),
  buffer_before_min int NOT NULL DEFAULT 0 CHECK (buffer_before_min >= 0),
  buffer_after_min  int NOT NULL DEFAULT 0 CHECK (buffer_after_min  >= 0),
  requires_doctor boolean NOT NULL DEFAULT true,
  requires_room boolean NOT NULL DEFAULT false,
  requires_machine boolean NOT NULL DEFAULT false,
  requires_therapist boolean NOT NULL DEFAULT false,
  default_channel text,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  allow_overbook boolean NOT NULL DEFAULT false,
  overbook_pct int NOT NULL DEFAULT 0 CHECK (overbook_pct BETWEEN 0 AND 100),
  priority_weight int NOT NULL DEFAULT 0,
  sla_policy_id uuid REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_types TO authenticated;
GRANT ALL ON public.appointment_types TO service_role;
ALTER TABLE public.appointment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY appt_types_read ON public.appointment_types FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id));
CREATE POLICY appt_types_write ON public.appointment_types FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','master_franchise','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','master_franchise','franchise_owner','center_manager']));
CREATE TRIGGER trg_appt_types_updated BEFORE UPDATE ON public.appointment_types FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.appointment_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_reasons TO authenticated;
GRANT ALL ON public.appointment_reasons TO service_role;
ALTER TABLE public.appointment_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY appt_reasons_read ON public.appointment_reasons FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY appt_reasons_write ON public.appointment_reasons FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_appt_reasons_updated BEFORE UPDATE ON public.appointment_reasons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.appointment_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  is_terminal boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_statuses TO authenticated;
GRANT ALL ON public.appointment_statuses TO service_role;
ALTER TABLE public.appointment_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY appt_statuses_read ON public.appointment_statuses FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY appt_statuses_write ON public.appointment_statuses FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin']));
CREATE TRIGGER trg_appt_statuses_updated BEFORE UPDATE ON public.appointment_statuses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.appointment_cancellation_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  counts_against_no_show boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_cancellation_reasons TO authenticated;
GRANT ALL ON public.appointment_cancellation_reasons TO service_role;
ALTER TABLE public.appointment_cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY appt_cxl_read ON public.appointment_cancellation_reasons FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY appt_cxl_write ON public.appointment_cancellation_reasons FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_appt_cxl_updated BEFORE UPDATE ON public.appointment_cancellation_reasons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 2. RESOURCES
-- =====================================================================

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_kind text NOT NULL,
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  capacity int NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  timezone text,
  is_active boolean NOT NULL DEFAULT true,
  color text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_resources_tenant_kind ON public.resources (tenant_id, resource_kind);
CREATE INDEX idx_resources_branch ON public.resources (branch_id);
CREATE INDEX idx_resources_person ON public.resources (person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY resources_read ON public.resources FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY resources_write ON public.resources FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','master_franchise','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','master_franchise','franchise_owner','center_manager']));
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.resource_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  skill_code text NOT NULL,
  proficiency int DEFAULT 1 CHECK (proficiency BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, skill_code)
);
CREATE INDEX idx_resource_skills_tenant ON public.resource_skills (tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_skills TO authenticated;
GRANT ALL ON public.resource_skills TO service_role;
ALTER TABLE public.resource_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_skills_read ON public.resource_skills FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY resource_skills_write ON public.resource_skills FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));

CREATE TABLE public.resource_service_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  appointment_type_id uuid NOT NULL REFERENCES public.appointment_types(id) ON DELETE CASCADE,
  is_preferred boolean NOT NULL DEFAULT false,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resource_id, appointment_type_id)
);
CREATE INDEX idx_rsm_tenant ON public.resource_service_map (tenant_id);
CREATE INDEX idx_rsm_type ON public.resource_service_map (appointment_type_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_service_map TO authenticated;
GRANT ALL ON public.resource_service_map TO service_role;
ALTER TABLE public.resource_service_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY rsm_read ON public.resource_service_map FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY rsm_write ON public.resource_service_map FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));

CREATE TABLE public.resource_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  resource_kind text,
  strategy text NOT NULL DEFAULT 'round_robin',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_groups TO authenticated;
GRANT ALL ON public.resource_groups TO service_role;
ALTER TABLE public.resource_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY rg_read ON public.resource_groups FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY rg_write ON public.resource_groups FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_rg_updated BEFORE UPDATE ON public.resource_groups FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.resource_group_members (
  group_id uuid NOT NULL REFERENCES public.resource_groups(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  priority int NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, resource_id)
);
CREATE INDEX idx_rgm_tenant ON public.resource_group_members (tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_group_members TO authenticated;
GRANT ALL ON public.resource_group_members TO service_role;
ALTER TABLE public.resource_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY rgm_read ON public.resource_group_members FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY rgm_write ON public.resource_group_members FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));

-- =====================================================================
-- 3. SCHEDULES
-- =====================================================================

CREATE TABLE public.slot_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  timezone text,
  slot_size_min int NOT NULL DEFAULT 15 CHECK (slot_size_min > 0),
  weekly jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_templates TO authenticated;
GRANT ALL ON public.slot_templates TO service_role;
ALTER TABLE public.slot_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY slot_templates_read ON public.slot_templates FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY slot_templates_write ON public.slot_templates FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_slot_templates_updated BEFORE UPDATE ON public.slot_templates FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.resource_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  slot_size_min int NOT NULL DEFAULT 15 CHECK (slot_size_min > 0),
  timezone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX idx_rs_resource ON public.resource_schedules (resource_id, day_of_week);
CREATE INDEX idx_rs_tenant ON public.resource_schedules (tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_schedules TO authenticated;
GRANT ALL ON public.resource_schedules TO service_role;
ALTER TABLE public.resource_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY rs_read ON public.resource_schedules FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY rs_write ON public.resource_schedules FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_rs_updated BEFORE UPDATE ON public.resource_schedules FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.resource_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'recurring',
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  break_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK ((scope = 'recurring' AND day_of_week IS NOT NULL AND break_date IS NULL)
      OR (scope = 'date' AND break_date IS NOT NULL AND day_of_week IS NULL))
);
CREATE INDEX idx_rb_resource ON public.resource_breaks (resource_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_breaks TO authenticated;
GRANT ALL ON public.resource_breaks TO service_role;
ALTER TABLE public.resource_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY rb_read ON public.resource_breaks FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY rb_write ON public.resource_breaks FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_rb_updated BEFORE UPDATE ON public.resource_breaks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.resource_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  leave_type text NOT NULL DEFAULT 'personal',
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_rl_resource ON public.resource_leaves (resource_id, starts_at, ends_at);
CREATE INDEX idx_rl_tenant ON public.resource_leaves (tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_leaves TO authenticated;
GRANT ALL ON public.resource_leaves TO service_role;
ALTER TABLE public.resource_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY rl_read ON public.resource_leaves FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY rl_write ON public.resource_leaves FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']) OR requested_by = auth.uid())
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']) OR requested_by = auth.uid());
CREATE TRIGGER trg_rl_updated BEFORE UPDATE ON public.resource_leaves FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.branch_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  name text NOT NULL,
  blocks_all boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, branch_id, holiday_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_holidays TO authenticated;
GRANT ALL ON public.branch_holidays TO service_role;
ALTER TABLE public.branch_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY bh_read ON public.branch_holidays FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY bh_write ON public.branch_holidays FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_bh_updated BEFORE UPDATE ON public.branch_holidays FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.slot_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  mode text NOT NULL DEFAULT 'block',
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_so_resource ON public.slot_overrides (resource_id, starts_at, ends_at);
CREATE INDEX idx_so_tenant ON public.slot_overrides (tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_overrides TO authenticated;
GRANT ALL ON public.slot_overrides TO service_role;
ALTER TABLE public.slot_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY so_read ON public.slot_overrides FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY so_write ON public.slot_overrides FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.slot_overrides FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =====================================================================
-- 4. SLOT CACHE
-- =====================================================================

CREATE TABLE public.slot_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  appointment_type_id uuid REFERENCES public.appointment_types(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'free',
  hold_id uuid,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_slot_cache_lookup ON public.slot_cache (tenant_id, resource_id, starts_at);
CREATE INDEX idx_slot_cache_type ON public.slot_cache (tenant_id, appointment_type_id, starts_at) WHERE status = 'free';
CREATE INDEX idx_slot_cache_status ON public.slot_cache (tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slot_cache TO authenticated;
GRANT ALL ON public.slot_cache TO service_role;
ALTER TABLE public.slot_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY slot_cache_read ON public.slot_cache FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id));
CREATE POLICY slot_cache_write ON public.slot_cache FOR ALL TO authenticated
  USING (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']))
  WITH CHECK (public.has_any_role_code(tenant_id, ARRAY['super_admin','platform_admin','admin','corporate_admin','franchise_owner','center_manager']));
