
CREATE OR REPLACE FUNCTION public.pp_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;

CREATE OR REPLACE FUNCTION public.can_manage_family(_primary_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT is_super_admin(auth.uid())
      OR auth.uid() = _primary_user
      OR has_permission(auth.uid(), 'patient:family', NULL);
$fn$;

CREATE OR REPLACE FUNCTION public.can_manage_wallet(_row_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT is_super_admin(auth.uid())
      OR auth.uid() = _row_user
      OR has_permission(auth.uid(), 'patient:wallet', NULL);
$fn$;

CREATE OR REPLACE FUNCTION public.can_manage_membership(_row_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT is_super_admin(auth.uid())
      OR auth.uid() = _row_user
      OR has_permission(auth.uid(), 'patient:membership', NULL);
$fn$;

CREATE TABLE public.patient_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL,
  display_name text, avatar_url text, cover_url text, bio text,
  locale text DEFAULT 'en', timezone text DEFAULT 'Asia/Kolkata',
  onboarding_completed boolean NOT NULL DEFAULT false,
  onboarded_at timestamptz, last_seen_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL, key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, category, key)
);

CREATE TABLE public.patient_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL, platform text NOT NULL,
  model text, os_version text, app_version text,
  last_seen_at timestamptz, is_trusted boolean NOT NULL DEFAULT false,
  revoked_at timestamptz, meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, device_id)
);

CREATE TABLE public.patient_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text, provider text NOT NULL, token text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, token)
);

CREATE TABLE public.patient_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL, category text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  quiet_hours_start time, quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, channel, category)
);

CREATE TABLE public.patient_health_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type text NOT NULL, title text NOT NULL, description text,
  target_value numeric, target_unit text, current_value numeric,
  start_date date, target_date date,
  status text NOT NULL DEFAULT 'active', progress_pct numeric DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_code text NOT NULL, value numeric, value_text text, unit text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  source text, device_id uuid REFERENCES public.patient_devices(id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_health_metrics_user_time_idx
  ON public.patient_health_metrics (patient_user_id, metric_code, recorded_at DESC);

CREATE TABLE public.patient_document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.patient_document_folders(id) ON DELETE CASCADE,
  name text NOT NULL, color text, icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.patient_document_folders(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  title text NOT NULL, description text, category text,
  mime_type text, size_bytes bigint, storage_path text,
  is_shared boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_family_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (primary_user_id, name)
);

CREATE TABLE public.patient_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_account_id uuid REFERENCES public.patient_family_accounts(id) ON DELETE CASCADE,
  primary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  member_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  relationship text NOT NULL, display_name text,
  can_view boolean NOT NULL DEFAULT true,
  can_manage boolean NOT NULL DEFAULT false,
  can_book boolean NOT NULL DEFAULT false,
  can_pay boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  invited_at timestamptz, accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_family_members_primary_idx ON public.patient_family_members (primary_user_id);
CREATE INDEX patient_family_members_member_idx ON public.patient_family_members (member_user_id);

CREATE OR REPLACE FUNCTION public.can_read_patient_portal(_row_user uuid, _tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT is_super_admin(auth.uid())
      OR auth.uid() = _row_user
      OR has_permission(auth.uid(), 'patient:read', NULL)
      OR EXISTS (
        SELECT 1 FROM public.patient_family_members m
        WHERE m.member_user_id = _row_user
          AND m.primary_user_id = auth.uid()
          AND m.can_view = true
      );
$fn$;

CREATE OR REPLACE FUNCTION public.can_write_patient_portal(_row_user uuid, _tenant uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT is_super_admin(auth.uid())
      OR auth.uid() = _row_user
      OR has_permission(auth.uid(), 'patient:write', NULL)
      OR EXISTS (
        SELECT 1 FROM public.patient_family_members m
        WHERE m.member_user_id = _row_user
          AND m.primary_user_id = auth.uid()
          AND m.can_manage = true
      );
$fn$;

CREATE TABLE public.patient_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  related_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  related_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  relationship text NOT NULL, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.patient_devices(id) ON DELETE SET NULL,
  ip_address inet, user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz, duration_seconds int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL, entity_type text, entity_id uuid,
  ip_address inet, user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_activity_log_user_time_idx
  ON public.patient_activity_log (patient_user_id, created_at DESC);

CREATE TABLE public.patient_saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL, reference_id uuid, title text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_saved_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prescription_id uuid REFERENCES public.clinical_prescriptions(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  notes text, meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, prescription_id)
);

CREATE TABLE public.patient_saved_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_person_id uuid REFERENCES public.persons(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, doctor_person_id)
);

CREATE TABLE public.patient_favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL, entity_id uuid NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, entity_type, entity_id)
);

CREATE TABLE public.patient_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL, entity_id uuid NOT NULL, label text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, entity_type, entity_id)
);

CREATE TABLE public.patient_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  target_type text NOT NULL, target_id uuid,
  rating int, comment text, sentiment text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  subject text NOT NULL, body text, category text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'in_app',
  topic text, status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.patient_conversations(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text NOT NULL, body text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_chat_messages_conv_idx
  ON public.patient_chat_messages (conversation_id, created_at);

CREATE TABLE public.patient_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'INR',
  balance numeric NOT NULL DEFAULT 0,
  lifetime_credit numeric NOT NULL DEFAULT 0,
  lifetime_debit numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, tenant_id, currency)
);

CREATE TABLE public.patient_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.patient_wallet(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL, amount numeric NOT NULL,
  balance_after numeric, source text NOT NULL,
  reference_type text, reference_id uuid, note text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_wallet_tx_wallet_idx
  ON public.patient_wallet_transactions (wallet_id, created_at DESC);

CREATE TABLE public.patient_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  plan_code text NOT NULL, plan_name text, tier text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, auto_renew boolean NOT NULL DEFAULT false,
  price numeric, currency text DEFAULT 'INR',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_membership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES public.patient_memberships(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL, from_status text, to_status text, note text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_loyalty_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  program_code text NOT NULL, tier text,
  points_balance numeric NOT NULL DEFAULT 0,
  lifetime_earned numeric NOT NULL DEFAULT 0,
  lifetime_redeemed numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id, tenant_id, program_code)
);

CREATE TABLE public.patient_loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.patient_loyalty_accounts(id) ON DELETE CASCADE,
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL, points numeric NOT NULL,
  balance_after numeric, source text NOT NULL,
  reference_type text, reference_id uuid, note text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  code text NOT NULL, name text NOT NULL, description text,
  cost_points numeric NOT NULL DEFAULT 0, cost_amount numeric,
  currency text DEFAULT 'INR', reward_type text NOT NULL,
  stock int, valid_from timestamptz, valid_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE TABLE public.patient_reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.patient_rewards(id) ON DELETE RESTRICT,
  loyalty_account_id uuid REFERENCES public.patient_loyalty_accounts(id) ON DELETE SET NULL,
  points_used numeric NOT NULL DEFAULT 0, amount_used numeric,
  status text NOT NULL DEFAULT 'pending', redemption_code text,
  redeemed_at timestamptz DEFAULT now(), fulfilled_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_health_passport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  passport_code text NOT NULL, qr_payload text, blood_group text,
  allergies jsonb NOT NULL DEFAULT '[]'::jsonb,
  chronic_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  emergency_contact_name text, emergency_contact_phone text,
  organ_donor boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_digital_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  consent_type text NOT NULL, version text NOT NULL,
  status text NOT NULL DEFAULT 'granted',
  granted_at timestamptz DEFAULT now(), revoked_at timestamptz,
  ip_address inet, signature text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL, category text, title text, body text,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz DEFAULT now(), delivered_at timestamptz,
  read_at timestamptz, clicked_at timestamptz,
  reference_type text, reference_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patient_notif_hist_user_time_idx
  ON public.patient_notification_history (patient_user_id, sent_at DESC);

CREATE TABLE public.patient_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text, is_verified boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT true,
  transactional_opt_in boolean NOT NULL DEFAULT true,
  digest_frequency text DEFAULT 'weekly',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_sms_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 text, is_verified boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  transactional_opt_in boolean NOT NULL DEFAULT true,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_whatsapp_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 text, is_opted_in boolean NOT NULL DEFAULT false,
  opted_in_at timestamptz, opted_out_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_app_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language text DEFAULT 'en', timezone text DEFAULT 'Asia/Kolkata',
  units text DEFAULT 'metric', currency text DEFAULT 'INR',
  home_screen text DEFAULT 'dashboard',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_theme_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system', accent_color text,
  font_scale numeric DEFAULT 1.0,
  reduce_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

CREATE TABLE public.patient_dashboard_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  widgets jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_user_id)
);

DO $mig$
DECLARE
  t text;
  owner_col text;
  tables text[] := ARRAY[
    'patient_profiles','patient_preferences','patient_settings','patient_devices',
    'patient_push_tokens','patient_notification_preferences','patient_health_goals',
    'patient_health_metrics','patient_document_folders','patient_documents',
    'patient_family_accounts','patient_family_members','patient_relationships',
    'patient_portal_sessions','patient_activity_log','patient_saved_reports',
    'patient_saved_prescriptions','patient_saved_doctors','patient_favourites',
    'patient_bookmarks','patient_feedback','patient_support_tickets',
    'patient_conversations','patient_chat_messages','patient_wallet',
    'patient_wallet_transactions','patient_memberships','patient_membership_history',
    'patient_loyalty_accounts','patient_loyalty_transactions','patient_rewards',
    'patient_reward_redemptions','patient_health_passport','patient_digital_consents',
    'patient_notification_history','patient_email_preferences','patient_sms_preferences',
    'patient_whatsapp_preferences','patient_app_preferences','patient_theme_preferences',
    'patient_dashboard_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    IF t = 'patient_rewards' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
        t || '_read', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
        || 'USING (is_super_admin(auth.uid()) OR has_permission(auth.uid(), ''patient:rewards'', NULL)) '
        || 'WITH CHECK (is_super_admin(auth.uid()) OR has_permission(auth.uid(), ''patient:rewards'', NULL))',
        t || '_write', t);
    ELSE
      IF t IN ('patient_family_accounts','patient_family_members') THEN
        owner_col := 'primary_user_id';
      ELSE
        owner_col := 'patient_user_id';
      END IF;

      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
        || 'USING (public.can_read_patient_portal(%I, NULL))',
        t || '_read', t, owner_col);

      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
        || 'USING (public.can_write_patient_portal(%I, NULL)) '
        || 'WITH CHECK (public.can_write_patient_portal(%I, NULL))',
        t || '_write', t, owner_col, owner_col);
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I '
        || 'FOR EACH ROW EXECUTE FUNCTION public.pp_touch_updated_at()', t, t);
    END IF;
  END LOOP;
END $mig$;

INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('patient:read',          'patient_portal', 'read',         'Read patient portal data'),
  ('patient:write',         'patient_portal', 'write',        'Manage patient portal data'),
  ('patient:family',        'patient_portal', 'family',       'Manage family / linked members'),
  ('patient:wallet',        'patient_portal', 'wallet',       'Manage patient wallet'),
  ('patient:membership',    'patient_portal', 'membership',   'Manage patient memberships'),
  ('patient:documents',     'patient_portal', 'documents',    'Manage patient documents'),
  ('patient:notifications', 'patient_portal', 'notifications','Manage notification preferences'),
  ('patient:teleconsult',   'patient_portal', 'teleconsult',  'Join or manage teleconsult sessions'),
  ('patient:reports',       'patient_portal', 'reports',      'View patient reports'),
  ('patient:payments',      'patient_portal', 'payments',     'Manage patient payments'),
  ('patient:rewards',       'patient_portal', 'rewards',      'Manage rewards catalog and redemptions')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p.code
  FROM public.permissions p
  CROSS JOIN (VALUES ('customer'), ('platform_admin'), ('super_admin')) AS x(r)
 WHERE p.code LIKE 'patient:%'
ON CONFLICT DO NOTHING;

INSERT INTO public.masters (tenant_id, type_code, code, name, display_order, is_active, is_system, meta)
SELECT NULL, 'search_entity_types', v.code, v.name, v.sort, true, true,
       jsonb_build_object('module','patient_portal')
  FROM (VALUES
    ('patient_profile',    'Patient Profile',    600),
    ('patient_document',   'Patient Document',   610),
    ('patient_family',     'Patient Family',     620),
    ('patient_wallet',     'Patient Wallet',     630),
    ('patient_membership', 'Patient Membership', 640),
    ('patient_reward',     'Patient Reward',     650),
    ('patient_health_goal','Patient Health Goal',660)
  ) AS v(code, name, sort)
ON CONFLICT DO NOTHING;
