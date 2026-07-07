
-- ============================================================
-- HARDEN existing helper functions
-- ============================================================
ALTER FUNCTION public.tc_set_updated_at() SET search_path = public;
ALTER FUNCTION public.tc_org_units_set_path() SET search_path = public;

-- Lock down SECURITY DEFINER functions
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.is_super_admin(uuid)',
    'public.current_tenant_id()',
    'public.has_role_at(uuid,text,uuid)',
    'public.has_permission(uuid,text,uuid)',
    'public.has_org_access(uuid,uuid)',
    'public.has_tenant_access(uuid,uuid)',
    'public.handle_new_user()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;

-- ============================================================
-- AUDIT + ACTIVITY
-- ============================================================
CREATE TABLE public.audit_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  org_unit_id uuid,
  actor_id uuid,
  table_name text NOT NULL,
  row_id text,
  action text NOT NULL,
  diff jsonb,
  ip inet,
  user_agent text,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_tenant_ts_idx ON public.audit_logs(tenant_id, ts DESC);
CREATE INDEX audit_logs_actor_ts_idx ON public.audit_logs(actor_id, ts DESC);
CREATE INDEX audit_logs_table_row_idx ON public.audit_logs(table_name, row_id);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_super_read" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'audit:read', org_unit_id));

CREATE TABLE public.activity_logs (
  id bigserial PRIMARY KEY,
  tenant_id uuid,
  org_unit_id uuid,
  actor_id uuid,
  verb text NOT NULL,
  object_type text,
  object_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_actor_ts_idx ON public.activity_logs(actor_id, ts DESC);
CREATE INDEX activity_logs_tenant_ts_idx ON public.activity_logs(tenant_id, ts DESC);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_self_read" ON public.activity_logs FOR SELECT TO authenticated
  USING (actor_id = auth.uid()
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'audit:read', org_unit_id));
CREATE POLICY "activity_self_write" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Generic audit trigger (attach per table in later migrations)
CREATE OR REPLACE FUNCTION public.tc_audit_row()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_diff jsonb;
  v_row_id text;
  v_tenant uuid;
  v_org uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_diff := jsonb_build_object('old', to_jsonb(OLD));
    v_row_id := (to_jsonb(OLD)->>'id');
    v_tenant := NULLIF(to_jsonb(OLD)->>'tenant_id','')::uuid;
    v_org := NULLIF(to_jsonb(OLD)->>'org_unit_id','')::uuid;
  ELSIF TG_OP = 'UPDATE' THEN
    v_diff := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    v_row_id := (to_jsonb(NEW)->>'id');
    v_tenant := NULLIF(to_jsonb(NEW)->>'tenant_id','')::uuid;
    v_org := NULLIF(to_jsonb(NEW)->>'org_unit_id','')::uuid;
  ELSE
    v_diff := jsonb_build_object('new', to_jsonb(NEW));
    v_row_id := (to_jsonb(NEW)->>'id');
    v_tenant := NULLIF(to_jsonb(NEW)->>'tenant_id','')::uuid;
    v_org := NULLIF(to_jsonb(NEW)->>'org_unit_id','')::uuid;
  END IF;

  INSERT INTO public.audit_logs (tenant_id, org_unit_id, actor_id, table_name, row_id, action, diff)
  VALUES (v_tenant, v_org, auth.uid(), TG_TABLE_NAME, v_row_id, TG_OP, v_diff);
  RETURN COALESCE(NEW, OLD);
END $$;
REVOKE ALL ON FUNCTION public.tc_audit_row() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tc_audit_row() TO authenticated, service_role;

-- Attach audit trigger to foundation tables
CREATE TRIGGER audit_tenants AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();
CREATE TRIGGER audit_org_units AFTER INSERT OR UPDATE OR DELETE ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();
CREATE TRIGGER audit_role_permissions AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.tc_audit_row();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_url text,
  severity text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_ts_idx ON public.notifications(user_id, ts DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own_read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notif_own_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_own_delete" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  kind text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (user_id, channel, kind)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_prefs TO authenticated;
GRANT ALL ON public.notification_prefs TO service_role;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_prefs_own" ON public.notification_prefs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============================================================
-- FILES
-- ============================================================
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  kind text,
  mime text,
  size_bytes bigint,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, path)
);
CREATE INDEX files_uploader_idx ON public.files(uploaded_by);
CREATE INDEX files_tenant_idx ON public.files(tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "files_own_read" ON public.files FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid()
      OR public.is_super_admin(auth.uid())
      OR public.has_permission(auth.uid(), 'files:read', org_unit_id));
CREATE POLICY "files_own_write" ON public.files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "files_own_update" ON public.files FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_permission(auth.uid(), 'files:write', org_unit_id))
  WITH CHECK (uploaded_by = auth.uid() OR public.has_permission(auth.uid(), 'files:write', org_unit_id));
CREATE POLICY "files_own_delete" ON public.files FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.has_permission(auth.uid(), 'files:write', org_unit_id));

-- ============================================================
-- SESSIONS + IP + DEVICE LOGS
-- ============================================================
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip inet,
  user_agent text,
  device text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON public.sessions(user_id);
GRANT SELECT ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own" ON public.sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE public.ip_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ip inet,
  geo jsonb,
  event text,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ip_logs_user_ts_idx ON public.ip_logs(user_id, ts DESC);
GRANT SELECT ON public.ip_logs TO authenticated;
GRANT ALL ON public.ip_logs TO service_role;
ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ip_logs_own" ON public.ip_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE public.device_logs (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text,
  os text,
  app text,
  push_token text,
  ts timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_logs_user_idx ON public.device_logs(user_id);
GRANT SELECT ON public.device_logs TO authenticated;
GRANT ALL ON public.device_logs TO service_role;
ALTER TABLE public.device_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_logs_own" ON public.device_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- ============================================================
-- FEATURE FLAGS
-- ============================================================
CREATE TABLE public.feature_flags (
  key text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  rollout jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, tenant_id)
);
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff_read" ON public.feature_flags FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "ff_super_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
