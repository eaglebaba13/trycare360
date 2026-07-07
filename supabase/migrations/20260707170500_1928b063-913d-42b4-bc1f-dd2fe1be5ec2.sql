
-- ============================================================
-- PHASE 1 FOUNDATION: Identity, Multi-Tenancy, RBAC
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS ltree;

-- Shared updated_at trigger
CREATE OR REPLACE FUNCTION public.tc_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.org_unit_type AS ENUM (
    'platform','corporate','state_master','city_franchise',
    'express_center','advanced_center','department'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tenant_status AS ENUM ('active','suspended','trial','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- TENANTS ----------
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  plan text,
  status public.tenant_status NOT NULL DEFAULT 'trial',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- ---------- ORG UNITS ----------
CREATE TABLE public.org_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  type public.org_unit_type NOT NULL,
  name text NOT NULL,
  code text,
  path ltree,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE INDEX org_units_tenant_idx ON public.org_units(tenant_id);
CREATE INDEX org_units_parent_idx ON public.org_units(parent_id);
CREATE INDEX org_units_path_gist ON public.org_units USING GIST (path);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_units TO authenticated;
GRANT ALL ON public.org_units TO service_role;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_org_units_updated BEFORE UPDATE ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- Auto-maintain ltree path from parent
CREATE OR REPLACE FUNCTION public.tc_org_units_set_path()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE parent_path ltree;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := text2ltree(replace(NEW.id::text, '-', '_'));
  ELSE
    SELECT path INTO parent_path FROM public.org_units WHERE id = NEW.parent_id;
    IF parent_path IS NULL THEN
      RAISE EXCEPTION 'parent org_unit % has no path', NEW.parent_id;
    END IF;
    NEW.path := parent_path || text2ltree(replace(NEW.id::text, '-', '_'));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_org_units_path BEFORE INSERT OR UPDATE OF parent_id ON public.org_units
  FOR EACH ROW EXECUTE FUNCTION public.tc_org_units_set_path();

-- ---------- PROFILES ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  gender text,
  dob date,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  active_tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  active_org_unit_id uuid REFERENCES public.org_units(id) ON DELETE SET NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tc_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- ROLES ----------
CREATE TABLE public.roles (
  code text PRIMARY KEY,
  name text NOT NULL,
  level int NOT NULL DEFAULT 0,
  description text,
  is_customer_facing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- ---------- PERMISSIONS ----------
CREATE TABLE public.permissions (
  code text PRIMARY KEY,
  resource text NOT NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- ---------- ROLE_PERMISSIONS ----------
CREATE TABLE public.role_permissions (
  role_code text NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ---------- USER_ROLES ----------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES public.roles(code) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  org_unit_id uuid REFERENCES public.org_units(id) ON DELETE CASCADE,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_code, org_unit_id)
);
CREATE INDEX user_roles_user_idx ON public.user_roles(user_id);
CREATE INDEX user_roles_tenant_idx ON public.user_roles(tenant_id);
CREATE INDEX user_roles_org_idx ON public.user_roles(org_unit_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------- TENANT FEATURES ----------
CREATE TABLE public.tenant_features (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, feature_key)
);
GRANT SELECT ON public.tenant_features TO authenticated;
GRANT ALL ON public.tenant_features TO service_role;
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECURITY DEFINER HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role_code = 'super_admin'
      AND (valid_to IS NULL OR valid_to > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT active_tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_role_at(_user_id uuid, _role text, _org_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.org_units target ON target.id = _org_unit_id
    LEFT JOIN public.org_units ancestor ON ancestor.id = ur.org_unit_id
    WHERE ur.user_id = _user_id
      AND ur.role_code = _role
      AND (ur.valid_to IS NULL OR ur.valid_to > now())
      AND (
        _org_unit_id IS NULL
        OR ur.org_unit_id IS NULL
        OR ur.org_unit_id = _org_unit_id
        OR (ancestor.path IS NOT NULL AND target.path IS NOT NULL AND target.path <@ ancestor.path)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text, _org_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_code = ur.role_code
    LEFT JOIN public.org_units target ON target.id = _org_unit_id
    LEFT JOIN public.org_units ancestor ON ancestor.id = ur.org_unit_id
    WHERE ur.user_id = _user_id
      AND rp.permission_code = _permission
      AND (ur.valid_to IS NULL OR ur.valid_to > now())
      AND (
        _org_unit_id IS NULL
        OR ur.org_unit_id IS NULL
        OR ur.org_unit_id = _org_unit_id
        OR (ancestor.path IS NOT NULL AND target.path IS NOT NULL AND target.path <@ ancestor.path)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_access(_user_id uuid, _org_unit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.org_units target ON target.id = _org_unit_id
        LEFT JOIN public.org_units ancestor ON ancestor.id = ur.org_unit_id
        WHERE ur.user_id = _user_id
          AND (ur.valid_to IS NULL OR ur.valid_to > now())
          AND (
            ur.org_unit_id = _org_unit_id
            OR (ancestor.path IS NOT NULL AND target.path IS NOT NULL AND target.path <@ ancestor.path)
          )
      );
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id uuid, _tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id
                 AND (valid_to IS NULL OR valid_to > now()));
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles: own row, super admin all
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- tenants
CREATE POLICY "tenants_access_select" ON public.tenants FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), id));
CREATE POLICY "tenants_super_all" ON public.tenants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- org_units
CREATE POLICY "org_units_access_select" ON public.org_units FOR SELECT TO authenticated
  USING (public.has_org_access(auth.uid(), id));
CREATE POLICY "org_units_super_all" ON public.org_units FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- roles / permissions / role_permissions : readable to all authenticated
CREATE POLICY "roles_read" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_super_write" ON public.roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "permissions_read" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_super_write" ON public.permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "role_permissions_read" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_super_write" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- user_roles
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'user_roles:read', org_unit_id));
CREATE POLICY "user_roles_super_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'user_roles:write', org_unit_id))
  WITH CHECK (public.is_super_admin(auth.uid())
         OR public.has_permission(auth.uid(), 'user_roles:write', org_unit_id));

-- tenant_features
CREATE POLICY "tenant_features_read" ON public.tenant_features FOR SELECT TO authenticated
  USING (public.has_tenant_access(auth.uid(), tenant_id));
CREATE POLICY "tenant_features_super_write" ON public.tenant_features FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================================
-- SEED ROLES
-- ============================================================
INSERT INTO public.roles (code, name, level, is_customer_facing, description) VALUES
  ('super_admin','Super Admin',100,false,'Platform owner'),
  ('corporate_admin','Corporate Admin',90,false,'Corporate HQ admin'),
  ('master_franchise','Master Franchise',80,false,'State master franchise owner'),
  ('franchise_owner','Franchise Owner',70,false,'City franchise owner'),
  ('center_manager','Center Manager',60,false,'Center-level manager'),
  ('doctor','Doctor',55,false,'Licensed medical practitioner'),
  ('hair_consultant','Hair Consultant',50,false,'Hair specialist'),
  ('skin_consultant','Skin Consultant',50,false,'Skin specialist'),
  ('nutritionist','Nutritionist',50,false,'Nutrition specialist'),
  ('therapist','Therapist',45,false,'Treatment therapist'),
  ('telecaller','Telecaller',40,false,'Lead follow-up agent'),
  ('sales_executive','Sales Executive',40,false,'Sales agent'),
  ('marketing','Marketing',45,false,'Marketing team member'),
  ('accounts','Accounts',50,false,'Finance and accounts'),
  ('hr','HR',50,false,'Human resources'),
  ('inventory_manager','Inventory Manager',50,false,'Inventory operations'),
  ('purchase_manager','Purchase Manager',50,false,'Purchase operations'),
  ('vendor','Vendor',30,false,'External supplier via vendor portal'),
  ('academy_trainer','Academy Trainer',45,false,'Trainer in academy'),
  ('student','Student',20,false,'Academy student'),
  ('customer','Customer',10,true,'End customer')
ON CONFLICT (code) DO NOTHING;

-- Starter permissions catalog (foundation only; module perms added per phase)
INSERT INTO public.permissions (code, resource, action, description) VALUES
  ('tenants:read','tenants','read','View tenants'),
  ('tenants:write','tenants','write','Create/update tenants'),
  ('org_units:read','org_units','read','View org units'),
  ('org_units:write','org_units','write','Create/update org units'),
  ('user_roles:read','user_roles','read','View role assignments'),
  ('user_roles:write','user_roles','write','Grant/revoke roles'),
  ('audit:read','audit','read','View audit logs'),
  ('notifications:read','notifications','read','View notifications'),
  ('files:read','files','read','View files'),
  ('files:write','files','write','Upload/delete files')
ON CONFLICT (code) DO NOTHING;
