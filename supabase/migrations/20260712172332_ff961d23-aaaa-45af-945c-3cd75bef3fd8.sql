
-- =========================================================================
-- PHASE 2.8 STAGE 1 — LABORATORY / RADIOLOGY / PATHOLOGY / MICROBIOLOGY
-- =========================================================================

-- ---------- RBAC PERMISSIONS ---------------------------------------------
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('lab:read',            'lab',        'read',           'Read laboratory data'),
  ('lab:write',           'lab',        'write',          'Create/edit laboratory orders and specimens'),
  ('lab:verify',          'lab',        'verify',         'Verify laboratory results (tech review)'),
  ('lab:release',         'lab',        'release',        'Release/authorize final laboratory results'),
  ('lab:qc_manage',       'lab',        'qc_manage',      'Manage QC and calibration'),
  ('pathology:manage',    'pathology',  'manage',         'Manage pathology cases'),
  ('radiology:manage',    'radiology',  'manage',         'Manage radiology orders and studies')
ON CONFLICT (code) DO NOTHING;

-- ---------- HELPER FUNCTIONS ---------------------------------------------
CREATE OR REPLACE FUNCTION public.can_read_lab(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND (public.has_permission(_user_id,'lab:read', NULL)
               OR public.has_permission(_user_id,'lab:write', NULL)
               OR public.has_permission(_user_id,'lab:verify', NULL)
               OR public.has_permission(_user_id,'lab:release', NULL)));
$$;

CREATE OR REPLACE FUNCTION public.can_write_lab(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'lab:write', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_verify_results(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'lab:verify', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_release_results(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'lab:release', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_qc(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'lab:qc_manage', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pathology(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'pathology:manage', NULL));
$$;

CREATE OR REPLACE FUNCTION public.can_manage_radiology(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR (public.has_tenant_access(_user_id, _tenant_id)
          AND public.has_permission(_user_id,'radiology:manage', NULL));
$$;

-- =========================================================================
-- CATALOG / MASTERS
-- =========================================================================
CREATE TABLE public.lab_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'chemistry',
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_departments TO authenticated;
GRANT ALL ON public.lab_departments TO service_role;
ALTER TABLE public.lab_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ld_read ON public.lab_departments FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ld_write ON public.lab_departments FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_ld_updated BEFORE UPDATE ON public.lab_departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ld_actor BEFORE INSERT OR UPDATE ON public.lab_departments FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_sample_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  category text,
  loinc_code text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_sample_types TO authenticated;
GRANT ALL ON public.lab_sample_types TO service_role;
ALTER TABLE public.lab_sample_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY lst_read ON public.lab_sample_types FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lst_write ON public.lab_sample_types FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lst_updated BEFORE UPDATE ON public.lab_sample_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_container_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  cap_color text,
  additive text,
  default_volume_ml numeric(8,2),
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_container_types TO authenticated;
GRANT ALL ON public.lab_container_types TO service_role;
ALTER TABLE public.lab_container_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY lct_read ON public.lab_container_types FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lct_write ON public.lab_container_types FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lct_updated BEFORE UPDATE ON public.lab_container_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_analyzer_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  vendor text,
  connectivity text,  -- ASTM|HL7|LIS2-A2|Modbus|serial|manual
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_analyzer_types TO authenticated;
GRANT ALL ON public.lab_analyzer_types TO service_role;
ALTER TABLE public.lab_analyzer_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY lat_read ON public.lab_analyzer_types FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lat_write ON public.lab_analyzer_types FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lat_updated BEFORE UPDATE ON public.lab_analyzer_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  ucum text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_units TO authenticated;
GRANT ALL ON public.lab_units TO service_role;
ALTER TABLE public.lab_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY lun_read ON public.lab_units FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY lun_write ON public.lab_units FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_test_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  department_id uuid REFERENCES public.lab_departments(id),
  code text NOT NULL,
  name text NOT NULL,
  short_name text,
  loinc_code text,
  cpt_code text,
  result_kind text NOT NULL DEFAULT 'numeric' CHECK (result_kind IN ('numeric','qualitative','coded','narrative','image','structured')),
  unit_id uuid REFERENCES public.lab_units(id),
  sample_type_id uuid REFERENCES public.lab_sample_types(id),
  container_type_id uuid REFERENCES public.lab_container_types(id),
  analyzer_type_id uuid REFERENCES public.lab_analyzer_types(id),
  method text,
  price numeric(14,2),
  tat_minutes int,
  requires_approval boolean NOT NULL DEFAULT false,
  is_reflex boolean NOT NULL DEFAULT false,
  reflex_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX ix_ltc_dept ON public.lab_test_catalog(tenant_id, department_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_test_catalog TO authenticated;
GRANT ALL ON public.lab_test_catalog TO service_role;
ALTER TABLE public.lab_test_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY ltc_read ON public.lab_test_catalog FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ltc_write ON public.lab_test_catalog FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_ltc_updated BEFORE UPDATE ON public.lab_test_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ltc_actor BEFORE INSERT OR UPDATE ON public.lab_test_catalog FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  department_id uuid REFERENCES public.lab_departments(id),
  price numeric(14,2),
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_panels TO authenticated;
GRANT ALL ON public.lab_panels TO service_role;
ALTER TABLE public.lab_panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY lp_read ON public.lab_panels FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lp_write ON public.lab_panels FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lp_updated BEFORE UPDATE ON public.lab_panels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lp_actor BEFORE INSERT OR UPDATE ON public.lab_panels FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_panel_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  panel_id uuid NOT NULL REFERENCES public.lab_panels(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE CASCADE,
  sequence int NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (panel_id, test_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_panel_tests TO authenticated;
GRANT ALL ON public.lab_panel_tests TO service_role;
ALTER TABLE public.lab_panel_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY lpt_read ON public.lab_panel_tests FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lpt_write ON public.lab_panel_tests FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_reference_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE CASCADE,
  range_type text NOT NULL DEFAULT 'normal',   -- normal|therapeutic|critical|panic
  sex text,       -- M|F|O|null=any
  age_min_days int, age_max_days int,
  low_value numeric(18,4), high_value numeric(18,4),
  qualitative_expected text,
  unit_id uuid REFERENCES public.lab_units(id),
  condition text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_lrr_test ON public.lab_reference_ranges(test_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_reference_ranges TO authenticated;
GRANT ALL ON public.lab_reference_ranges TO service_role;
ALTER TABLE public.lab_reference_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY lrr_read ON public.lab_reference_ranges FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lrr_write ON public.lab_reference_ranges FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_delta_check_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE CASCADE,
  window_days int NOT NULL DEFAULT 30,
  delta_kind text NOT NULL CHECK (delta_kind IN ('absolute','percent')),
  threshold numeric(14,4) NOT NULL,
  action text NOT NULL DEFAULT 'flag',   -- flag|hold|alert
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_delta_check_rules TO authenticated;
GRANT ALL ON public.lab_delta_check_rules TO service_role;
ALTER TABLE public.lab_delta_check_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY ldcr_read ON public.lab_delta_check_rules FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ldcr_write ON public.lab_delta_check_rules FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_critical_value_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  test_id uuid NOT NULL REFERENCES public.lab_test_catalog(id) ON DELETE CASCADE,
  low_critical numeric(18,4),
  high_critical numeric(18,4),
  qualitative_critical text,
  notify_channels jsonb NOT NULL DEFAULT '["sms","call"]'::jsonb,
  ack_required boolean NOT NULL DEFAULT true,
  ack_window_minutes int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_critical_value_rules TO authenticated;
GRANT ALL ON public.lab_critical_value_rules TO service_role;
ALTER TABLE public.lab_critical_value_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY lcvr_read ON public.lab_critical_value_rules FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lcvr_write ON public.lab_critical_value_rules FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

-- =========================================================================
-- ORDERS / ACCESSIONS
-- =========================================================================
CREATE TABLE public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  order_no text NOT NULL,
  person_id uuid,
  patient_id uuid,
  encounter_id uuid,
  ordering_provider_id uuid,
  clinical_order_ref jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority text NOT NULL DEFAULT 'routine',   -- stat|urgent|routine
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','placed','specimen_collected','received','in_process','partial','completed','verified','released','cancelled')),
  ordered_at timestamptz NOT NULL DEFAULT now(),
  fasting boolean,
  diagnosis_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  invoice_id uuid,
  authorization_id uuid,
  external_order_ref text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_no)
);
CREATE INDEX ix_lo_person ON public.lab_orders(tenant_id, person_id);
CREATE INDEX ix_lo_status ON public.lab_orders(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_orders TO authenticated;
GRANT ALL ON public.lab_orders TO service_role;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY lo_read ON public.lab_orders FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lo_write ON public.lab_orders FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lo_updated BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lo_actor BEFORE INSERT OR UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_lo_audit AFTER INSERT OR UPDATE OR DELETE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.lab_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  item_kind text NOT NULL CHECK (item_kind IN ('test','panel')),
  test_id uuid REFERENCES public.lab_test_catalog(id),
  panel_id uuid REFERENCES public.lab_panels(id),
  status text NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered','received','in_process','result_pending','verified','released','cancelled','reflexed')),
  reflex_from_item_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_loi_order ON public.lab_order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_order_items TO authenticated;
GRANT ALL ON public.lab_order_items TO service_role;
ALTER TABLE public.lab_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY loi_read ON public.lab_order_items FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY loi_write ON public.lab_order_items FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_accessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  accession_no text NOT NULL,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  received_location text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','routing','in_process','completed','rejected')),
  rejection_reason text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, accession_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_accessions TO authenticated;
GRANT ALL ON public.lab_accessions TO service_role;
ALTER TABLE public.lab_accessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY la_read ON public.lab_accessions FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY la_write ON public.lab_accessions FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_la_updated BEFORE UPDATE ON public.lab_accessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lab_turnaround_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.lab_order_items(id) ON DELETE CASCADE,
  milestone text NOT NULL,   -- ordered|collected|received|in_process|resulted|verified|released
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_ltl_order ON public.lab_turnaround_logs(order_id, occurred_at);
GRANT SELECT, INSERT ON public.lab_turnaround_logs TO authenticated;
GRANT ALL ON public.lab_turnaround_logs TO service_role;
ALTER TABLE public.lab_turnaround_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ltl_read ON public.lab_turnaround_logs FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ltl_insert ON public.lab_turnaround_logs FOR INSERT TO authenticated WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

-- =========================================================================
-- SPECIMENS
-- =========================================================================
CREATE TABLE public.lab_specimens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  specimen_no text NOT NULL,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE SET NULL,
  accession_id uuid REFERENCES public.lab_accessions(id) ON DELETE SET NULL,
  sample_type_id uuid REFERENCES public.lab_sample_types(id),
  collection_at timestamptz,
  collected_by uuid,
  collection_site text,
  volume_ml numeric(8,2),
  status text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected','in_transit','received','stored','processing','disposed','rejected')),
  storage_location text,
  disposal_at timestamptz,
  rejection_reason text,
  chain_of_custody jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, specimen_no)
);
CREATE INDEX ix_ls_order ON public.lab_specimens(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_specimens TO authenticated;
GRANT ALL ON public.lab_specimens TO service_role;
ALTER TABLE public.lab_specimens ENABLE ROW LEVEL SECURITY;
CREATE POLICY ls_read ON public.lab_specimens FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ls_write ON public.lab_specimens FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_ls_updated BEFORE UPDATE ON public.lab_specimens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ls_actor BEFORE INSERT OR UPDATE ON public.lab_specimens FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_specimen_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  specimen_id uuid NOT NULL REFERENCES public.lab_specimens(id) ON DELETE CASCADE,
  container_type_id uuid REFERENCES public.lab_container_types(id),
  container_no text,
  volume_ml numeric(8,2),
  status text NOT NULL DEFAULT 'active',
  aliquot_of uuid REFERENCES public.lab_specimen_containers(id),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_lsc_spec ON public.lab_specimen_containers(specimen_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_specimen_containers TO authenticated;
GRANT ALL ON public.lab_specimen_containers TO service_role;
ALTER TABLE public.lab_specimen_containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY lsc_read ON public.lab_specimen_containers FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lsc_write ON public.lab_specimen_containers FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_specimen_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  specimen_id uuid REFERENCES public.lab_specimens(id) ON DELETE CASCADE,
  container_id uuid REFERENCES public.lab_specimen_containers(id) ON DELETE CASCADE,
  barcode_value text NOT NULL,
  symbology text NOT NULL DEFAULT 'CODE128',
  is_active boolean NOT NULL DEFAULT true,
  printed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, barcode_value)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_specimen_barcodes TO authenticated;
GRANT ALL ON public.lab_specimen_barcodes TO service_role;
ALTER TABLE public.lab_specimen_barcodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY lsb_read ON public.lab_specimen_barcodes FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lsb_write ON public.lab_specimen_barcodes FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_specimen_tracking (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  specimen_id uuid NOT NULL REFERENCES public.lab_specimens(id) ON DELETE CASCADE,
  event text NOT NULL,   -- collected|labelled|in_transit|received|routed|stored|discarded|rejected
  location text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  temperature_c numeric(5,2),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_lst_spec ON public.lab_specimen_tracking(specimen_id, occurred_at);
GRANT SELECT, INSERT ON public.lab_specimen_tracking TO authenticated;
GRANT ALL ON public.lab_specimen_tracking TO service_role;
ALTER TABLE public.lab_specimen_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY lstk_read ON public.lab_specimen_tracking FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lstk_insert ON public.lab_specimen_tracking FOR INSERT TO authenticated WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

-- =========================================================================
-- ANALYZERS / QC / CALIBRATION
-- =========================================================================
CREATE TABLE public.lab_analyzer_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  analyzer_type_id uuid REFERENCES public.lab_analyzer_types(id),
  code text NOT NULL,
  name text NOT NULL,
  serial_no text,
  location text,
  connection jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance','offline','retired')),
  last_online_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_analyzer_instruments TO authenticated;
GRANT ALL ON public.lab_analyzer_instruments TO service_role;
ALTER TABLE public.lab_analyzer_instruments ENABLE ROW LEVEL SECURITY;
CREATE POLICY lai_read ON public.lab_analyzer_instruments FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lai_write ON public.lab_analyzer_instruments FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id) OR public.can_manage_qc(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_lab(auth.uid(), tenant_id) OR public.can_manage_qc(auth.uid(), tenant_id));
CREATE TRIGGER trg_lai_updated BEFORE UPDATE ON public.lab_analyzer_instruments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lai_actor BEFORE INSERT OR UPDATE ON public.lab_analyzer_instruments FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_analyzer_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  instrument_id uuid NOT NULL REFERENCES public.lab_analyzer_instruments(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.lab_order_items(id) ON DELETE CASCADE,
  specimen_id uuid REFERENCES public.lab_specimens(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_laq_instr ON public.lab_analyzer_queues(instrument_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_analyzer_queues TO authenticated;
GRANT ALL ON public.lab_analyzer_queues TO service_role;
ALTER TABLE public.lab_analyzer_queues ENABLE ROW LEVEL SECURITY;
CREATE POLICY laq_read ON public.lab_analyzer_queues FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY laq_write ON public.lab_analyzer_queues FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_analyzer_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  instrument_id uuid NOT NULL REFERENCES public.lab_analyzer_instruments(id),
  queue_id uuid REFERENCES public.lab_analyzer_queues(id),
  order_item_id uuid REFERENCES public.lab_order_items(id),
  test_id uuid REFERENCES public.lab_test_catalog(id),
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  numeric_value numeric(18,4),
  text_value text,
  unit_code text,
  flag text,
  received_at timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_lares_orderitem ON public.lab_analyzer_results(order_item_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_analyzer_results TO authenticated;
GRANT ALL ON public.lab_analyzer_results TO service_role;
ALTER TABLE public.lab_analyzer_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY lares_read ON public.lab_analyzer_results FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lares_write ON public.lab_analyzer_results FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_qc_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  lot_no text NOT NULL,
  expiry_date date,
  level text,   -- L1|L2|L3
  target_values jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{test_id, mean, sd}]
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code, lot_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_qc_materials TO authenticated;
GRANT ALL ON public.lab_qc_materials TO service_role;
ALTER TABLE public.lab_qc_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY lqm_read ON public.lab_qc_materials FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lqm_write ON public.lab_qc_materials FOR ALL TO authenticated
  USING (public.can_manage_qc(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_qc(auth.uid(), tenant_id));
CREATE TRIGGER trg_lqm_updated BEFORE UPDATE ON public.lab_qc_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lqm_actor BEFORE INSERT OR UPDATE ON public.lab_qc_materials FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_qc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  instrument_id uuid REFERENCES public.lab_analyzer_instruments(id),
  qc_material_id uuid REFERENCES public.lab_qc_materials(id),
  test_id uuid REFERENCES public.lab_test_catalog(id),
  run_at timestamptz NOT NULL DEFAULT now(),
  observed_value numeric(18,4),
  z_score numeric(10,4),
  status text NOT NULL DEFAULT 'in_control' CHECK (status IN ('in_control','warning','out_of_control','failed','excluded')),
  violated_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  comment text,
  actor_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_lqr_test ON public.lab_qc_runs(tenant_id, test_id, run_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_qc_runs TO authenticated;
GRANT ALL ON public.lab_qc_runs TO service_role;
ALTER TABLE public.lab_qc_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY lqr_read ON public.lab_qc_runs FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lqr_write ON public.lab_qc_runs FOR ALL TO authenticated
  USING (public.can_manage_qc(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_qc(auth.uid(), tenant_id));

CREATE TABLE public.lab_qc_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  test_id uuid REFERENCES public.lab_test_catalog(id),
  rule_code text NOT NULL,     -- 1_2s | 1_3s | 2_2s | R_4s | 4_1s | 10x  (Westgard)
  is_active boolean NOT NULL DEFAULT true,
  action text NOT NULL DEFAULT 'warn',   -- warn|reject|hold
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_qc_rules TO authenticated;
GRANT ALL ON public.lab_qc_rules TO service_role;
ALTER TABLE public.lab_qc_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY lqrl_read ON public.lab_qc_rules FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lqrl_write ON public.lab_qc_rules FOR ALL TO authenticated
  USING (public.can_manage_qc(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_qc(auth.uid(), tenant_id));

CREATE TABLE public.lab_calibration_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  instrument_id uuid NOT NULL REFERENCES public.lab_analyzer_instruments(id),
  test_id uuid REFERENCES public.lab_test_catalog(id),
  calibrated_at timestamptz NOT NULL DEFAULT now(),
  performed_by uuid,
  method text,
  slope numeric(18,6),
  intercept numeric(18,6),
  result text,   -- passed|failed|pending
  next_due_at timestamptz,
  document_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_calibration_records TO authenticated;
GRANT ALL ON public.lab_calibration_records TO service_role;
ALTER TABLE public.lab_calibration_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY lcr_read ON public.lab_calibration_records FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lcr_write ON public.lab_calibration_records FOR ALL TO authenticated
  USING (public.can_manage_qc(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_qc(auth.uid(), tenant_id));

-- =========================================================================
-- RESULTS
-- =========================================================================
CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.lab_order_items(id) ON DELETE CASCADE,
  test_id uuid REFERENCES public.lab_test_catalog(id),
  specimen_id uuid REFERENCES public.lab_specimens(id),
  status text NOT NULL DEFAULT 'preliminary' CHECK (status IN ('preliminary','final','amended','corrected','cancelled')),
  numeric_value numeric(18,4),
  text_value text,
  coded_value text,
  unit_code text,
  flag text,      -- L|H|LL|HH|A|N
  is_critical boolean NOT NULL DEFAULT false,
  delta_flag text,
  reference_range_text text,
  method text,
  performed_by uuid,
  performed_at timestamptz,
  verified_by uuid,
  verified_at timestamptz,
  released_by uuid,
  released_at timestamptz,
  amended_reason text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_lres_order ON public.lab_results(order_id);
CREATE INDEX ix_lres_test ON public.lab_results(tenant_id, test_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_results TO authenticated;
GRANT ALL ON public.lab_results TO service_role;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY lres_read ON public.lab_results FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lres_write ON public.lab_results FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)
      OR public.can_verify_results(auth.uid(), tenant_id)
      OR public.can_release_results(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_lab(auth.uid(), tenant_id)
      OR public.can_verify_results(auth.uid(), tenant_id)
      OR public.can_release_results(auth.uid(), tenant_id));
CREATE TRIGGER trg_lres_updated BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lres_actor BEFORE INSERT OR UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_lres_audit AFTER INSERT OR UPDATE OR DELETE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.lab_result_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  result_id uuid NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL,
  reason text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, version)
);
GRANT SELECT, INSERT ON public.lab_result_versions TO authenticated;
GRANT ALL ON public.lab_result_versions TO service_role;
ALTER TABLE public.lab_result_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY lrv_read ON public.lab_result_versions FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lrv_insert ON public.lab_result_versions FOR INSERT TO authenticated WITH CHECK (public.can_write_lab(auth.uid(), tenant_id) OR public.can_verify_results(auth.uid(), tenant_id) OR public.can_release_results(auth.uid(), tenant_id));

-- =========================================================================
-- MICROBIOLOGY
-- =========================================================================
CREATE TABLE public.lab_microbiology_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.lab_order_items(id) ON DELETE CASCADE,
  specimen_id uuid REFERENCES public.lab_specimens(id),
  request_kind text NOT NULL DEFAULT 'culture',
  status text NOT NULL DEFAULT 'pending',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_microbiology_orders TO authenticated;
GRANT ALL ON public.lab_microbiology_orders TO service_role;
ALTER TABLE public.lab_microbiology_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY lmo_read ON public.lab_microbiology_orders FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lmo_write ON public.lab_microbiology_orders FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lmo_updated BEFORE UPDATE ON public.lab_microbiology_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lmo_actor BEFORE INSERT OR UPDATE ON public.lab_microbiology_orders FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_cultures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  microbiology_order_id uuid REFERENCES public.lab_microbiology_orders(id) ON DELETE CASCADE,
  organism_code text,
  organism_name text,
  growth_status text NOT NULL DEFAULT 'no_growth' CHECK (growth_status IN ('no_growth','pending','positive','contaminated','mixed')),
  colony_count text,
  gram_stain text,
  incubated_at timestamptz,
  reported_at timestamptz,
  reported_by uuid,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_cultures TO authenticated;
GRANT ALL ON public.lab_cultures TO service_role;
ALTER TABLE public.lab_cultures ENABLE ROW LEVEL SECURITY;
CREATE POLICY lc_read ON public.lab_cultures FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lc_write ON public.lab_cultures FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_sensitivity_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  culture_id uuid REFERENCES public.lab_cultures(id) ON DELETE CASCADE,
  antibiotic_code text NOT NULL,
  antibiotic_name text NOT NULL,
  mic numeric(10,4),
  interpretation text CHECK (interpretation IN ('S','I','R','SDD','NS','ND')),
  method text,
  reported_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_sensitivity_panels TO authenticated;
GRANT ALL ON public.lab_sensitivity_panels TO service_role;
ALTER TABLE public.lab_sensitivity_panels ENABLE ROW LEVEL SECURITY;
CREATE POLICY lsp_read ON public.lab_sensitivity_panels FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lsp_write ON public.lab_sensitivity_panels FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

-- =========================================================================
-- PATHOLOGY
-- =========================================================================
CREATE TABLE public.lab_pathology_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  case_no text NOT NULL,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE SET NULL,
  specimen_id uuid REFERENCES public.lab_specimens(id),
  case_kind text NOT NULL DEFAULT 'histopathology' CHECK (case_kind IN ('histopathology','cytology','frozen_section','immunohistochemistry','molecular')),
  gross_description text,
  microscopic_description text,
  diagnosis text,
  icd_o_code text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','grossing','processing','embedding','sectioning','staining','reviewing','reported','amended','cancelled')),
  pathologist_id uuid,
  reported_at timestamptz,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, case_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_pathology_cases TO authenticated;
GRANT ALL ON public.lab_pathology_cases TO service_role;
ALTER TABLE public.lab_pathology_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY lpc_read ON public.lab_pathology_cases FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY lpc_write ON public.lab_pathology_cases FOR ALL TO authenticated
  USING (public.can_manage_pathology(auth.uid(), tenant_id) OR public.can_write_lab(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_pathology(auth.uid(), tenant_id) OR public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_lpc_updated BEFORE UPDATE ON public.lab_pathology_cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lpc_actor BEFORE INSERT OR UPDATE ON public.lab_pathology_cases FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- =========================================================================
-- RADIOLOGY / IMAGING
-- =========================================================================
CREATE TABLE public.rad_modalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,      -- CR|DX|CT|MR|US|MG|NM|PT|XA|OT
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rad_modalities TO authenticated;
GRANT ALL ON public.rad_modalities TO service_role;
ALTER TABLE public.rad_modalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY rm_read ON public.rad_modalities FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY rm_write ON public.rad_modalities FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_manage_radiology(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_manage_radiology(auth.uid(), tenant_id));

CREATE TABLE public.rad_body_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  code text NOT NULL,
  name text NOT NULL,
  laterality_supported boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rad_body_parts TO authenticated;
GRANT ALL ON public.rad_body_parts TO service_role;
ALTER TABLE public.rad_body_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY rbp_read ON public.rad_body_parts FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY rbp_write ON public.rad_body_parts FOR ALL TO authenticated
  USING (tenant_id IS NOT NULL AND public.can_manage_radiology(auth.uid(), tenant_id))
  WITH CHECK (tenant_id IS NOT NULL AND public.can_manage_radiology(auth.uid(), tenant_id));

CREATE TABLE public.rad_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  order_no text NOT NULL,
  person_id uuid,
  patient_id uuid,
  encounter_id uuid,
  ordering_provider_id uuid,
  modality_id uuid REFERENCES public.rad_modalities(id),
  body_part_id uuid REFERENCES public.rad_body_parts(id),
  laterality text,
  priority text NOT NULL DEFAULT 'routine',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','placed','scheduled','in_progress','acquired','reading','reported','verified','released','cancelled')),
  clinical_history text,
  diagnosis_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  scheduled_at timestamptz,
  invoice_id uuid,
  authorization_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_no)
);
CREATE INDEX ix_ro_person ON public.rad_orders(tenant_id, person_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rad_orders TO authenticated;
GRANT ALL ON public.rad_orders TO service_role;
ALTER TABLE public.rad_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY ro_read ON public.rad_orders FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id) OR public.can_manage_radiology(auth.uid(), tenant_id));
CREATE POLICY ro_write ON public.rad_orders FOR ALL TO authenticated
  USING (public.can_manage_radiology(auth.uid(), tenant_id) OR public.can_write_lab(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_radiology(auth.uid(), tenant_id) OR public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_ro_updated BEFORE UPDATE ON public.rad_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ro_actor BEFORE INSERT OR UPDATE ON public.rad_orders FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.rad_imaging_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  branch_id uuid,
  rad_order_id uuid REFERENCES public.rad_orders(id) ON DELETE SET NULL,
  study_uid text,
  accession_no text,
  modality_code text,
  performed_at timestamptz,
  performed_by uuid,
  technologist_id uuid,
  radiologist_id uuid,
  status text NOT NULL DEFAULT 'acquired' CHECK (status IN ('scheduled','in_progress','acquired','reading','reported','verified','released','amended','cancelled')),
  report_text text,
  impression text,
  reported_at timestamptz,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ris_order ON public.rad_imaging_studies(rad_order_id);
CREATE INDEX ix_ris_uid ON public.rad_imaging_studies(tenant_id, study_uid);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rad_imaging_studies TO authenticated;
GRANT ALL ON public.rad_imaging_studies TO service_role;
ALTER TABLE public.rad_imaging_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY ris_read ON public.rad_imaging_studies FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id) OR public.can_manage_radiology(auth.uid(), tenant_id));
CREATE POLICY ris_write ON public.rad_imaging_studies FOR ALL TO authenticated
  USING (public.can_manage_radiology(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_radiology(auth.uid(), tenant_id));
CREATE TRIGGER trg_ris_updated BEFORE UPDATE ON public.rad_imaging_studies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ris_actor BEFORE INSERT OR UPDATE ON public.rad_imaging_studies FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.rad_image_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  study_id uuid NOT NULL REFERENCES public.rad_imaging_studies(id) ON DELETE CASCADE,
  series_uid text,
  instance_uid text,
  sop_class_uid text,
  storage_url text,
  rows int, cols int,
  frame_count int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_rim_study ON public.rad_image_metadata(study_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rad_image_metadata TO authenticated;
GRANT ALL ON public.rad_image_metadata TO service_role;
ALTER TABLE public.rad_image_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY rim_read ON public.rad_image_metadata FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id) OR public.can_manage_radiology(auth.uid(), tenant_id));
CREATE POLICY rim_write ON public.rad_image_metadata FOR ALL TO authenticated
  USING (public.can_manage_radiology(auth.uid(), tenant_id)) WITH CHECK (public.can_manage_radiology(auth.uid(), tenant_id));

-- =========================================================================
-- DISTRIBUTION / EXTERNAL LAB
-- =========================================================================
CREATE TABLE public.lab_distribution_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  channel text NOT NULL,      -- email|sms|whatsapp|portal|print|hl7|fhir
  recipient text,
  status text NOT NULL DEFAULT 'sent',   -- queued|sent|delivered|failed|opened
  sent_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_ldl_order ON public.lab_distribution_logs(order_id, sent_at);
GRANT SELECT, INSERT ON public.lab_distribution_logs TO authenticated;
GRANT ALL ON public.lab_distribution_logs TO service_role;
ALTER TABLE public.lab_distribution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ldl_read ON public.lab_distribution_logs FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ldl_insert ON public.lab_distribution_logs FOR INSERT TO authenticated WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

CREATE TABLE public.lab_external_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  order_id uuid REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  vendor_code text NOT NULL,      -- referenced external lab (via integrations)
  external_ref text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','accepted','rejected','in_process','completed','cancelled')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cost numeric(14,2),
  currency text DEFAULT 'INR',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_external_orders TO authenticated;
GRANT ALL ON public.lab_external_orders TO service_role;
ALTER TABLE public.lab_external_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY leo_read ON public.lab_external_orders FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY leo_write ON public.lab_external_orders FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));
CREATE TRIGGER trg_leo_updated BEFORE UPDATE ON public.lab_external_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_leo_actor BEFORE INSERT OR UPDATE ON public.lab_external_orders FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.lab_external_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  external_order_id uuid REFERENCES public.lab_external_orders(id) ON DELETE CASCADE,
  result_id uuid REFERENCES public.lab_results(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  ingested boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_external_results TO authenticated;
GRANT ALL ON public.lab_external_results TO service_role;
ALTER TABLE public.lab_external_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY ler_read ON public.lab_external_results FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY ler_write ON public.lab_external_results FOR ALL TO authenticated
  USING (public.can_write_lab(auth.uid(), tenant_id)) WITH CHECK (public.can_write_lab(auth.uid(), tenant_id));

-- =========================================================================
-- AUDIT
-- =========================================================================
CREATE TABLE public.lab_audit (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text
);
CREATE INDEX ix_labaudit_tenant ON public.lab_audit(tenant_id, occurred_at);
GRANT SELECT, INSERT ON public.lab_audit TO authenticated;
GRANT ALL ON public.lab_audit TO service_role;
ALTER TABLE public.lab_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY laba_read ON public.lab_audit FOR SELECT TO authenticated USING (public.can_read_lab(auth.uid(), tenant_id));
CREATE POLICY laba_insert ON public.lab_audit FOR INSERT TO authenticated WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- =========================================================================
-- SEEDS — global sample types, container types, analyzer types, modalities, body parts
-- =========================================================================
INSERT INTO public.lab_sample_types (tenant_id, code, name, category) VALUES
  (NULL,'WB','Whole Blood','blood'),
  (NULL,'SER','Serum','blood'),
  (NULL,'PLA','Plasma','blood'),
  (NULL,'URN','Urine','urine'),
  (NULL,'STL','Stool','stool'),
  (NULL,'CSF','Cerebrospinal Fluid','fluid'),
  (NULL,'SPT','Sputum','respiratory'),
  (NULL,'SWB','Swab','microbiology'),
  (NULL,'TIS','Tissue','tissue'),
  (NULL,'FNA','FNA Aspirate','cytology')
ON CONFLICT DO NOTHING;

INSERT INTO public.lab_container_types (tenant_id, code, name, cap_color, additive, default_volume_ml) VALUES
  (NULL,'EDTA','EDTA Tube','Lavender','K2EDTA',3.0),
  (NULL,'SST', 'Serum Separator','Gold','Clot activator + gel',5.0),
  (NULL,'CIT','Citrate Tube','Blue','Sodium citrate 3.2%',2.7),
  (NULL,'FLUOX','Fluoride Oxalate','Grey','NaF/KOx',2.0),
  (NULL,'HEP','Heparin','Green','Lithium heparin',4.0),
  (NULL,'URN-CUP','Urine Cup','Yellow',NULL,50.0),
  (NULL,'STOOL','Stool Container','Brown',NULL,30.0),
  (NULL,'BC-AER','Blood Culture Aerobic','Blue','TSB',10.0),
  (NULL,'BC-ANA','Blood Culture Anaerobic','Purple','TSB',10.0)
ON CONFLICT DO NOTHING;

INSERT INTO public.lab_analyzer_types (tenant_id, code, name, vendor, connectivity) VALUES
  (NULL,'HEMA','Hematology Analyzer','Generic','ASTM'),
  (NULL,'CHEM','Chemistry Analyzer','Generic','ASTM'),
  (NULL,'IMM','Immunoassay Analyzer','Generic','HL7'),
  (NULL,'UA','Urinalysis Analyzer','Generic','ASTM'),
  (NULL,'COAG','Coagulation Analyzer','Generic','ASTM'),
  (NULL,'MICRO','Microbiology ID/AST','Generic','HL7'),
  (NULL,'PCR','PCR / Molecular','Generic','HL7')
ON CONFLICT DO NOTHING;

INSERT INTO public.rad_modalities (tenant_id, code, name) VALUES
  (NULL,'CR','Computed Radiography'),
  (NULL,'DX','Digital Radiography'),
  (NULL,'CT','CT Scan'),
  (NULL,'MR','MRI'),
  (NULL,'US','Ultrasound'),
  (NULL,'MG','Mammography'),
  (NULL,'NM','Nuclear Medicine'),
  (NULL,'PT','PET'),
  (NULL,'XA','Angiography'),
  (NULL,'OT','Other')
ON CONFLICT DO NOTHING;

INSERT INTO public.rad_body_parts (tenant_id, code, name, laterality_supported) VALUES
  (NULL,'HEAD','Head',false),
  (NULL,'CHEST','Chest',false),
  (NULL,'ABDOMEN','Abdomen',false),
  (NULL,'PELVIS','Pelvis',false),
  (NULL,'SPINE','Spine',false),
  (NULL,'SHOULDER','Shoulder',true),
  (NULL,'KNEE','Knee',true),
  (NULL,'HIP','Hip',true),
  (NULL,'ANKLE','Ankle',true),
  (NULL,'WRIST','Wrist',true)
ON CONFLICT DO NOTHING;
