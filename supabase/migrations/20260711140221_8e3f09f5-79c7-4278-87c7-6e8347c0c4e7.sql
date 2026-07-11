
-- Phase 2.4 Stage 5 — Communication Policy Engine (for reminders + comms).
CREATE TABLE public.communication_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  scope text NOT NULL DEFAULT 'tenant', -- tenant | branch | service
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  channels_order jsonb NOT NULL DEFAULT '["whatsapp","sms","email","push"]'::jsonb,
  reminder_offsets_minutes jsonb NOT NULL DEFAULT '[1440,120,30]'::jsonb,
  templates jsonb NOT NULL DEFAULT '{}'::jsonb, -- { booking_confirmation, reminder_24h, reminder_2h, arrival, followup, feedback }
  quiet_hours_start text,   -- HH:MM local branch tz
  quiet_hours_end text,
  retry_max_attempts integer NOT NULL DEFAULT 3,
  retry_backoff_minutes integer NOT NULL DEFAULT 15,
  language text NOT NULL DEFAULT 'en',
  respect_person_preferences boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_policies TO authenticated;
GRANT ALL ON public.communication_policies TO service_role;
ALTER TABLE public.communication_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY comm_policies_tenant_read ON public.communication_policies
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id());
CREATE POLICY comm_policies_admin_write ON public.communication_policies
  FOR ALL TO authenticated
  USING (
    tenant_id = public.current_tenant_id()
    AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin'])
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_any_role_code(auth.uid(), ARRAY['super_admin','tenant_admin','branch_manager','operations_admin'])
  );

CREATE INDEX idx_comm_policies_tenant ON public.communication_policies(tenant_id, is_active);
CREATE INDEX idx_comm_policies_branch ON public.communication_policies(branch_id) WHERE branch_id IS NOT NULL;
CREATE INDEX idx_comm_policies_service ON public.communication_policies(service_id) WHERE service_id IS NOT NULL;

CREATE TRIGGER comm_policies_touch
  BEFORE UPDATE ON public.communication_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
