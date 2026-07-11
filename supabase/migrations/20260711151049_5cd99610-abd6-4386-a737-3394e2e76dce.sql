
-- ============================================================================
-- Phase 2.5 Stage 1 — Clinical schema + Clinical Knowledge Layer (SCHEMA ONLY)
-- Reuses: has_tenant_access, is_super_admin, has_permission, persons, tenants.
-- No services, no engines, no routes.
-- ============================================================================

-- Shared updated_at trigger fn (idempotent)
CREATE OR REPLACE FUNCTION public.clinical_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Helper: can manage Clinical Knowledge Layer
CREATE OR REPLACE FUNCTION public.can_manage_clinical_knowledge(_user uuid, _tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user)
      OR public.has_permission(_user, 'clinical:knowledge:manage', _tenant);
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_clinical_knowledge(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_clinical_knowledge(uuid, uuid) TO authenticated, service_role;

-- Helper: can read/write clinical encounters and patient-level clinical data
CREATE OR REPLACE FUNCTION public.can_read_clinical(_user uuid, _tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user)
      OR (public.has_tenant_access(_user, _tenant)
          AND public.has_permission(_user, 'clinical:encounter:read', _tenant));
$$;
REVOKE EXECUTE ON FUNCTION public.can_read_clinical(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_clinical(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_write_clinical(_user uuid, _tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user)
      OR (public.has_tenant_access(_user, _tenant)
          AND public.has_permission(_user, 'clinical:encounter:write', _tenant));
$$;
REVOKE EXECUTE ON FUNCTION public.can_write_clinical(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_clinical(uuid, uuid) TO authenticated, service_role;

-- ============================================================================
-- KNOWLEDGE LAYER — code systems (small dictionary; SELECT-only for staff)
-- ============================================================================
CREATE TABLE public.clinical_code_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinical_code_systems TO authenticated;
GRANT ALL ON public.clinical_code_systems TO service_role;
ALTER TABLE public.clinical_code_systems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "code systems read authed" ON public.clinical_code_systems FOR SELECT TO authenticated USING (is_active OR public.is_super_admin(auth.uid()));
CREATE POLICY "code systems manage super" ON public.clinical_code_systems FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_ccs_updated BEFORE UPDATE ON public.clinical_code_systems FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

INSERT INTO public.clinical_code_systems (code, name, description) VALUES
  ('internal','TryCare360 Internal','Internal clinical codes used when a standard code is not applicable'),
  ('icd10','ICD-10','International Classification of Diseases, 10th revision — extension point (no dataset bundled)'),
  ('snomed_ct','SNOMED CT','SNOMED Clinical Terms — extension point (no dataset bundled)'),
  ('loinc','LOINC','Logical Observation Identifiers Names and Codes — extension point (no dataset bundled)'),
  ('cpt','CPT','Current Procedural Terminology — extension point (no dataset bundled)')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- KNOWLEDGE LAYER — generic table shape helper
-- Pattern: tenant_id NULL = global (Super Admin editable);
--          tenant_id NOT NULL = tenant override (tenant knowledge manager).
-- ============================================================================

-- clinical_codes
CREATE TABLE public.clinical_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code_system_id uuid NOT NULL REFERENCES public.clinical_code_systems(id) ON DELETE RESTRICT,
  code text NOT NULL,
  display text NOT NULL,
  version text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_clinical_codes ON public.clinical_codes
  (code_system_id, code, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX ix_clinical_codes_tenant ON public.clinical_codes(tenant_id);
CREATE INDEX ix_clinical_codes_search ON public.clinical_codes USING gin (to_tsvector('simple', coalesce(display,'') || ' ' || coalesce(code,'')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_codes TO authenticated;
GRANT ALL ON public.clinical_codes TO service_role;
ALTER TABLE public.clinical_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "codes read" ON public.clinical_codes FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "codes manage" ON public.clinical_codes FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_cc_updated BEFORE UPDATE ON public.clinical_codes FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- Function factory-style: create the remaining Knowledge Layer tables uniformly
-- (individual CREATE TABLE statements keep each table's columns explicit)

-- clinical_protocols
CREATE TABLE public.clinical_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  specialty text,
  version integer NOT NULL DEFAULT 1,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_clinical_protocols ON public.clinical_protocols (code, version, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_protocols TO authenticated;
GRANT ALL ON public.clinical_protocols TO service_role;
ALTER TABLE public.clinical_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protocols read" ON public.clinical_protocols FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "protocols manage" ON public.clinical_protocols FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.clinical_protocols FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_soap_templates
CREATE TABLE public.clinical_soap_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  specialty text,
  version integer NOT NULL DEFAULT 1,
  template jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_soap_tpl ON public.clinical_soap_templates (code, version, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_soap_templates TO authenticated;
GRANT ALL ON public.clinical_soap_templates TO service_role;
ALTER TABLE public.clinical_soap_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soap read" ON public.clinical_soap_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "soap manage" ON public.clinical_soap_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_soap_updated BEFORE UPDATE ON public.clinical_soap_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_diagnosis_templates
CREATE TABLE public.clinical_diagnosis_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  specialty text,
  dx_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_dx_tpl ON public.clinical_diagnosis_templates (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_diagnosis_templates TO authenticated;
GRANT ALL ON public.clinical_diagnosis_templates TO service_role;
ALTER TABLE public.clinical_diagnosis_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dxtpl read" ON public.clinical_diagnosis_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "dxtpl manage" ON public.clinical_diagnosis_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_dxtpl_updated BEFORE UPDATE ON public.clinical_diagnosis_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_treatment_protocols
CREATE TABLE public.clinical_treatment_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  procedure_kind text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_tx_proto ON public.clinical_treatment_protocols (code, version, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_treatment_protocols TO authenticated;
GRANT ALL ON public.clinical_treatment_protocols TO service_role;
ALTER TABLE public.clinical_treatment_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "txproto read" ON public.clinical_treatment_protocols FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "txproto manage" ON public.clinical_treatment_protocols FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_txproto_updated BEFORE UPDATE ON public.clinical_treatment_protocols FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_procedure_checklists
CREATE TABLE public.clinical_procedure_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  procedure_kind text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('pre_op','intra_op','post_op','safety','timeout','general')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_chk ON public.clinical_procedure_checklists (code, phase, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_procedure_checklists TO authenticated;
GRANT ALL ON public.clinical_procedure_checklists TO service_role;
ALTER TABLE public.clinical_procedure_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chk read" ON public.clinical_procedure_checklists FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "chk manage" ON public.clinical_procedure_checklists FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_chk_updated BEFORE UPDATE ON public.clinical_procedure_checklists FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_consent_templates
CREATE TABLE public.clinical_consent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  scope text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  body_template text NOT NULL,
  requires_witness boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_consent_tpl ON public.clinical_consent_templates (code, language, version, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_consent_templates TO authenticated;
GRANT ALL ON public.clinical_consent_templates TO service_role;
ALTER TABLE public.clinical_consent_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consenttpl read" ON public.clinical_consent_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "consenttpl manage" ON public.clinical_consent_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_consenttpl_updated BEFORE UPDATE ON public.clinical_consent_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_prescription_templates
CREATE TABLE public.clinical_prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  diagnosis_hint text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_rxtpl ON public.clinical_prescription_templates (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_prescription_templates TO authenticated;
GRANT ALL ON public.clinical_prescription_templates TO service_role;
ALTER TABLE public.clinical_prescription_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rxtpl read" ON public.clinical_prescription_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "rxtpl manage" ON public.clinical_prescription_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_rxtpl_updated BEFORE UPDATE ON public.clinical_prescription_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_nutrition_plan_templates
CREATE TABLE public.clinical_nutrition_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  meals jsonb NOT NULL DEFAULT '[]'::jsonb,
  macros jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_nut_tpl ON public.clinical_nutrition_plan_templates (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_nutrition_plan_templates TO authenticated;
GRANT ALL ON public.clinical_nutrition_plan_templates TO service_role;
ALTER TABLE public.clinical_nutrition_plan_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nut read" ON public.clinical_nutrition_plan_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "nut manage" ON public.clinical_nutrition_plan_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_nut_updated BEFORE UPDATE ON public.clinical_nutrition_plan_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_followup_templates
CREATE TABLE public.clinical_followup_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  cadence jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_fu_tpl ON public.clinical_followup_templates (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_followup_templates TO authenticated;
GRANT ALL ON public.clinical_followup_templates TO service_role;
ALTER TABLE public.clinical_followup_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "futpl read" ON public.clinical_followup_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "futpl manage" ON public.clinical_followup_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_futpl_updated BEFORE UPDATE ON public.clinical_followup_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_ai_prompt_templates
CREATE TABLE public.clinical_ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  purpose text NOT NULL,
  prompt text NOT NULL,
  model_hint text,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_ai_tpl ON public.clinical_ai_prompt_templates (code, version, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_ai_prompt_templates TO authenticated;
GRANT ALL ON public.clinical_ai_prompt_templates TO service_role;
ALTER TABLE public.clinical_ai_prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aitpl read" ON public.clinical_ai_prompt_templates FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "aitpl manage" ON public.clinical_ai_prompt_templates FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_aitpl_updated BEFORE UPDATE ON public.clinical_ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_anatomy_grids
CREATE TABLE public.clinical_anatomy_grids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  region text NOT NULL,
  grid_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_anat ON public.clinical_anatomy_grids (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_anatomy_grids TO authenticated;
GRANT ALL ON public.clinical_anatomy_grids TO service_role;
ALTER TABLE public.clinical_anatomy_grids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anat read" ON public.clinical_anatomy_grids FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "anat manage" ON public.clinical_anatomy_grids FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_anat_updated BEFORE UPDATE ON public.clinical_anatomy_grids FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_scoring_scales
CREATE TABLE public.clinical_scoring_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  specialty text,
  scale_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_scale ON public.clinical_scoring_scales (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_scoring_scales TO authenticated;
GRANT ALL ON public.clinical_scoring_scales TO service_role;
ALTER TABLE public.clinical_scoring_scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scale read" ON public.clinical_scoring_scales FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "scale manage" ON public.clinical_scoring_scales FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_scale_updated BEFORE UPDATE ON public.clinical_scoring_scales FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_contraindication_rules
CREATE TABLE public.clinical_contraindication_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  severity text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','block')),
  rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_contra ON public.clinical_contraindication_rules (code, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_contraindication_rules TO authenticated;
GRANT ALL ON public.clinical_contraindication_rules TO service_role;
ALTER TABLE public.clinical_contraindication_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contra read" ON public.clinical_contraindication_rules FOR SELECT TO authenticated
  USING (is_active AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)) OR public.is_super_admin(auth.uid()));
CREATE POLICY "contra manage" ON public.clinical_contraindication_rules FOR ALL TO authenticated
  USING (public.can_manage_clinical_knowledge(auth.uid(), tenant_id))
  WITH CHECK (public.can_manage_clinical_knowledge(auth.uid(), tenant_id));
CREATE TRIGGER trg_contra_updated BEFORE UPDATE ON public.clinical_contraindication_rules FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- ============================================================================
-- ENCOUNTER SPINE + ENTERPRISE CLINICAL STRUCTURES
-- ============================================================================

-- clinical_encounters
CREATE TABLE public.clinical_encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id uuid,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  primary_doctor_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  encounter_type text NOT NULL CHECK (encounter_type IN ('opd','procedure','tele','follow_up','review','emergency','walkin','mdt','second_opinion')),
  chief_complaint text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','cancelled','left_without_being_seen')),
  started_at timestamptz,
  ended_at timestamptz,
  appointment_id uuid,
  package_id uuid,
  room text,
  source text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_enc_tenant ON public.clinical_encounters(tenant_id, status);
CREATE INDEX ix_enc_patient ON public.clinical_encounters(patient_id, started_at DESC);
CREATE INDEX ix_enc_doctor ON public.clinical_encounters(primary_doctor_id, started_at DESC);
CREATE INDEX ix_enc_appt ON public.clinical_encounters(appointment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_encounters TO authenticated;
GRANT ALL ON public.clinical_encounters TO service_role;
ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enc read" ON public.clinical_encounters FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "enc insert" ON public.clinical_encounters FOR INSERT TO authenticated
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE POLICY "enc update" ON public.clinical_encounters FOR UPDATE TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE POLICY "enc delete" ON public.clinical_encounters FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_enc_updated BEFORE UPDATE ON public.clinical_encounters FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_encounter_participants (multi-doctor, MDT, cross-franchise)
CREATE TABLE public.clinical_encounter_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  role text NOT NULL,
  source_tenant_id uuid REFERENCES public.tenants(id),
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (encounter_id, person_id, role)
);
CREATE INDEX ix_encp_enc ON public.clinical_encounter_participants(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_encounter_participants TO authenticated;
GRANT ALL ON public.clinical_encounter_participants TO service_role;
ALTER TABLE public.clinical_encounter_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "encp read" ON public.clinical_encounter_participants FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "encp write" ON public.clinical_encounter_participants FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_encp_updated BEFORE UPDATE ON public.clinical_encounter_participants FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_referrals
CREATE TABLE public.clinical_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  source_encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  from_branch_id uuid,
  to_branch_id uuid,
  from_doctor_id uuid REFERENCES public.persons(id),
  to_doctor_id uuid REFERENCES public.persons(id),
  to_tenant_id uuid REFERENCES public.tenants(id),
  external_provider text,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','scheduled','completed','declined','cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_ref_tenant ON public.clinical_referrals(tenant_id, status);
CREATE INDEX ix_ref_patient ON public.clinical_referrals(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_referrals TO authenticated;
GRANT ALL ON public.clinical_referrals TO service_role;
ALTER TABLE public.clinical_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref read" ON public.clinical_referrals FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id)
         OR (to_tenant_id IS NOT NULL AND public.can_read_clinical(auth.uid(), to_tenant_id)));
CREATE POLICY "ref write" ON public.clinical_referrals FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_ref_updated BEFORE UPDATE ON public.clinical_referrals FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_second_opinions
CREATE TABLE public.clinical_second_opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  source_encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  requested_by_doctor_id uuid REFERENCES public.persons(id),
  opinion_doctor_id uuid REFERENCES public.persons(id),
  opinion_tenant_id uuid REFERENCES public.tenants(id),
  question text NOT NULL,
  response text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','in_review','answered','declined','cancelled')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_so_tenant ON public.clinical_second_opinions(tenant_id, status);
CREATE INDEX ix_so_patient ON public.clinical_second_opinions(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_second_opinions TO authenticated;
GRANT ALL ON public.clinical_second_opinions TO service_role;
ALTER TABLE public.clinical_second_opinions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "so read" ON public.clinical_second_opinions FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id)
         OR (opinion_tenant_id IS NOT NULL AND public.can_read_clinical(auth.uid(), opinion_tenant_id)));
CREATE POLICY "so write" ON public.clinical_second_opinions FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.clinical_second_opinions FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- ============================================================================
-- PATIENT-LEVEL CLINICAL PRIMITIVES
-- ============================================================================

-- clinical_problems (problem list)
CREATE TABLE public.clinical_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  code_system_id uuid REFERENCES public.clinical_code_systems(id),
  code text,
  display text NOT NULL,
  category text NOT NULL DEFAULT 'episodic' CHECK (category IN ('chronic','episodic','historical')),
  severity text,
  onset_date date,
  resolved_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','remission','inactive')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_prob_patient ON public.clinical_problems(patient_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_problems TO authenticated;
GRANT ALL ON public.clinical_problems TO service_role;
ALTER TABLE public.clinical_problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prob read" ON public.clinical_problems FOR SELECT TO authenticated USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "prob write" ON public.clinical_problems FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id)) WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_prob_updated BEFORE UPDATE ON public.clinical_problems FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_allergies
CREATE TABLE public.clinical_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  substance text NOT NULL,
  category text CHECK (category IN ('drug','food','environmental','other')),
  reaction text,
  severity text CHECK (severity IN ('mild','moderate','severe','life_threatening')),
  onset_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','resolved','entered_in_error')),
  source text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_allergy_patient ON public.clinical_allergies(patient_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_allergies TO authenticated;
GRANT ALL ON public.clinical_allergies TO service_role;
ALTER TABLE public.clinical_allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allergy read" ON public.clinical_allergies FOR SELECT TO authenticated USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "allergy write" ON public.clinical_allergies FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id)) WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_allergy_updated BEFORE UPDATE ON public.clinical_allergies FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_vitals
CREATE TABLE public.clinical_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  measured_at timestamptz NOT NULL DEFAULT now(),
  height_cm numeric(6,2),
  weight_kg numeric(6,2),
  bmi numeric(5,2),
  bp_systolic integer,
  bp_diastolic integer,
  heart_rate integer,
  spo2 integer,
  temperature_c numeric(4,1),
  resp_rate integer,
  waist_cm numeric(6,2),
  hip_cm numeric(6,2),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_vitals_patient ON public.clinical_vitals(patient_id, measured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_vitals TO authenticated;
GRANT ALL ON public.clinical_vitals TO service_role;
ALTER TABLE public.clinical_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitals read" ON public.clinical_vitals FOR SELECT TO authenticated USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "vitals write" ON public.clinical_vitals FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id)) WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_vitals_updated BEFORE UPDATE ON public.clinical_vitals FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_family_history
CREATE TABLE public.clinical_family_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  relation text NOT NULL,
  condition_display text NOT NULL,
  code_system_id uuid REFERENCES public.clinical_code_systems(id),
  code text,
  onset_age integer,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_fh_patient ON public.clinical_family_history(patient_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_family_history TO authenticated;
GRANT ALL ON public.clinical_family_history TO service_role;
ALTER TABLE public.clinical_family_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fh read" ON public.clinical_family_history FOR SELECT TO authenticated USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "fh write" ON public.clinical_family_history FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id)) WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_fh_updated BEFORE UPDATE ON public.clinical_family_history FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_medical_history
CREATE TABLE public.clinical_medical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('medical','surgical','obgyn','immunization','hospitalization','other')),
  summary text NOT NULL,
  event_date date,
  code_system_id uuid REFERENCES public.clinical_code_systems(id),
  code text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_mh_patient ON public.clinical_medical_history(patient_id, category);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_medical_history TO authenticated;
GRANT ALL ON public.clinical_medical_history TO service_role;
ALTER TABLE public.clinical_medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mh read" ON public.clinical_medical_history FOR SELECT TO authenticated USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "mh write" ON public.clinical_medical_history FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id)) WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_mh_updated BEFORE UPDATE ON public.clinical_medical_history FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- clinical_lifestyle_history
CREATE TABLE public.clinical_lifestyle_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  smoking jsonb,
  alcohol jsonb,
  diet jsonb,
  exercise jsonb,
  sleep jsonb,
  occupation text,
  stress text,
  substance_use jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_lh_patient ON public.clinical_lifestyle_history(patient_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_lifestyle_history TO authenticated;
GRANT ALL ON public.clinical_lifestyle_history TO service_role;
ALTER TABLE public.clinical_lifestyle_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lh read" ON public.clinical_lifestyle_history FOR SELECT TO authenticated USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "lh write" ON public.clinical_lifestyle_history FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id)) WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_lh_updated BEFORE UPDATE ON public.clinical_lifestyle_history FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();
