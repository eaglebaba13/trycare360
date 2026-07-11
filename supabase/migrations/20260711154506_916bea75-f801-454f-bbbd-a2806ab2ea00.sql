
-- ============================================================================
-- Phase 2.5 Stage 4 — Clinical Treatment / Prescriptions / Media / Consents /
-- Follow-ups (SCHEMA ONLY). Reuses Stage 1 helpers:
--   clinical_set_updated_at, can_read_clinical, can_write_clinical,
--   is_super_admin, has_tenant_access, has_permission.
-- No new permissions, no business logic, no services.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VERSIONED SOAP NOTES
-- ----------------------------------------------------------------------------
CREATE TABLE public.clinical_soap_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  encounter_id uuid NOT NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  template_code text,
  status text NOT NULL DEFAULT 'draft', -- draft | finalized | signed | amended
  current_version_id uuid,
  version_count integer NOT NULL DEFAULT 0,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_at timestamptz,
  signature_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (encounter_id)
);
CREATE INDEX idx_csn_tenant_patient ON public.clinical_soap_notes(tenant_id, patient_id);
CREATE INDEX idx_csn_encounter ON public.clinical_soap_notes(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_soap_notes TO authenticated;
GRANT ALL ON public.clinical_soap_notes TO service_role;
ALTER TABLE public.clinical_soap_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soap notes read" ON public.clinical_soap_notes FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "soap notes write" ON public.clinical_soap_notes FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_csn_updated BEFORE UPDATE ON public.clinical_soap_notes
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

CREATE TABLE public.clinical_soap_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  soap_note_id uuid NOT NULL REFERENCES public.clinical_soap_notes(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  template_code text,
  subjective jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective jsonb NOT NULL DEFAULT '{}'::jsonb,
  assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_autosave boolean NOT NULL DEFAULT false,
  restored_from_version_id uuid REFERENCES public.clinical_soap_versions(id) ON DELETE SET NULL,
  signature_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  saved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (soap_note_id, version_no)
);
CREATE INDEX idx_csv_note ON public.clinical_soap_versions(soap_note_id, version_no DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_soap_versions TO authenticated;
GRANT ALL ON public.clinical_soap_versions TO service_role;
ALTER TABLE public.clinical_soap_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soap versions read" ON public.clinical_soap_versions FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "soap versions write" ON public.clinical_soap_versions FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));

ALTER TABLE public.clinical_soap_notes
  ADD CONSTRAINT clinical_soap_notes_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES public.clinical_soap_versions(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 2. TREATMENT PLANS
-- ----------------------------------------------------------------------------
CREATE TABLE public.clinical_treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  protocol_id uuid REFERENCES public.clinical_treatment_protocols(id) ON DELETE SET NULL,
  title text NOT NULL,
  diagnosis text,
  goals jsonb NOT NULL DEFAULT '[]'::jsonb,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text,
  expected_outcomes text,
  contraindications text,
  review_schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft | active | completed | cancelled
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ctp_tenant_patient ON public.clinical_treatment_plans(tenant_id, patient_id, status);
CREATE INDEX idx_ctp_encounter ON public.clinical_treatment_plans(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_treatment_plans TO authenticated;
GRANT ALL ON public.clinical_treatment_plans TO service_role;
ALTER TABLE public.clinical_treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx plans read" ON public.clinical_treatment_plans FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "tx plans write" ON public.clinical_treatment_plans FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_ctp_updated BEFORE UPDATE ON public.clinical_treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. PRESCRIPTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE public.clinical_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  treatment_plan_id uuid REFERENCES public.clinical_treatment_plans(id) ON DELETE SET NULL,
  prescribed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prescribed_at timestamptz,
  status text NOT NULL DEFAULT 'draft', -- draft | issued | cancelled | superseded
  signature_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  printable_ref text,
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crx_tenant_patient ON public.clinical_prescriptions(tenant_id, patient_id, status);
CREATE INDEX idx_crx_encounter ON public.clinical_prescriptions(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_prescriptions TO authenticated;
GRANT ALL ON public.clinical_prescriptions TO service_role;
ALTER TABLE public.clinical_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx read" ON public.clinical_prescriptions FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "rx write" ON public.clinical_prescriptions FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_crx_updated BEFORE UPDATE ON public.clinical_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

CREATE TABLE public.clinical_prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  prescription_id uuid NOT NULL REFERENCES public.clinical_prescriptions(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  medication text NOT NULL,
  dose text,
  frequency text,
  duration text,
  route text,
  instructions text,
  refills integer NOT NULL DEFAULT 0,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  allergy_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  interaction_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crx_items_rx ON public.clinical_prescription_items(prescription_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_prescription_items TO authenticated;
GRANT ALL ON public.clinical_prescription_items TO service_role;
ALTER TABLE public.clinical_prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rx items read" ON public.clinical_prescription_items FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "rx items write" ON public.clinical_prescription_items FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_crx_items_updated BEFORE UPDATE ON public.clinical_prescription_items
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. CLINICAL MEDIA
-- ----------------------------------------------------------------------------
CREATE TABLE public.clinical_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  parent_media_id uuid REFERENCES public.clinical_media(id) ON DELETE SET NULL,
  category text NOT NULL, -- image | video | pdf | report | before | after | body_map
  title text,
  description text,
  storage_bucket text NOT NULL DEFAULT 'clinical-media',
  storage_path text NOT NULL,
  mime text,
  size_bytes bigint,
  taken_at timestamptz,
  body_region text,
  annotations jsonb NOT NULL DEFAULT '[]'::jsonb,
  version_no integer NOT NULL DEFAULT 1,
  is_private boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cmedia_tenant_patient ON public.clinical_media(tenant_id, patient_id, category);
CREATE INDEX idx_cmedia_encounter ON public.clinical_media(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_media TO authenticated;
GRANT ALL ON public.clinical_media TO service_role;
ALTER TABLE public.clinical_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media read" ON public.clinical_media FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "media write" ON public.clinical_media FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_cmedia_updated BEFORE UPDATE ON public.clinical_media
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. CONSENT BINDINGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.clinical_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.clinical_consent_templates(id) ON DELETE SET NULL,
  template_code text,
  template_version text,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | declined | signed | revoked
  signed_at timestamptz,
  actor_person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  actor_role text,
  signature_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  document_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cconsent_tenant_patient ON public.clinical_consents(tenant_id, patient_id, status);
CREATE INDEX idx_cconsent_encounter ON public.clinical_consents(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_consents TO authenticated;
GRANT ALL ON public.clinical_consents TO service_role;
ALTER TABLE public.clinical_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents read" ON public.clinical_consents FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "consents write" ON public.clinical_consents FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_cconsent_updated BEFORE UPDATE ON public.clinical_consents
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. FOLLOW-UPS
-- ----------------------------------------------------------------------------
CREATE TABLE public.clinical_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  encounter_id uuid REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  treatment_plan_id uuid REFERENCES public.clinical_treatment_plans(id) ON DELETE SET NULL,
  suggested_interval_days integer,
  suggested_date date,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'normal', -- low | normal | high | urgent
  status text NOT NULL DEFAULT 'pending', -- pending | scheduled | completed | cancelled
  linked_appointment_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cfup_tenant_patient ON public.clinical_followups(tenant_id, patient_id, status);
CREATE INDEX idx_cfup_encounter ON public.clinical_followups(encounter_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_followups TO authenticated;
GRANT ALL ON public.clinical_followups TO service_role;
ALTER TABLE public.clinical_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followups read" ON public.clinical_followups FOR SELECT TO authenticated
  USING (public.can_read_clinical(auth.uid(), tenant_id));
CREATE POLICY "followups write" ON public.clinical_followups FOR ALL TO authenticated
  USING (public.can_write_clinical(auth.uid(), tenant_id))
  WITH CHECK (public.can_write_clinical(auth.uid(), tenant_id));
CREATE TRIGGER trg_cfup_updated BEFORE UPDATE ON public.clinical_followups
  FOR EACH ROW EXECUTE FUNCTION public.clinical_set_updated_at();
