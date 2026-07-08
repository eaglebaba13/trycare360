-- Phase 1.5d — Enterprise Workflow & Automation Engine
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('forms:read','forms','read','View form definitions and submissions'),
  ('forms:write','forms','write','Create and edit form definitions'),
  ('forms:submit','forms','submit','Submit responses to forms'),
  ('workflows:read','workflows','read','View workflow definitions and runs'),
  ('workflows:write','workflows','write','Create and edit workflow definitions'),
  ('workflows:run','workflows','run','Manually trigger workflows and retry runs'),
  ('rules:manage','rules','manage','Manage the rule engine'),
  ('approvals:read','approvals','read','View approval requests'),
  ('approvals:manage','approvals','manage','Manage approval flow definitions'),
  ('approvals:act','approvals','act','Approve or reject approval requests'),
  ('tasks:read','tasks','read','View tasks assigned to me or my team'),
  ('tasks:write','tasks','write','Create, edit and complete tasks'),
  ('sla:manage','sla','manage','Manage SLA policies'),
  ('templates:manage','templates','manage','Manage messaging and document templates'),
  ('notifications:manage','notifications','manage','Manage notification rules'),
  ('automation:admin','automation','admin','Full access to the automation engine')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p.code FROM public.permissions p
CROSS JOIN (VALUES ('super_admin'),('corporate_admin')) AS roles(r)
WHERE p.code IN ('forms:read','forms:write','forms:submit','workflows:read','workflows:write','workflows:run','rules:manage','approvals:read','approvals:manage','approvals:act','tasks:read','tasks:write','sla:manage','templates:manage','notifications:manage','automation:admin')
ON CONFLICT (role_code, permission_code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
SELECT r, p.code FROM public.permissions p
CROSS JOIN (VALUES ('center_manager'),('doctor'),('hair_consultant'),('skin_consultant'),('nutritionist'),('therapist'),('telecaller'),('sales_executive'),('marketing'),('accounts'),('hr'),('inventory_manager'),('purchase_manager')) AS roles(r)
WHERE p.code IN ('forms:submit','tasks:read','tasks:write','approvals:act')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- Forms
CREATE TABLE public.form_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  module TEXT, entity TEXT, description TEXT,
  version INT NOT NULL DEFAULT 1,
  schema JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_definitions TO authenticated;
GRANT ALL ON public.form_definitions TO service_role;
ALTER TABLE public.form_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forms_read" ON public.form_definitions FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "forms_write" ON public.form_definitions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'forms:write', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'forms:write', NULL));
CREATE TRIGGER trg_form_def_upd BEFORE UPDATE ON public.form_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_form_def_act BEFORE INSERT OR UPDATE ON public.form_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES public.form_definitions(id) ON DELETE CASCADE,
  entity_ref JSONB, data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_form_sub_form ON public.form_submissions(form_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_submissions TO authenticated;
GRANT ALL ON public.form_submissions TO service_role;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "form_sub_read" ON public.form_submissions FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "form_sub_write" ON public.form_submissions FOR ALL TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'forms:submit', NULL))) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id) AND (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'forms:submit', NULL)));
CREATE TRIGGER trg_form_sub_upd BEFORE UPDATE ON public.form_submissions FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- Rule Sets
CREATE TABLE public.rule_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
  definition JSONB NOT NULL DEFAULT '{"op":"AND","conditions":[]}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rule_sets TO authenticated;
GRANT ALL ON public.rule_sets TO service_role;
ALTER TABLE public.rule_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_read" ON public.rule_sets FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "rules_write" ON public.rule_sets FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'rules:manage', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'rules:manage', NULL));
CREATE TRIGGER trg_rules_upd BEFORE UPDATE ON public.rule_sets FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_rules_act BEFORE INSERT OR UPDATE ON public.rule_sets FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- Workflows
CREATE TABLE public.workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  module TEXT, description TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code, version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_definitions TO authenticated;
GRANT ALL ON public.workflow_definitions TO service_role;
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_def_read" ON public.workflow_definitions FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "wf_def_write" ON public.workflow_definitions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:write', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:write', NULL));
CREATE TRIGGER trg_wf_def_upd BEFORE UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_wf_def_act BEFORE INSERT OR UPDATE ON public.workflow_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  entity_ref JSONB, context JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_node_id TEXT, triggered_by UUID, trigger_source TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ, error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_runs_status ON public.workflow_runs(tenant_id, status, started_at DESC);
CREATE INDEX idx_wf_runs_wf ON public.workflow_runs(workflow_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_run_read" ON public.workflow_runs FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "wf_run_write" ON public.workflow_runs FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:run', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:run', NULL));
CREATE TRIGGER trg_wf_run_upd BEFORE UPDATE ON public.workflow_runs FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

CREATE TABLE public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL, node_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input JSONB, output JSONB, error TEXT,
  wait_until TIMESTAMPTZ, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wf_step_run ON public.workflow_steps(run_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_steps TO authenticated;
GRANT ALL ON public.workflow_steps TO service_role;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wf_step_read" ON public.workflow_steps FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.workflow_runs r WHERE r.id = run_id AND public.has_tenant_access(auth.uid(), r.tenant_id)));
CREATE POLICY "wf_step_write" ON public.workflow_steps FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:run', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:run', NULL));

-- Triggers
CREATE TABLE public.automation_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, event_type TEXT,
  event_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_cron TEXT,
  workflow_id UUID REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fired_at TIMESTAMPTZ,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX idx_trig_event ON public.automation_triggers(event_type) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_triggers TO authenticated;
GRANT ALL ON public.automation_triggers TO service_role;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trig_read" ON public.automation_triggers FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "trig_write" ON public.automation_triggers FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:write', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'workflows:write', NULL));
CREATE TRIGGER trg_trig_upd BEFORE UPDATE ON public.automation_triggers FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_trig_act BEFORE INSERT OR UPDATE ON public.automation_triggers FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- Approvals
CREATE TABLE public.approval_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  module TEXT, entity TEXT, description TEXT,
  levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_definitions TO authenticated;
GRANT ALL ON public.approval_definitions TO service_role;
ALTER TABLE public.approval_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apdef_read" ON public.approval_definitions FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "apdef_write" ON public.approval_definitions FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'approvals:manage', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'approvals:manage', NULL));
CREATE TRIGGER trg_apdef_upd BEFORE UPDATE ON public.approval_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_apdef_act BEFORE INSERT OR UPDATE ON public.approval_definitions FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  definition_id UUID NOT NULL REFERENCES public.approval_definitions(id) ON DELETE CASCADE,
  entity_ref JSONB, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  current_level INT NOT NULL DEFAULT 1,
  submitted_by UUID, decided_at TIMESTAMPTZ, reason TEXT, timeout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ap_req_status ON public.approval_requests(tenant_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_requests TO authenticated;
GRANT ALL ON public.approval_requests TO service_role;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apreq_read" ON public.approval_requests FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "apreq_write" ON public.approval_requests FOR ALL TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER trg_apreq_upd BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

CREATE TABLE public.approval_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  level INT NOT NULL, actor_id UUID, action TEXT NOT NULL,
  comment TEXT, meta JSONB,
  acted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ap_act_req ON public.approval_actions(request_id, acted_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_actions TO authenticated;
GRANT ALL ON public.approval_actions TO service_role;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apact_read" ON public.approval_actions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = request_id AND public.has_tenant_access(auth.uid(), r.tenant_id)));
CREATE POLICY "apact_write" ON public.approval_actions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.approval_requests r WHERE r.id = request_id AND public.has_tenant_access(auth.uid(), r.tenant_id)));

-- Tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, entity_ref JSONB,
  assignee_id UUID REFERENCES auth.users(id),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  org_unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ, reminder_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  recurrence JSONB, source TEXT, source_ref JSONB,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_assignee ON public.tasks(tenant_id, assignee_id, status);
CREATE INDEX idx_tasks_due ON public.tasks(tenant_id, due_at) WHERE status IN ('open','in_progress');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_read" ON public.tasks FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "task_write" ON public.tasks FOR ALL TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id)) WITH CHECK (public.has_tenant_access(auth.uid(), tenant_id));
CREATE TRIGGER trg_task_upd BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_task_act BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID, body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_com_read" ON public.task_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_tenant_access(auth.uid(), t.tenant_id)));
CREATE POLICY "task_com_ins" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_tenant_access(auth.uid(), t.tenant_id)));

-- SLA
CREATE TABLE public.sla_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL,
  module TEXT, entity TEXT,
  response_minutes INT, resolution_minutes INT,
  business_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation JSONB NOT NULL DEFAULT '[]'::jsonb,
  breach_notify JSONB NOT NULL DEFAULT '{}'::jsonb,
  applies_when JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_policies TO authenticated;
GRANT ALL ON public.sla_policies TO service_role;
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sla_read" ON public.sla_policies FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "sla_write" ON public.sla_policies FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'sla:manage', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'sla:manage', NULL));
CREATE TRIGGER trg_sla_upd BEFORE UPDATE ON public.sla_policies FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_sla_act BEFORE INSERT OR UPDATE ON public.sla_policies FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.sla_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.sla_policies(id) ON DELETE CASCADE,
  entity_ref JSONB NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_due_at TIMESTAMPTZ, resolution_due_at TIMESTAMPTZ,
  response_met_at TIMESTAMPTZ, resolution_met_at TIMESTAMPTZ,
  breach_type TEXT, escalated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sla_ev_status ON public.sla_events(tenant_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sla_events TO authenticated;
GRANT ALL ON public.sla_events TO service_role;
ALTER TABLE public.sla_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sla_ev_read" ON public.sla_events FOR SELECT TO authenticated USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "sla_ev_write" ON public.sla_events FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'sla:manage', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'sla:manage', NULL));

-- Templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
  subject TEXT, body TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider_template_id TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code, type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpl_read" ON public.templates FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "tpl_write" ON public.templates FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'templates:manage', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'templates:manage', NULL));
CREATE TRIGGER trg_tpl_upd BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_tpl_act BEFORE INSERT OR UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- Notification rules
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, event_type TEXT NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  channels TEXT[] NOT NULL DEFAULT '{}',
  template_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID, updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX idx_nrules_event ON public.notification_rules(event_type) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_rules TO authenticated;
GRANT ALL ON public.notification_rules TO service_role;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nrules_read" ON public.notification_rules FOR SELECT TO authenticated USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "nrules_write" ON public.notification_rules FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'notifications:manage', NULL)) WITH CHECK (public.is_super_admin(auth.uid()) OR public.has_permission(auth.uid(), 'notifications:manage', NULL));
CREATE TRIGGER trg_nrules_upd BEFORE UPDATE ON public.notification_rules FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_nrules_act BEFORE INSERT OR UPDATE ON public.notification_rules FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

-- Master seed
INSERT INTO public.master_types (code, name, description, supports_hierarchy, is_system, display_order) VALUES
  ('form_field_types','Form Field Types','Field kinds available to the form builder',false,true,200),
  ('workflow_node_types','Workflow Node Types','Available node kinds for the workflow builder',false,true,210),
  ('action_types','Automation Actions','Available actions that workflow/trigger steps can invoke',false,true,220),
  ('event_types','Automation Events','Domain events that can trigger automation',false,true,230),
  ('task_priorities','Task Priorities','Priority levels for tasks',false,true,240),
  ('template_types','Template Types','Kinds of templates supported',false,true,250)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.masters (tenant_id, type_code, code, name, display_order, is_active, meta) VALUES
  (NULL,'form_field_types','text','Single line text',10,true,'{}'::jsonb),
  (NULL,'form_field_types','textarea','Multi-line text',20,true,'{}'::jsonb),
  (NULL,'form_field_types','number','Number',30,true,'{}'::jsonb),
  (NULL,'form_field_types','decimal','Decimal',40,true,'{}'::jsonb),
  (NULL,'form_field_types','email','Email',50,true,'{}'::jsonb),
  (NULL,'form_field_types','phone','Phone',60,true,'{}'::jsonb),
  (NULL,'form_field_types','date','Date',70,true,'{}'::jsonb),
  (NULL,'form_field_types','datetime','Date & time',80,true,'{}'::jsonb),
  (NULL,'form_field_types','select','Dropdown',90,true,'{}'::jsonb),
  (NULL,'form_field_types','multiselect','Multi-select',100,true,'{}'::jsonb),
  (NULL,'form_field_types','radio','Radio group',110,true,'{}'::jsonb),
  (NULL,'form_field_types','checkbox','Checkbox',120,true,'{}'::jsonb),
  (NULL,'form_field_types','file','File upload',130,true,'{}'::jsonb),
  (NULL,'form_field_types','image','Image upload',140,true,'{}'::jsonb),
  (NULL,'form_field_types','signature','Signature pad',150,true,'{}'::jsonb),
  (NULL,'form_field_types','richtext','Rich text',160,true,'{}'::jsonb),
  (NULL,'form_field_types','qr','QR field',170,true,'{}'::jsonb),
  (NULL,'form_field_types','barcode','Barcode field',180,true,'{}'::jsonb),
  (NULL,'form_field_types','lookup','Lookup (master)',190,true,'{}'::jsonb),
  (NULL,'form_field_types','address','Address',200,true,'{}'::jsonb),
  (NULL,'workflow_node_types','start','Start',10,true,'{}'::jsonb),
  (NULL,'workflow_node_types','assign','Assign user',20,true,'{}'::jsonb),
  (NULL,'workflow_node_types','wait','Wait / delay',30,true,'{}'::jsonb),
  (NULL,'workflow_node_types','condition','If / else condition',40,true,'{}'::jsonb),
  (NULL,'workflow_node_types','action','Action',50,true,'{}'::jsonb),
  (NULL,'workflow_node_types','approval','Approval',60,true,'{}'::jsonb),
  (NULL,'workflow_node_types','parallel','Parallel branch',70,true,'{}'::jsonb),
  (NULL,'workflow_node_types','loop','Loop over list',80,true,'{}'::jsonb),
  (NULL,'workflow_node_types','end','End',90,true,'{}'::jsonb),
  (NULL,'action_types','create_record','Create record',10,true,'{}'::jsonb),
  (NULL,'action_types','update_record','Update record',20,true,'{}'::jsonb),
  (NULL,'action_types','delete_record','Delete record',30,true,'{}'::jsonb),
  (NULL,'action_types','assign_user','Assign to user',40,true,'{}'::jsonb),
  (NULL,'action_types','assign_department','Assign to department',50,true,'{}'::jsonb),
  (NULL,'action_types','assign_role','Assign to role',60,true,'{}'::jsonb),
  (NULL,'action_types','send_email','Send email',70,true,'{}'::jsonb),
  (NULL,'action_types','send_whatsapp','Send WhatsApp',80,true,'{}'::jsonb),
  (NULL,'action_types','send_sms','Send SMS',90,true,'{}'::jsonb),
  (NULL,'action_types','send_push','Send push notification',100,true,'{}'::jsonb),
  (NULL,'action_types','create_notification','Create in-app notification',110,true,'{}'::jsonb),
  (NULL,'action_types','call_api','Call external API',120,true,'{}'::jsonb),
  (NULL,'action_types','execute_integration','Execute integration action',130,true,'{}'::jsonb),
  (NULL,'action_types','create_invoice','Create invoice',140,true,'{}'::jsonb),
  (NULL,'action_types','create_appointment','Create appointment',150,true,'{}'::jsonb),
  (NULL,'action_types','create_task','Create task',160,true,'{}'::jsonb),
  (NULL,'action_types','update_stage','Update stage / status',170,true,'{}'::jsonb),
  (NULL,'event_types','lead.created','Lead created',10,true,'{"module":"crm"}'::jsonb),
  (NULL,'event_types','lead.stage_changed','Lead stage changed',20,true,'{"module":"crm"}'::jsonb),
  (NULL,'event_types','appointment.created','Appointment created',30,true,'{"module":"clinical"}'::jsonb),
  (NULL,'event_types','appointment.completed','Appointment completed',40,true,'{"module":"clinical"}'::jsonb),
  (NULL,'event_types','invoice.created','Invoice created',50,true,'{"module":"accounts"}'::jsonb),
  (NULL,'event_types','payment.received','Payment received',60,true,'{"module":"accounts"}'::jsonb),
  (NULL,'event_types','stock.low','Stock low',70,true,'{"module":"inventory"}'::jsonb),
  (NULL,'event_types','task.overdue','Task overdue',80,true,'{"module":"platform"}'::jsonb),
  (NULL,'event_types','approval.pending','Approval pending',90,true,'{"module":"platform"}'::jsonb),
  (NULL,'task_priorities','low','Low',10,true,'{"color":"#94a3b8"}'::jsonb),
  (NULL,'task_priorities','normal','Normal',20,true,'{"color":"#3b82f6"}'::jsonb),
  (NULL,'task_priorities','high','High',30,true,'{"color":"#f59e0b"}'::jsonb),
  (NULL,'task_priorities','urgent','Urgent',40,true,'{"color":"#ef4444"}'::jsonb),
  (NULL,'template_types','email','Email',10,true,'{}'::jsonb),
  (NULL,'template_types','whatsapp','WhatsApp',20,true,'{}'::jsonb),
  (NULL,'template_types','sms','SMS',30,true,'{}'::jsonb),
  (NULL,'template_types','push','Push notification',40,true,'{}'::jsonb),
  (NULL,'template_types','inapp','In-app notification',50,true,'{}'::jsonb),
  (NULL,'template_types','pdf','PDF document',60,true,'{}'::jsonb),
  (NULL,'template_types','invoice','Invoice',70,true,'{}'::jsonb),
  (NULL,'template_types','certificate','Certificate',80,true,'{}'::jsonb)
ON CONFLICT (tenant_id, type_code, code) DO NOTHING;

-- RPCs
CREATE OR REPLACE FUNCTION public.emit_automation_event(
  _tenant_id UUID, _event_type TEXT,
  _payload JSONB DEFAULT '{}'::jsonb, _entity_ref JSONB DEFAULT NULL
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fired INT := 0; trig RECORD;
BEGIN
  FOR trig IN
    SELECT t.id, t.workflow_id FROM public.automation_triggers t
    WHERE t.is_active AND t.event_type = _event_type
      AND (t.tenant_id IS NULL OR t.tenant_id = _tenant_id)
      AND t.workflow_id IS NOT NULL
  LOOP
    INSERT INTO public.workflow_runs (tenant_id, workflow_id, status, entity_ref, context, trigger_source, triggered_by)
    VALUES (_tenant_id, trig.workflow_id, 'queued', _entity_ref,
      jsonb_build_object('event', _event_type, 'payload', _payload, 'trigger_id', trig.id),
      'event', auth.uid());
    UPDATE public.automation_triggers SET last_fired_at = now() WHERE id = trig.id;
    fired := fired + 1;
  END LOOP;
  RETURN fired;
END; $$;
GRANT EXECUTE ON FUNCTION public.emit_automation_event(UUID, TEXT, JSONB, JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.start_workflow_run(
  _workflow_id UUID, _context JSONB DEFAULT '{}'::jsonb, _entity_ref JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id UUID; wf_tenant UUID;
BEGIN
  SELECT tenant_id INTO wf_tenant FROM public.workflow_definitions WHERE id = _workflow_id;
  IF wf_tenant IS NULL THEN RAISE EXCEPTION 'workflow not found'; END IF;
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_tenant_access(auth.uid(), wf_tenant)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.workflow_runs (tenant_id, workflow_id, status, entity_ref, context, trigger_source, triggered_by)
  VALUES (wf_tenant, _workflow_id, 'queued', _entity_ref, _context, 'manual', auth.uid())
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.start_workflow_run(UUID, JSONB, JSONB) TO authenticated, service_role;