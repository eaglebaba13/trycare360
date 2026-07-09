
-- ============================================================
-- STAGE A: Master Person Registry — Schema Foundation
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Helper: updated_at touch
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ============================================================
-- 1. Lookup / master tables
-- ============================================================
CREATE TABLE public.person_relationship_types (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  is_reciprocal BOOLEAN NOT NULL DEFAULT true,
  inverse_code TEXT,
  category TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.person_relationship_types TO anon, authenticated;
GRANT ALL ON public.person_relationship_types TO service_role;
ALTER TABLE public.person_relationship_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relationship_types_read" ON public.person_relationship_types FOR SELECT USING (true);
CREATE POLICY "relationship_types_write" ON public.person_relationship_types FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.person_relationship_types (code,label,inverse_code,category,sort_order) VALUES
  ('father','Father','child','family',10),
  ('mother','Mother','child','family',11),
  ('child','Child',NULL,'family',12),
  ('spouse','Spouse','spouse','family',13),
  ('sibling','Sibling','sibling','family',14),
  ('guardian','Guardian','dependent','family',15),
  ('dependent','Dependent','guardian','family',16),
  ('next_of_kin','Next of Kin',NULL,'family',17),
  ('emergency_contact','Emergency Contact',NULL,'contact',20),
  ('corporate_contact','Corporate Contact',NULL,'corporate',30),
  ('employer','Employer',NULL,'corporate',31),
  ('referring_doctor','Referring Doctor',NULL,'clinical',40),
  ('family_physician','Family Physician',NULL,'clinical',41),
  ('insurance_holder','Insurance Holder',NULL,'insurance',50);

CREATE TABLE public.person_address_types (
  code TEXT PRIMARY KEY, label TEXT NOT NULL, sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.person_address_types TO anon, authenticated;
GRANT ALL ON public.person_address_types TO service_role;
ALTER TABLE public.person_address_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "address_types_read" ON public.person_address_types FOR SELECT USING (true);
CREATE POLICY "address_types_write" ON public.person_address_types FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.person_address_types (code,label,sort_order) VALUES
  ('home','Home',10),('office','Office',20),('billing','Billing',30),
  ('shipping','Shipping',40),('temporary','Temporary',50),
  ('clinic_preferred','Preferred Clinic',60),('other','Other',99);

CREATE TABLE public.person_contact_channels (
  code TEXT PRIMARY KEY, label TEXT NOT NULL,
  is_phone BOOLEAN NOT NULL DEFAULT false,
  is_email BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.person_contact_channels TO anon, authenticated;
GRANT ALL ON public.person_contact_channels TO service_role;
ALTER TABLE public.person_contact_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_channels_read" ON public.person_contact_channels FOR SELECT USING (true);
CREATE POLICY "contact_channels_write" ON public.person_contact_channels FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.person_contact_channels (code,label,is_phone,is_email,sort_order) VALUES
  ('mobile','Mobile',true,false,10),
  ('whatsapp','WhatsApp',true,false,20),
  ('landline','Landline',true,false,30),
  ('email','Email',false,true,40),
  ('telegram','Telegram',false,false,50),
  ('signal','Signal',true,false,55),
  ('instagram','Instagram',false,false,60),
  ('linkedin','LinkedIn',false,false,61),
  ('x','X (Twitter)',false,false,62),
  ('facebook','Facebook',false,false,63),
  ('website','Website',false,false,70),
  ('other','Other',false,false,99);

CREATE TABLE public.person_medical_alert_types (
  code TEXT PRIMARY KEY, label TEXT NOT NULL,
  default_severity TEXT NOT NULL DEFAULT 'warn'
    CHECK (default_severity IN ('info','warn','critical')),
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.person_medical_alert_types TO anon, authenticated;
GRANT ALL ON public.person_medical_alert_types TO service_role;
ALTER TABLE public.person_medical_alert_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_types_read" ON public.person_medical_alert_types FOR SELECT USING (true);
CREATE POLICY "alert_types_write" ON public.person_medical_alert_types FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.person_medical_alert_types (code,label,default_severity,sort_order) VALUES
  ('drug_allergy','Drug Allergy','critical',10),
  ('food_allergy','Food Allergy','warn',20),
  ('environmental_allergy','Environmental Allergy','info',30),
  ('medical_alert','General Medical Alert','warn',40),
  ('emergency_alert','Emergency Alert','critical',50),
  ('fall_risk','Fall Risk','warn',60),
  ('diabetic','Diabetic','warn',70),
  ('hypertension','Hypertension','warn',80),
  ('pregnancy','Pregnancy','warn',90),
  ('blood_thinner','On Blood Thinner','critical',100),
  ('immunocompromised','Immunocompromised','critical',110),
  ('seizure_disorder','Seizure Disorder','critical',120),
  ('cardiac_condition','Cardiac Condition','critical',130),
  ('mental_health','Mental Health Note','info',140);

CREATE TABLE public.person_consent_purposes (
  code TEXT PRIMARY KEY, label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.person_consent_purposes TO anon, authenticated;
GRANT ALL ON public.person_consent_purposes TO service_role;
ALTER TABLE public.person_consent_purposes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_purposes_read" ON public.person_consent_purposes FOR SELECT USING (true);
CREATE POLICY "consent_purposes_write" ON public.person_consent_purposes FOR ALL
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
INSERT INTO public.person_consent_purposes (code,label,is_required,sort_order) VALUES
  ('terms_of_service','Terms of Service',true,10),
  ('privacy_policy','Privacy Policy',true,20),
  ('clinical_treatment','Clinical Treatment',true,30),
  ('marketing','Marketing Communications',false,40),
  ('clinical_research','Clinical Research',false,50),
  ('third_party_share','Third-party Data Sharing',false,60),
  ('telehealth','Telehealth Sessions',false,70),
  ('photo_release','Photo / Video Release',false,80),
  ('minor_treatment','Minor Treatment Consent',false,90),
  ('insurance_share','Insurance Data Sharing',false,100);

-- ============================================================
-- 2. persons (identity core)
-- ============================================================
CREATE TABLE public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  first_name TEXT, middle_name TEXT, last_name TEXT,
  display_name TEXT, salutation TEXT,

  gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  dob DATE,
  photo_url TEXT,

  phone_e164 TEXT,
  email_normalized TEXT,

  national_id_hash TEXT,
  identity_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (identity_status IN ('unverified','partial','verified')),
  verification_status TEXT NOT NULL DEFAULT 'none'
    CHECK (verification_status IN ('none','partial','verified')),

  preferred_language TEXT,
  preferred_channel_code TEXT REFERENCES public.person_contact_channels(code),
  preferred_contact_start TIME,
  preferred_contact_end TIME,
  timezone TEXT,
  dnd_enabled BOOLEAN NOT NULL DEFAULT false,
  dnd_reason TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  service_opt_in BOOLEAN NOT NULL DEFAULT true,
  transactional_opt_in BOOLEAN NOT NULL DEFAULT true,

  primary_address_line1 TEXT,
  primary_address_city TEXT,
  primary_address_state TEXT,
  primary_address_country TEXT,
  primary_address_pincode TEXT,
  primary_lat NUMERIC(10,7),
  primary_lng NUMERIC(10,7),

  vip_flag BOOLEAN NOT NULL DEFAULT false,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,

  duplicate_status TEXT NOT NULL DEFAULT 'unique'
    CHECK (duplicate_status IN ('unique','candidate','confirmed_duplicate','merged')),
  merged_into_person_id UUID REFERENCES public.persons(id),
  archived_at TIMESTAMPTZ,
  retention_policy_code TEXT,
  retention_until DATE,
  erasure_state TEXT NOT NULL DEFAULT 'active'
    CHECK (erasure_state IN ('active','anonymised','erased')),

  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.persons TO authenticated;
GRANT ALL ON public.persons TO service_role;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "persons_read" ON public.persons FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "persons_insert" ON public.persons FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id)
              AND public.has_permission(auth.uid(), 'persons:write', NULL));
CREATE POLICY "persons_update" ON public.persons FOR UPDATE
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "persons_delete_super" ON public.persons FOR DELETE
  USING (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.persons_guard_merge_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.merged_into_person_id IS DISTINCT FROM OLD.merged_into_person_id THEN
    IF current_setting('app.merge_engine', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'merged_into_person_id can only be changed by the merge engine';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER persons_guard_merge BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.persons_guard_merge_column();
CREATE TRIGGER persons_touch BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER persons_actor BEFORE INSERT OR UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER persons_audit AFTER INSERT OR UPDATE OR DELETE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE INDEX persons_tenant_idx ON public.persons(tenant_id);
CREATE INDEX persons_dup_status_idx ON public.persons(tenant_id, duplicate_status);
CREATE INDEX persons_identity_status_idx ON public.persons(tenant_id, identity_status);
CREATE INDEX persons_merged_into_idx ON public.persons(merged_into_person_id) WHERE merged_into_person_id IS NOT NULL;
CREATE UNIQUE INDEX persons_phone_unique_active
  ON public.persons(tenant_id, phone_e164)
  WHERE phone_e164 IS NOT NULL AND merged_into_person_id IS NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX persons_email_unique_active
  ON public.persons(tenant_id, email_normalized)
  WHERE email_normalized IS NOT NULL AND merged_into_person_id IS NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX persons_national_id_unique_active
  ON public.persons(tenant_id, national_id_hash)
  WHERE national_id_hash IS NOT NULL AND merged_into_person_id IS NULL AND archived_at IS NULL;
CREATE INDEX persons_name_trgm ON public.persons USING gin (full_name gin_trgm_ops);
CREATE INDEX persons_phone_trgm ON public.persons USING gin (phone_e164 gin_trgm_ops);
CREATE INDEX persons_email_trgm ON public.persons USING gin (email_normalized gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.persons_sync_search()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.erasure_state = 'erased' OR NEW.merged_into_person_id IS NOT NULL THEN
    DELETE FROM public.search_index
      WHERE tenant_id = NEW.tenant_id AND entity_type = 'person' AND entity_id = NEW.id::text;
    RETURN NEW;
  END IF;
  PERFORM public.index_search_entity(
    NEW.tenant_id, 'person', NEW.id::text,
    NEW.full_name,
    COALESCE(NEW.phone_e164, NEW.email_normalized),
    NULL,
    concat_ws(' ', NEW.phone_e164, NEW.email_normalized, NEW.primary_address_city),
    '/people/' || NEW.id::text,
    '{}'::jsonb
  );
  RETURN NEW;
END $$;
CREATE TRIGGER persons_search_sync AFTER INSERT OR UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.persons_sync_search();

-- ============================================================
-- 3. person_addresses
-- ============================================================
CREATE TABLE public.person_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL REFERENCES public.person_address_types(code),
  line1 TEXT NOT NULL, line2 TEXT, area TEXT,
  city TEXT, district TEXT, state TEXT, country TEXT, pincode TEXT,
  landmark TEXT,
  lat NUMERIC(10,7), lng NUMERIC(10,7), geohash TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE, valid_to DATE,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX person_addresses_primary_per_type ON public.person_addresses(person_id, address_type) WHERE is_primary;
CREATE INDEX person_addresses_person_idx ON public.person_addresses(person_id);
CREATE INDEX person_addresses_tenant_idx ON public.person_addresses(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_addresses TO authenticated;
GRANT ALL ON public.person_addresses TO service_role;
ALTER TABLE public.person_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_addresses_read" ON public.person_addresses FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_addresses_write" ON public.person_addresses FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'addresses:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_addresses_touch BEFORE UPDATE ON public.person_addresses
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_addresses_actor BEFORE INSERT OR UPDATE ON public.person_addresses
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_addresses_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_addresses
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE OR REPLACE FUNCTION public.person_addresses_sync_primary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW.person_id, OLD.person_id);
  UPDATE public.persons p SET
    primary_address_line1 = a.line1, primary_address_city = a.city,
    primary_address_state = a.state, primary_address_country = a.country,
    primary_address_pincode = a.pincode, primary_lat = a.lat, primary_lng = a.lng
  FROM (
    SELECT * FROM public.person_addresses
    WHERE person_id = v_pid AND is_primary
    ORDER BY (address_type = 'home') DESC, updated_at DESC LIMIT 1
  ) a
  WHERE p.id = v_pid;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER person_addresses_sync_primary_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.person_addresses
  FOR EACH ROW EXECUTE FUNCTION public.person_addresses_sync_primary();

-- ============================================================
-- 4. person_contacts
-- ============================================================
CREATE TABLE public.person_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  channel TEXT NOT NULL REFERENCES public.person_contact_channels(code),
  value_raw TEXT NOT NULL,
  value_normalized TEXT NOT NULL,
  country_code TEXT, label TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  opt_in BOOLEAN NOT NULL DEFAULT true,
  do_not_contact BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE, valid_to DATE,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX person_contacts_primary_per_channel ON public.person_contacts(person_id, channel) WHERE is_primary;
CREATE UNIQUE INDEX person_contacts_unique_active_value ON public.person_contacts(tenant_id, channel, value_normalized) WHERE valid_to IS NULL;
CREATE INDEX person_contacts_person_idx ON public.person_contacts(person_id);
CREATE INDEX person_contacts_tenant_idx ON public.person_contacts(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_contacts TO authenticated;
GRANT ALL ON public.person_contacts TO service_role;
ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_contacts_read" ON public.person_contacts FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_contacts_write" ON public.person_contacts FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'contacts:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_contacts_touch BEFORE UPDATE ON public.person_contacts
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_contacts_actor BEFORE INSERT OR UPDATE ON public.person_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_contacts_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_contacts
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE OR REPLACE FUNCTION public.person_contacts_sync_primary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW.person_id, OLD.person_id);
  UPDATE public.persons p SET
    phone_e164 = (
      SELECT value_normalized FROM public.person_contacts
      WHERE person_id = v_pid AND is_primary AND channel IN ('mobile','whatsapp','landline')
      ORDER BY (channel='mobile') DESC, updated_at DESC LIMIT 1
    ),
    email_normalized = (
      SELECT value_normalized FROM public.person_contacts
      WHERE person_id = v_pid AND is_primary AND channel = 'email'
      ORDER BY updated_at DESC LIMIT 1
    )
  WHERE p.id = v_pid;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER person_contacts_sync_primary_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.person_contacts
  FOR EACH ROW EXECUTE FUNCTION public.person_contacts_sync_primary();

-- ============================================================
-- 5. person_verifications
-- ============================================================
CREATE TABLE public.person_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('phone_otp','email_otp','document','video_kyc','aadhaar_ekyc','gov_id_lookup','other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','failed','expired')),
  document_type TEXT, document_number_hash TEXT, document_url TEXT,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  verifier_id UUID, provider TEXT, provider_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_verifications_person_idx ON public.person_verifications(person_id);
CREATE INDEX person_verifications_tenant_idx ON public.person_verifications(tenant_id);
CREATE INDEX person_verifications_status_idx ON public.person_verifications(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_verifications TO authenticated;
GRANT ALL ON public.person_verifications TO service_role;
ALTER TABLE public.person_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_verifications_read" ON public.person_verifications FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_verifications_write" ON public.person_verifications FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'verifications:manage', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_verifications_touch BEFORE UPDATE ON public.person_verifications
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_verifications_actor BEFORE INSERT OR UPDATE ON public.person_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_verifications_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_verifications
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE OR REPLACE FUNCTION public.person_verifications_rollup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid UUID; v_any BOOLEAN;
BEGIN
  v_pid := COALESCE(NEW.person_id, OLD.person_id);
  SELECT EXISTS(
    SELECT 1 FROM public.person_verifications
    WHERE person_id = v_pid AND status = 'verified'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_any;
  UPDATE public.persons SET verification_status = CASE WHEN v_any THEN 'partial' ELSE 'none' END
  WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER person_verifications_rollup_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.person_verifications
  FOR EACH ROW EXECUTE FUNCTION public.person_verifications_rollup();

-- ============================================================
-- 6. person_medical_alerts
-- ============================================================
CREATE TABLE public.person_medical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  alert_code TEXT NOT NULL REFERENCES public.person_medical_alert_types(code),
  severity TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info','warn','critical')),
  details TEXT, onset_date DATE, resolved_date DATE,
  source TEXT, recorded_by UUID, verified_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_medical_alerts_person_idx ON public.person_medical_alerts(person_id) WHERE is_active;
CREATE INDEX person_medical_alerts_tenant_idx ON public.person_medical_alerts(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_medical_alerts TO authenticated;
GRANT ALL ON public.person_medical_alerts TO service_role;
ALTER TABLE public.person_medical_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_alerts_read" ON public.person_medical_alerts FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "medical_alerts_write" ON public.person_medical_alerts FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'alerts:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_medical_alerts_touch BEFORE UPDATE ON public.person_medical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_medical_alerts_actor BEFORE INSERT OR UPDATE ON public.person_medical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_medical_alerts_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_medical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

-- ============================================================
-- 7. Consents, data requests, erasure log
-- ============================================================
CREATE TABLE public.person_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  purpose_code TEXT NOT NULL REFERENCES public.person_consent_purposes(code),
  consent_version TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
  source TEXT, ip TEXT, user_agent TEXT, evidence_url TEXT,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_consents_person_idx ON public.person_consents(person_id);
CREATE INDEX person_consents_tenant_idx ON public.person_consents(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_consents TO authenticated;
GRANT ALL ON public.person_consents TO service_role;
ALTER TABLE public.person_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_consents_read" ON public.person_consents FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_consents_write" ON public.person_consents FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'consents:manage', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_consents_touch BEFORE UPDATE ON public.person_consents
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_consents_actor BEFORE INSERT OR UPDATE ON public.person_consents
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_consents_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_consents
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.person_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('export','erasure','rectification','portability')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_progress','completed','rejected','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ, export_url TEXT, notes TEXT,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_data_requests_person_idx ON public.person_data_requests(person_id);
CREATE INDEX person_data_requests_tenant_idx ON public.person_data_requests(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_data_requests TO authenticated;
GRANT ALL ON public.person_data_requests TO service_role;
ALTER TABLE public.person_data_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_requests_read" ON public.person_data_requests FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "data_requests_write" ON public.person_data_requests FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:erase', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_data_requests_touch BEFORE UPDATE ON public.person_data_requests
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_data_requests_actor BEFORE INSERT OR UPDATE ON public.person_data_requests
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_data_requests_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_data_requests
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.person_erasure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  erased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID,
  reason TEXT
);
CREATE INDEX person_erasure_log_person_idx ON public.person_erasure_log(person_id);
GRANT SELECT, INSERT ON public.person_erasure_log TO authenticated;
GRANT ALL ON public.person_erasure_log TO service_role;
ALTER TABLE public.person_erasure_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erasure_log_read" ON public.person_erasure_log FOR SELECT
  USING (public.is_super_admin(auth.uid())
      OR public.has_role_at(auth.uid(), 'platform_admin', NULL));
CREATE POLICY "erasure_log_insert" ON public.person_erasure_log FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================================================
-- 8. Universal tagging
-- ============================================================
CREATE TABLE public.person_tag_defs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT, category TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_tag_defs TO authenticated;
GRANT ALL ON public.person_tag_defs TO service_role;
ALTER TABLE public.person_tag_defs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_tag_defs_read" ON public.person_tag_defs FOR SELECT
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_tag_defs_write" ON public.person_tag_defs FOR ALL
  USING (tenant_id IS NOT NULL
         AND public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:tag', NULL))
  WITH CHECK (tenant_id IS NOT NULL AND public.has_tenant_access(auth.uid(), tenant_id));
INSERT INTO public.person_tag_defs (tenant_id,code,label,category,is_system) VALUES
  (NULL,'vip','VIP','status',true),
  (NULL,'corporate','Corporate','segment',true),
  (NULL,'employee','Employee','segment',true),
  (NULL,'influencer','Influencer','segment',true),
  (NULL,'high_risk','High Risk','clinical',true),
  (NULL,'premium','Premium','segment',true),
  (NULL,'subscription','Subscription','segment',true),
  (NULL,'franchise_owner','Franchise Owner','segment',true),
  (NULL,'do_not_treat','Do Not Treat','clinical',true),
  (NULL,'high_ltv','High LTV','commercial',true),
  (NULL,'at_risk_churn','At Risk of Churn','commercial',true);

CREATE TABLE public.person_tags (
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  tag_def_id UUID NOT NULL REFERENCES public.person_tag_defs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, tag_def_id)
);
CREATE INDEX person_tags_tenant_idx ON public.person_tags(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_tags TO authenticated;
GRANT ALL ON public.person_tags TO service_role;
ALTER TABLE public.person_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_tags_read" ON public.person_tags FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_tags_write" ON public.person_tags FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:tag', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================================================
-- 9. Relationships & households
-- ============================================================
CREATE TABLE public.person_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  to_person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  relationship_code TEXT NOT NULL REFERENCES public.person_relationship_types(code),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  valid_from DATE, valid_to DATE,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_person_id, to_person_id, relationship_code),
  CHECK (from_person_id <> to_person_id)
);
CREATE INDEX person_relationships_from_idx ON public.person_relationships(from_person_id);
CREATE INDEX person_relationships_to_idx ON public.person_relationships(to_person_id);
CREATE INDEX person_relationships_tenant_idx ON public.person_relationships(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_relationships TO authenticated;
GRANT ALL ON public.person_relationships TO service_role;
ALTER TABLE public.person_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "person_relationships_read" ON public.person_relationships FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "person_relationships_write" ON public.person_relationships FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'relationships:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER person_relationships_touch BEFORE UPDATE ON public.person_relationships
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER person_relationships_actor BEFORE INSERT OR UPDATE ON public.person_relationships
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER person_relationships_audit AFTER INSERT OR UPDATE OR DELETE ON public.person_relationships
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE OR REPLACE FUNCTION public.person_relationships_reciprocal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv TEXT; recip BOOLEAN;
BEGIN
  SELECT inverse_code, is_reciprocal INTO inv, recip
    FROM public.person_relationship_types WHERE code = NEW.relationship_code;
  IF recip AND inv IS NOT NULL THEN
    INSERT INTO public.person_relationships
      (tenant_id, from_person_id, to_person_id, relationship_code, is_emergency, valid_from, valid_to)
    VALUES (NEW.tenant_id, NEW.to_person_id, NEW.from_person_id, inv,
            NEW.is_emergency, NEW.valid_from, NEW.valid_to)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER person_relationships_reciprocal_trg
  AFTER INSERT ON public.person_relationships
  FOR EACH ROW EXECUTE FUNCTION public.person_relationships_reciprocal();

CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  head_person_id UUID REFERENCES public.persons(id),
  address_id UUID REFERENCES public.person_addresses(id),
  notes TEXT,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX households_tenant_idx ON public.households(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.households TO authenticated;
GRANT ALL ON public.households TO service_role;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "households_read" ON public.households FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "households_write" ON public.households FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'relationships:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER households_touch BEFORE UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER households_actor BEFORE INSERT OR UPDATE ON public.households
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.household_members (
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_in_household TEXT,
  is_primary_payer BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, person_id)
);
CREATE INDEX household_members_person_idx ON public.household_members(person_id);
CREATE INDEX household_members_tenant_idx ON public.household_members(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_members TO authenticated;
GRANT ALL ON public.household_members TO service_role;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household_members_read" ON public.household_members FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "household_members_write" ON public.household_members FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'relationships:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

-- ============================================================
-- 10. Role extension tables
-- ============================================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  mrn TEXT,
  blood_group TEXT,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  chronic_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  family_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_doctor_id UUID,
  home_branch_id UUID REFERENCES public.branches(id),
  qr_payload TEXT,
  barcode_value TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, mrn)
);
CREATE INDEX patients_tenant_idx ON public.patients(tenant_id);
CREATE INDEX patients_person_idx ON public.patients(person_id);
CREATE INDEX patients_status_idx ON public.patients(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_read" ON public.patients FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "patients_write" ON public.patients FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'patient360:write', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER patients_touch BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();
CREATE TRIGGER patients_actor BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER patients_audit AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.person_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  registration_number TEXT,
  specialty TEXT,
  primary_branch_id UUID REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_doctors_tenant_idx ON public.person_doctors(tenant_id);

CREATE TABLE public.person_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  employee_code TEXT,
  department_id UUID REFERENCES public.departments(id),
  designation TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_code)
);
CREATE INDEX person_employees_tenant_idx ON public.person_employees(tenant_id);

CREATE TABLE public.person_vendor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  vendor_company_id UUID REFERENCES public.companies(id),
  role_at_vendor TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_vendor_contacts_tenant_idx ON public.person_vendor_contacts(tenant_id);

CREATE TABLE public.person_franchise_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  franchise_tier TEXT,
  primary_branch_id UUID REFERENCES public.branches(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_franchise_owners_tenant_idx ON public.person_franchise_owners(tenant_id);

CREATE TABLE public.person_corporate_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  role_at_company TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_corporate_contacts_tenant_idx ON public.person_corporate_contacts(tenant_id);

CREATE TABLE public.person_academy_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  enrollment_code TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','archived','graduated')),
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, enrollment_code)
);
CREATE INDEX person_academy_students_tenant_idx ON public.person_academy_students(tenant_id);

CREATE TABLE public.person_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL UNIQUE REFERENCES public.persons(id) ON DELETE CASCADE,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost','archived')),
  owner_id UUID,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_leads_tenant_idx ON public.person_leads(tenant_id);
CREATE INDEX person_leads_status_idx ON public.person_leads(tenant_id, status);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'person_doctors','person_employees','person_vendor_contacts',
    'person_franchise_owners','person_corporate_contacts',
    'person_academy_students','person_leads'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "%s_read" ON public.%I FOR SELECT USING (public.has_tenant_access(auth.uid(), tenant_id));', t, t);
    EXECUTE format('CREATE POLICY "%s_write" ON public.%I FOR ALL USING (public.has_tenant_access(auth.uid(), tenant_id) AND public.has_permission(auth.uid(), ''persons:write'', NULL)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));', t, t);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();', t, t);
    EXECUTE format('CREATE TRIGGER %I_actor BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();', t, t);
    EXECUTE format('CREATE TRIGGER %I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 11. Merge infrastructure (tables only)
-- ============================================================
CREATE TABLE public.person_duplicate_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_a_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  score NUMERIC(5,2) NOT NULL,
  match_signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewed','merged','dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (person_a_id <> person_b_id),
  UNIQUE (tenant_id, person_a_id, person_b_id)
);
CREATE INDEX person_dup_status_idx ON public.person_duplicate_candidates(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_duplicate_candidates TO authenticated;
GRANT ALL ON public.person_duplicate_candidates TO service_role;
ALTER TABLE public.person_duplicate_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dup_candidates_read" ON public.person_duplicate_candidates FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'dedup:review', NULL));
CREATE POLICY "dup_candidates_write" ON public.person_duplicate_candidates FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'dedup:review', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.person_merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source_person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  target_person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','executed','failed')),
  requested_by UUID, reviewed_by UUID,
  reviewed_at TIMESTAMPTZ, executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_person_id <> target_person_id)
);
CREATE INDEX person_merge_requests_status_idx ON public.person_merge_requests(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_merge_requests TO authenticated;
GRANT ALL ON public.person_merge_requests TO service_role;
ALTER TABLE public.person_merge_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merge_requests_read" ON public.person_merge_requests FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:merge', NULL));
CREATE POLICY "merge_requests_write" ON public.person_merge_requests FOR ALL
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:merge', NULL))
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.person_merge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  merge_request_id UUID REFERENCES public.person_merge_requests(id) ON DELETE SET NULL,
  source_person_id UUID NOT NULL,
  target_person_id UUID NOT NULL,
  source_snapshot JSONB NOT NULL,
  target_snapshot JSONB NOT NULL,
  fk_repoint_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  action TEXT NOT NULL CHECK (action IN ('merge','unmerge')),
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX person_merge_history_tenant_idx ON public.person_merge_history(tenant_id);
CREATE INDEX person_merge_history_source_idx ON public.person_merge_history(source_person_id);
GRANT SELECT, INSERT ON public.person_merge_history TO authenticated;
GRANT ALL ON public.person_merge_history TO service_role;
ALTER TABLE public.person_merge_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merge_history_read" ON public.person_merge_history FOR SELECT
  USING (public.has_tenant_access(auth.uid(), tenant_id)
         AND public.has_permission(auth.uid(), 'persons:merge', NULL));
CREATE POLICY "merge_history_insert" ON public.person_merge_history FOR INSERT
  WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));

CREATE TABLE public.person_fk_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_schema TEXT NOT NULL DEFAULT 'public',
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (table_schema, table_name, column_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_fk_registry TO authenticated;
GRANT ALL ON public.person_fk_registry TO service_role;
ALTER TABLE public.person_fk_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fk_registry_read" ON public.person_fk_registry FOR SELECT
  USING (public.is_super_admin(auth.uid())
      OR public.has_role_at(auth.uid(), 'platform_admin', NULL));
CREATE POLICY "fk_registry_write" ON public.person_fk_registry FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.person_fk_registry (table_name, column_name) VALUES
  ('patients','person_id'),
  ('person_doctors','person_id'),
  ('person_employees','person_id'),
  ('person_vendor_contacts','person_id'),
  ('person_franchise_owners','person_id'),
  ('person_corporate_contacts','person_id'),
  ('person_academy_students','person_id'),
  ('person_leads','person_id'),
  ('person_addresses','person_id'),
  ('person_contacts','person_id'),
  ('person_verifications','person_id'),
  ('person_medical_alerts','person_id'),
  ('person_consents','person_id'),
  ('person_data_requests','person_id'),
  ('person_tags','person_id'),
  ('person_relationships','from_person_id'),
  ('person_relationships','to_person_id'),
  ('household_members','person_id'),
  ('households','head_person_id');

-- ============================================================
-- 12. Future-ready extension slots
-- ============================================================
CREATE TABLE public.person_insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  provider TEXT, policy_number_hash TEXT, plan TEXT,
  valid_from DATE, valid_to DATE, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.person_corporate_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  program TEXT, enrolled_at DATE, valid_to DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.person_lab_orders_ref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  lab_provider TEXT, external_ref TEXT, ordered_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.person_wearable_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  vendor TEXT, model TEXT, device_ref TEXT, linked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.person_iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  vendor TEXT, kind TEXT, device_ref TEXT, linked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.person_government_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  id_type TEXT NOT NULL,
  id_number_hash TEXT NOT NULL,
  country TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id_type, id_number_hash)
);

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'person_insurance_policies','person_corporate_enrollments',
    'person_lab_orders_ref','person_wearable_devices',
    'person_iot_devices','person_government_ids'
  ] LOOP
    EXECUTE format('CREATE INDEX %I_person_idx ON public.%I(person_id);', t, t);
    EXECUTE format('CREATE INDEX %I_tenant_idx ON public.%I(tenant_id);', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE POLICY "%s_read" ON public.%I FOR SELECT USING (public.has_tenant_access(auth.uid(), tenant_id));', t, t);
    EXECUTE format('CREATE POLICY "%s_write" ON public.%I FOR ALL USING (public.has_tenant_access(auth.uid(), tenant_id) AND public.has_permission(auth.uid(), ''persons:write'', NULL)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));', t, t);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.person_touch_updated_at();', t, t);
    EXECUTE format('CREATE TRIGGER %I_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();', t, t);
  END LOOP;
END $$;

-- ============================================================
-- 13. Permission definitions
-- ============================================================
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('persons:read','persons','read','Read persons within tenant'),
  ('persons:write','persons','write','Create / update persons and role links'),
  ('persons:merge','persons','merge','Approve and execute person merges'),
  ('persons:verify','persons','verify','Manage person identity verification'),
  ('persons:erase','persons','erase','Manage GDPR / DPDP erasure and data requests'),
  ('persons:tag','persons','tag','Manage universal person tags'),
  ('patient360:read','patient360','read','Read Patient 360 aggregate view'),
  ('patient360:write','patient360','write','Create / update patient role and clinical fields'),
  ('dedup:review','dedup','review','Review deduplication candidates'),
  ('alerts:write','alerts','write','Create / update medical alerts'),
  ('consents:manage','consents','manage','Manage consent grants and versions'),
  ('relationships:write','relationships','write','Manage person relationships and households'),
  ('contacts:write','contacts','write','Manage person contact methods'),
  ('addresses:write','addresses','write','Manage person addresses'),
  ('verifications:manage','verifications','manage','Initiate and complete verifications')
ON CONFLICT (code) DO NOTHING;
