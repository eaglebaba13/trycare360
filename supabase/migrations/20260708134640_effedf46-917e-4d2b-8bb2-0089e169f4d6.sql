
-- ============ Permissions ============
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('integrations:read', 'integrations', 'read', 'View integration connections and logs'),
  ('integrations:write', 'integrations', 'write', 'Create and edit integration connections'),
  ('integrations:connect', 'integrations', 'connect', 'Connect or disconnect an integration provider'),
  ('webhooks:manage', 'webhooks', 'manage', 'Create and manage webhook endpoints'),
  ('integration_logs:read', 'integration_logs', 'read', 'View integration API and webhook logs'),
  ('api_keys:manage', 'api_keys', 'manage', 'Issue and revoke platform API keys')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p.code FROM public.permissions p
CROSS JOIN (VALUES ('super_admin'), ('corporate_admin')) AS roles(r)
WHERE p.code IN ('integrations:read','integrations:write','integrations:connect','webhooks:manage','integration_logs:read','api_keys:manage')
ON CONFLICT DO NOTHING;

-- ============ Provider catalog ============
CREATE TABLE public.integration_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  config_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  docs_url TEXT,
  icon TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_providers TO authenticated;
GRANT ALL ON public.integration_providers TO service_role;
ALTER TABLE public.integration_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in reads providers" ON public.integration_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin edits providers" ON public.integration_providers FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_ip_updated BEFORE UPDATE ON public.integration_providers
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- ============ Connections ============
CREATE TABLE public.integration_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL REFERENCES public.integration_providers(code),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credentials_ref TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  connected_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conn_tenant_provider ON public.integration_connections(tenant_id, provider_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_connections TO authenticated;
GRANT ALL ON public.integration_connections TO service_role;
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read connections" ON public.integration_connections FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Write permission edits connections" ON public.integration_connections FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'integrations:write', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'integrations:write', NULL));
CREATE TRIGGER trg_conn_updated BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_conn_actor BEFORE INSERT OR UPDATE ON public.integration_connections
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- ============ Webhooks ============
CREATE TABLE public.integration_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  url_slug TEXT NOT NULL UNIQUE,
  event_types TEXT[] NOT NULL DEFAULT '{}',
  secret_ref TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_webhooks TO authenticated;
GRANT ALL ON public.integration_webhooks TO service_role;
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read webhooks" ON public.integration_webhooks FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Manage permission edits webhooks" ON public.integration_webhooks FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'webhooks:manage', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'webhooks:manage', NULL));
CREATE TRIGGER trg_wh_updated BEFORE UPDATE ON public.integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_wh_actor BEFORE INSERT OR UPDATE ON public.integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- ============ Webhook events ============
CREATE TABLE public.integration_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_id UUID REFERENCES public.integration_webhooks(id) ON DELETE CASCADE,
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wh_ev_wh ON public.integration_webhook_events(webhook_id, created_at DESC);
GRANT SELECT ON public.integration_webhook_events TO authenticated;
GRANT ALL ON public.integration_webhook_events TO service_role;
ALTER TABLE public.integration_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read webhook events" ON public.integration_webhook_events FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));

-- ============ Jobs ============
CREATE TABLE public.integration_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  provider_code TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  result JSONB,
  idempotency_key TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, idempotency_key)
);
CREATE INDEX idx_jobs_pending ON public.integration_jobs(status, next_run_at) WHERE status IN ('pending','failed');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_jobs TO authenticated;
GRANT ALL ON public.integration_jobs TO service_role;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read jobs" ON public.integration_jobs FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Write permission edits jobs" ON public.integration_jobs FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'integrations:write', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'integrations:write', NULL));
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.integration_jobs
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- ============ API logs ============
CREATE TABLE public.integration_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  provider_code TEXT,
  endpoint TEXT,
  method TEXT,
  status_code INT,
  latency_ms INT,
  request_summary JSONB,
  response_summary JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_logs_tenant ON public.integration_api_logs(tenant_id, created_at DESC);
GRANT SELECT ON public.integration_api_logs TO authenticated;
GRANT ALL ON public.integration_api_logs TO service_role;
ALTER TABLE public.integration_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read api logs" ON public.integration_api_logs FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));

-- ============ API keys ============
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members read api keys" ON public.api_keys FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "Manage permission edits api keys" ON public.api_keys FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'api_keys:manage', NULL))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'api_keys:manage', NULL));
CREATE TRIGGER trg_apik_updated BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_apik_actor BEFORE INSERT OR UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- ============ Seed providers ============
INSERT INTO public.integration_providers (code, name, category, auth_type, docs_url, icon, description, display_order, config_schema) VALUES
  ('meta', 'Meta Business', 'marketing', 'oauth2', 'https://developers.facebook.com/docs/', 'facebook', 'Facebook Pages, Instagram, Ad Accounts, Pixel, Lead Ads', 10,
    '{"fields":[{"key":"business_id","label":"Business Manager ID","type":"text"},{"key":"page_id","label":"Default Page ID","type":"text"},{"key":"ig_account_id","label":"Instagram Account ID","type":"text"},{"key":"ad_account_id","label":"Ad Account ID","type":"text"},{"key":"pixel_id","label":"Pixel ID","type":"text"}]}'::jsonb),
  ('google', 'Google Workspace', 'productivity', 'oauth2', 'https://developers.google.com/', 'google', 'Calendar, Gmail, Drive, Analytics, Search Console, Tag Manager', 20,
    '{"fields":[{"key":"workspace_domain","label":"Workspace Domain","type":"text"},{"key":"ga_property_id","label":"GA4 Property ID","type":"text"},{"key":"gsc_site_url","label":"Search Console Site","type":"text"}]}'::jsonb),
  ('whatsapp', 'WhatsApp Business', 'messaging', 'api_key', 'https://developers.facebook.com/docs/whatsapp', 'message-circle', 'WhatsApp Business API, Templates, Interactive Messages', 30,
    '{"fields":[{"key":"phone_number_id","label":"Phone Number ID","type":"text","required":true},{"key":"waba_id","label":"WhatsApp Business Account ID","type":"text","required":true},{"key":"default_template","label":"Default Template Name","type":"text"}]}'::jsonb),
  ('razorpay', 'Razorpay', 'payments', 'api_key', 'https://razorpay.com/docs/api/', 'credit-card', 'Payment Links, Subscriptions, Refunds, Webhooks', 40,
    '{"fields":[{"key":"key_id","label":"Key ID","type":"text","required":true},{"key":"webhook_url","label":"Webhook URL (read-only)","type":"text","readonly":true}]}'::jsonb),
  ('smtp', 'SMTP Email', 'communication', 'basic', 'https://nodemailer.com/', 'mail', 'Transactional email via SMTP', 50,
    '{"fields":[{"key":"host","label":"SMTP Host","type":"text","required":true},{"key":"port","label":"Port","type":"number","required":true},{"key":"secure","label":"TLS/SSL","type":"boolean"},{"key":"from_email","label":"From Email","type":"text","required":true},{"key":"from_name","label":"From Name","type":"text"}]}'::jsonb),
  ('sms_gateway', 'SMS Gateway', 'communication', 'api_key', '', 'smartphone', 'Bulk transactional SMS', 60,
    '{"fields":[{"key":"provider","label":"Provider","type":"select","options":["msg91","twilio","gatewayapi","kaleyra"],"required":true},{"key":"sender_id","label":"Sender ID","type":"text","required":true},{"key":"template_id","label":"DLT Template ID","type":"text"}]}'::jsonb),
  ('push', 'Push Notifications', 'communication', 'api_key', 'https://firebase.google.com/docs/cloud-messaging', 'bell', 'Web and mobile push via FCM', 70,
    '{"fields":[{"key":"fcm_project_id","label":"FCM Project ID","type":"text","required":true},{"key":"vapid_public_key","label":"VAPID Public Key","type":"text"}]}'::jsonb),
  ('openai', 'AI (Lovable Gateway)', 'ai', 'api_key', 'https://docs.lovable.dev/', 'sparkles', 'Chat completions, embeddings, image analysis, OCR — routed through Lovable AI Gateway', 80,
    '{"fields":[{"key":"default_chat_model","label":"Default Chat Model","type":"text","placeholder":"google/gemini-2.5-flash"},{"key":"default_embedding_model","label":"Default Embedding Model","type":"text","placeholder":"openai/text-embedding-3-small"}]}'::jsonb),
  ('courier', 'Courier / Logistics', 'logistics', 'api_key', '', 'truck', 'Shipment booking, tracking, label generation', 90,
    '{"fields":[{"key":"provider","label":"Provider","type":"select","options":["shiprocket","delhivery","bluedart","dtdc"],"required":true},{"key":"account_id","label":"Account/Client ID","type":"text"},{"key":"pickup_pincode","label":"Default Pickup Pincode","type":"text"}]}'::jsonb)
ON CONFLICT (code) DO NOTHING;
