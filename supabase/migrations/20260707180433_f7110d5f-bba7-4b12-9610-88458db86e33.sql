
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  kind text,
  description text,
  head_employee_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX departments_tenant_idx ON public.departments(tenant_id);
CREATE INDEX departments_org_idx ON public.departments(org_unit_id);
CREATE INDEX departments_parent_idx ON public.departments(parent_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_departments_actor BEFORE INSERT OR UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  designation text,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  reporting_manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  joined_at date,
  exited_at date,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_code)
);
CREATE INDEX employees_tenant_idx ON public.employees(tenant_id);
CREATE INDEX employees_user_idx ON public.employees(user_id);
CREATE INDEX employees_org_idx ON public.employees(org_unit_id);
CREATE INDEX employees_dept_idx ON public.employees(department_id);
CREATE INDEX employees_manager_idx ON public.employees(reporting_manager_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();
CREATE TRIGGER trg_employees_actor BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_actor_columns();

ALTER TABLE public.departments
  ADD CONSTRAINT departments_head_fk FOREIGN KEY (head_employee_id)
  REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE TABLE public.role_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role_code text NOT NULL,
  tenant_id uuid,
  org_unit_id uuid,
  action text NOT NULL,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX role_history_user_idx ON public.role_history(user_id);
CREATE INDEX role_history_time_idx ON public.role_history(performed_at DESC);
GRANT SELECT, INSERT ON public.role_history TO authenticated;
GRANT ALL ON public.role_history TO service_role;
ALTER TABLE public.role_history ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.tc_log_role_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_history(user_id, role_code, tenant_id, org_unit_id, action, performed_by)
    VALUES (NEW.user_id, NEW.role_code, NEW.tenant_id, NEW.org_unit_id, 'grant', COALESCE(NEW.granted_by, auth.uid()));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_history(user_id, role_code, tenant_id, org_unit_id, action, performed_by)
    VALUES (OLD.user_id, OLD.role_code, OLD.tenant_id, OLD.org_unit_id, 'revoke', auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_user_roles_history
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.tc_log_role_change();

CREATE OR REPLACE FUNCTION public.move_org_unit(_unit_id uuid, _new_parent_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_path ltree;
  new_parent_path ltree;
  new_path ltree;
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
          OR public.has_permission(auth.uid(), 'org_units:write', _unit_id)) THEN
    RAISE EXCEPTION 'Not authorized to move org unit';
  END IF;

  SELECT path INTO old_path FROM public.org_units WHERE id = _unit_id;
  IF old_path IS NULL THEN RAISE EXCEPTION 'Unit not found'; END IF;

  IF _new_parent_id IS NULL THEN
    new_path := text2ltree(replace(_unit_id::text, '-', '_'));
  ELSE
    SELECT path INTO new_parent_path FROM public.org_units WHERE id = _new_parent_id;
    IF new_parent_path IS NULL THEN RAISE EXCEPTION 'New parent not found'; END IF;
    IF new_parent_path <@ old_path THEN
      RAISE EXCEPTION 'Cannot move a unit under its own descendant';
    END IF;
    new_path := new_parent_path || text2ltree(replace(_unit_id::text, '-', '_'));
  END IF;

  UPDATE public.org_units
    SET path = new_path || subpath(path, nlevel(old_path)),
        parent_id = CASE WHEN id = _unit_id THEN _new_parent_id ELSE parent_id END,
        updated_at = now()
    WHERE path <@ old_path;
END $$;

CREATE POLICY "departments_tenant_select" ON public.departments FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "departments_write" ON public.departments FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'departments:write', org_unit_id))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'departments:write', org_unit_id));

CREATE POLICY "employees_tenant_select" ON public.employees FOR SELECT TO authenticated
  USING (tenant_id IS NULL OR public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "employees_write" ON public.employees FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'employees:write', org_unit_id))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'employees:write', org_unit_id));

CREATE POLICY "role_history_select" ON public.role_history FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR user_id = auth.uid()
         OR public.has_permission(auth.uid(), 'user_roles:read', org_unit_id));
CREATE POLICY "role_history_super_insert" ON public.role_history FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('departments:read','departments','read','View departments'),
  ('departments:write','departments','write','Create/update departments'),
  ('employees:read','employees','read','View employees'),
  ('employees:write','employees','write','Create/update employees'),
  ('org_units:move','org_units','move','Reparent org units'),
  ('roles:manage','roles','manage','Create/clone roles & edit permission matrix'),
  ('users:manage','users','manage','Invite/deactivate users and assign org/dept')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code)
  SELECT 'super_admin', code FROM public.permissions
  ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code) VALUES
  ('corporate_admin','org_units:read'),
  ('corporate_admin','org_units:write'),
  ('corporate_admin','org_units:move'),
  ('corporate_admin','user_roles:read'),
  ('corporate_admin','user_roles:write'),
  ('corporate_admin','departments:read'),
  ('corporate_admin','departments:write'),
  ('corporate_admin','employees:read'),
  ('corporate_admin','employees:write'),
  ('corporate_admin','users:manage'),
  ('master_franchise','org_units:read'),
  ('master_franchise','departments:read'),
  ('master_franchise','employees:read'),
  ('franchise_owner','org_units:read'),
  ('franchise_owner','departments:read'),
  ('franchise_owner','employees:read'),
  ('hr','employees:read'),
  ('hr','employees:write'),
  ('hr','departments:read')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_types (code, name, description, is_system)
VALUES ('department_kind','Department Kind','Functional department taxonomy', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.masters (tenant_id, type_code, code, name, display_order, is_active, is_system)
VALUES
  (NULL,'department_kind','hair','Hair',10,true,true),
  (NULL,'department_kind','skin','Skin',20,true,true),
  (NULL,'department_kind','nail','Nail',30,true,true),
  (NULL,'department_kind','nutrition','Nutrition',40,true,true),
  (NULL,'department_kind','doctor','Doctor',50,true,true),
  (NULL,'department_kind','accounts','Accounts',60,true,true),
  (NULL,'department_kind','hr','HR',70,true,true),
  (NULL,'department_kind','marketing','Marketing',80,true,true),
  (NULL,'department_kind','crm','CRM',90,true,true),
  (NULL,'department_kind','inventory','Inventory',100,true,true),
  (NULL,'department_kind','academy','Academy',110,true,true),
  (NULL,'department_kind','diagnostics','Diagnostics',120,true,true),
  (NULL,'department_kind','pharmacy','Pharmacy',130,true,true),
  (NULL,'department_kind','custom','Custom',999,true,true)
ON CONFLICT DO NOTHING;
