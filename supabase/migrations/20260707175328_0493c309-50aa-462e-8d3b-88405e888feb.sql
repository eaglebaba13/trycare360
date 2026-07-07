
-- =========================================================================
-- Phase 1.5a: Enterprise Configuration Module
-- =========================================================================

-- Ensure updated_at trigger fn (already exists but idempotent)
CREATE OR REPLACE FUNCTION public.tc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Trigger to auto-set created_by / updated_by from auth.uid()
CREATE OR REPLACE FUNCTION public.tc_set_actor_columns()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF to_jsonb(NEW) ? 'created_by' AND NEW.created_by IS NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  END IF;
  IF to_jsonb(NEW) ? 'updated_by' THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;

-- Helper: is admin (super_admin OR platform_admin, at tenant or global)
CREATE OR REPLACE FUNCTION public.is_config_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role_code IN ('super_admin','platform_admin','corporate_admin')
          AND (valid_to IS NULL OR valid_to > now())
      );
$$;

-- =========================================================================
-- MASTER ENGINE
-- =========================================================================

CREATE TABLE public.master_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  supports_hierarchy boolean NOT NULL DEFAULT false,
  is_system boolean NOT NULL DEFAULT false,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT ON public.master_types TO authenticated;
GRANT ALL ON public.master_types TO service_role;
ALTER TABLE public.master_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_types read" ON public.master_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_types write" ON public.master_types FOR ALL TO authenticated
  USING (public.is_config_admin(auth.uid())) WITH CHECK (public.is_config_admin(auth.uid()));
CREATE TRIGGER trg_master_types_updated BEFORE UPDATE ON public.master_types
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_master_types_actor BEFORE INSERT OR UPDATE ON public.master_types
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_master_types_audit AFTER INSERT OR UPDATE OR DELETE ON public.master_types
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = global
  type_code text NOT NULL REFERENCES public.master_types(code) ON UPDATE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  parent_id uuid REFERENCES public.masters(id) ON DELETE RESTRICT,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  color text,
  icon text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, type_code, code)
);
CREATE INDEX idx_masters_type ON public.masters(type_code, tenant_id, display_order);
CREATE INDEX idx_masters_parent ON public.masters(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.masters TO authenticated;
GRANT ALL ON public.masters TO service_role;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "masters read" ON public.masters FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "masters write" ON public.masters FOR ALL TO authenticated
  USING (public.is_config_admin(auth.uid()) AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)))
  WITH CHECK (public.is_config_admin(auth.uid()) AND (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id)));
CREATE TRIGGER trg_masters_updated BEFORE UPDATE ON public.masters
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_masters_actor BEFORE INSERT OR UPDATE ON public.masters
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_masters_audit AFTER INSERT OR UPDATE OR DELETE ON public.masters
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

-- =========================================================================
-- TERRITORY: Country -> State -> District -> City -> Area -> PIN
-- =========================================================================

CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  iso2 text UNIQUE,
  iso3 text UNIQUE,
  phone_code text,
  currency_code text,
  currency_symbol text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  gst_state_code text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (country_id, code)
);
CREATE INDEX idx_states_country ON public.states(country_id);

CREATE TABLE public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (state_id, name)
);
CREATE INDEX idx_districts_state ON public.districts(state_id);

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_metro boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (district_id, name)
);
CREATE INDEX idx_cities_district ON public.cities(district_id);

CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (city_id, name)
);
CREATE INDEX idx_areas_city ON public.areas(city_id);

CREATE TABLE public.pincodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (code, city_id)
);
CREATE INDEX idx_pincodes_city ON public.pincodes(city_id);
CREATE INDEX idx_pincodes_code ON public.pincodes(code);

-- Territory: readable by all authenticated; writable by config admin
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['countries','states','districts','cities','areas','pincodes'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s write" ON public.%I FOR ALL TO authenticated USING (public.is_config_admin(auth.uid())) WITH CHECK (public.is_config_admin(auth.uid()))', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_actor BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row()', t, t);
  END LOOP;
END $$;

-- =========================================================================
-- COMPANY / BRAND / GST / BANK / ADDRESS / BRANCH
-- =========================================================================

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  legal_name text NOT NULL,
  brand_name text,
  cin text,
  pan text,
  tan text,
  logo_url text,
  website text,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_companies_tenant ON public.companies(tenant_id);

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  tagline text,
  logo_url text,
  primary_color text,
  secondary_color text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_brands_tenant ON public.brands(tenant_id);
CREATE INDEX idx_brands_company ON public.brands(company_id);

CREATE TABLE public.gst_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  gstin text NOT NULL,
  state_id uuid REFERENCES public.states(id) ON DELETE SET NULL,
  legal_name text,
  trade_name text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (company_id, gstin)
);
CREATE INDEX idx_gst_company ON public.gst_registrations(company_id);

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_number text NOT NULL,
  ifsc text,
  bank_name text NOT NULL,
  branch text,
  account_type text,
  currency_code text DEFAULT 'INR',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (company_id, account_number)
);
CREATE INDEX idx_bank_company ON public.bank_accounts(company_id);

CREATE TABLE public.company_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind text NOT NULL, -- registered/billing/shipping/branch/other (from masters)
  label text,
  line1 text NOT NULL,
  line2 text,
  landmark text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  state_id uuid REFERENCES public.states(id) ON DELETE SET NULL,
  country_id uuid REFERENCES public.countries(id) ON DELETE SET NULL,
  pincode text,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
CREATE INDEX idx_addr_company ON public.company_addresses(company_id);

CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  gst_registration_id uuid REFERENCES public.gst_registrations(id) ON DELETE SET NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  address_id uuid REFERENCES public.company_addresses(id) ON DELETE SET NULL,
  phone text,
  email text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_branches_company ON public.branches(company_id);

-- Tenant-scoped RLS + triggers for company set
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','brands','gst_registrations','bank_accounts','company_addresses','branches'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s read" ON public.%I FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id))', t, t);
    EXECUTE format('CREATE POLICY "%s write" ON public.%I FOR ALL TO authenticated USING (public.is_config_admin(auth.uid()) AND public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.is_config_admin(auth.uid()) AND public.has_tenant_access(auth.uid(), tenant_id))', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_actor BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns()', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row()', t, t);
  END LOOP;
END $$;

-- =========================================================================
-- SETTINGS KV
-- =========================================================================

CREATE TABLE public.global_settings (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  PRIMARY KEY (tenant_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "global_settings read" ON public.global_settings FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "global_settings write" ON public.global_settings FOR ALL TO authenticated
  USING (public.is_config_admin(auth.uid()) AND public.has_tenant_access(auth.uid(), tenant_id))
  WITH CHECK (public.is_config_admin(auth.uid()) AND public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER trg_global_settings_updated BEFORE UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_global_settings_actor BEFORE INSERT OR UPDATE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_global_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.global_settings
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_settings read" ON public.platform_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "platform_settings write" ON public.platform_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_platform_settings_updated BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_platform_settings_actor BEFORE INSERT OR UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();
CREATE TRIGGER trg_platform_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

-- =========================================================================
-- SEED: master type registry (structure only; values added via UI)
-- =========================================================================

INSERT INTO public.master_types (code, name, description, supports_hierarchy, is_system, icon, display_order) VALUES
  ('address_kind',        'Address Kinds',           'Registered, Billing, Shipping, Branch...',   false, true,  'MapPin',        10),
  ('gender',              'Gender',                  'Gender options',                             false, true,  'User',          20),
  ('salutation',          'Salutation',              'Mr, Mrs, Dr...',                             false, true,  'BadgeCheck',    30),
  ('marital_status',      'Marital Status',          'Marital status options',                     false, true,  'Heart',         40),
  ('blood_group',         'Blood Group',             'A+, B+, O-, ...',                            false, true,  'Droplet',       50),
  ('id_proof_type',       'ID Proof Types',          'Aadhaar, PAN, Passport, DL...',              false, true,  'IdCard',        60),
  ('department',          'Departments',             'Business departments',                       true,  true,  'Building2',     70),
  ('designation',         'Designations',            'Job titles',                                 false, true,  'Briefcase',     80),
  ('treatment_category',  'Treatment Categories',    'Hair, Skin, Nail, Nutrition...',             true,  false, 'Sparkles',      90),
  ('treatment_type',      'Treatment Types',         'Specific treatments',                        true,  false, 'Stethoscope',  100),
  ('service_type',        'Service Types',           'Types of services offered',                  false, false, 'Wrench',       110),
  ('consultation_type',   'Consultation Types',      'In-person, Video, Phone...',                 false, false, 'Video',        120),
  ('lead_source',         'Lead Sources',            'Google, Meta, Referral, Walk-in...',         false, false, 'Megaphone',    130),
  ('lead_stage',          'Lead Stages',             'New, Contacted, Qualified, Won, Lost...',    false, false, 'Filter',       140),
  ('lead_status',         'Lead Statuses',           'Active, Cold, Hot, Converted...',            false, false, 'Activity',     150),
  ('campaign_type',       'Campaign Types',          'Marketing campaign categories',              false, false, 'Rocket',       160),
  ('payment_mode',        'Payment Modes',           'Cash, Card, UPI, Bank Transfer...',          false, false, 'CreditCard',   170),
  ('payment_status',      'Payment Statuses',        'Pending, Paid, Failed, Refunded...',         false, false, 'CircleCheck',  180),
  ('invoice_status',      'Invoice Statuses',        'Draft, Issued, Paid, Cancelled...',          false, false, 'FileText',     190),
  ('invoice_prefix',      'Invoice Prefixes',        'Numbering series prefixes',                  false, false, 'Hash',         200),
  ('tax_type',            'Tax Types',               'GST, CGST, SGST, IGST, TDS...',              false, false, 'Percent',      210),
  ('tax_rate',            'Tax Rates',               'Configurable tax rates',                     false, false, 'Percent',      220),
  ('currency',            'Currencies',              'Supported currencies',                       false, true,  'IndianRupee',  230),
  ('unit_of_measure',     'Units of Measure',        'ML, Grams, Sessions, Pieces...',             false, false, 'Ruler',       240),
  ('product_category',    'Product Categories',      'Product classification',                     true,  false, 'Package',      250),
  ('brand_category',      'Product Brands',          'Product brand list',                         false, false, 'Tag',          260),
  ('inventory_location',  'Inventory Locations',     'Warehouse types',                            false, false, 'Warehouse',    270),
  ('stock_movement_type', 'Stock Movement Types',    'IN, OUT, TRANSFER, ADJUSTMENT...',           false, false, 'ArrowLeftRight', 280),
  ('appointment_status',  'Appointment Statuses',    'Booked, Confirmed, Completed, No-Show...',   false, false, 'Calendar',     290),
  ('appointment_type',    'Appointment Types',       'Consultation, Treatment, Follow-up...',      false, false, 'CalendarClock',300),
  ('cancellation_reason', 'Cancellation Reasons',    'Reasons for cancellation',                   false, false, 'XCircle',      310),
  ('feedback_category',   'Feedback Categories',     'Feedback classification',                    false, false, 'MessageSquare',320),
  ('rating_scale',        'Rating Scales',           'Rating options',                             false, false, 'Star',         330),
  ('employee_type',       'Employee Types',          'Permanent, Contract, Intern...',             false, false, 'Users',        340),
  ('employment_status',   'Employment Statuses',     'Active, On Leave, Resigned...',              false, false, 'UserCheck',    350),
  ('leave_type',          'Leave Types',             'Casual, Sick, Earned...',                    false, false, 'CalendarOff',  360),
  ('shift_type',          'Shift Types',             'Morning, Evening, Night...',                 false, false, 'Clock',        370),
  ('academy_course_type', 'Course Types',            'Academy course categories',                  false, false, 'GraduationCap',380),
  ('certificate_type',    'Certificate Types',       'Academy certificate categories',             false, false, 'Award',        390),
  ('document_type',       'Document Types',          'Uploadable document categories',             false, false, 'File',         400),
  ('notification_channel','Notification Channels',   'Email, SMS, WhatsApp, Push, In-App',         false, true,  'Bell',         410),
  ('notification_kind',   'Notification Kinds',      'System notification event types',            false, false, 'BellRing',     420),
  ('subscription_plan',   'Subscription Plans',      'SaaS subscription plans',                    false, false, 'CreditCard',   430),
  ('franchise_type',      'Franchise Types',         'Express, Advanced, Master...',               false, false, 'Store',        440),
  ('vendor_category',     'Vendor Categories',       'Vendor classification',                      false, false, 'Truck',        450)
ON CONFLICT (code) DO NOTHING;
