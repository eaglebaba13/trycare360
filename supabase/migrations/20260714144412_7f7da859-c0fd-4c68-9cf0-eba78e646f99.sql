
-- ============================================================
-- STEALTH SUPER ADMIN MODE
-- ============================================================

-- Target-identity helper: is THIS user a super admin?
CREATE OR REPLACE FUNCTION public.is_super_admin_target(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _target_user_id
      AND role_code = 'super_admin'
      AND (valid_to IS NULL OR valid_to > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin_target(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin_target(uuid) TO authenticated, service_role;

-- Viewer-side helper: can the caller reveal Super Admin identity?
-- Default rule: ONLY authenticated Super Admins may unmask.
CREATE OR REPLACE FUNCTION public.can_reveal_super_admin(_viewer uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_viewer);
$$;

REVOKE EXECUTE ON FUNCTION public.can_reveal_super_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_reveal_super_admin(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Stealth RLS policies (SELECT-restricting; do NOT delete data)
-- Each policy is additive: existing self-read policies still apply
-- to the caller's OWN rows. These add a second layer blocking any
-- SELECT of a Super Admin row by a non-Super viewer.
-- ------------------------------------------------------------

-- profiles: hide Super Admin profiles
DROP POLICY IF EXISTS profiles_stealth_super ON public.profiles;
CREATE POLICY profiles_stealth_super ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR NOT public.is_super_admin_target(id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- user_roles: hide role assignments tied to Super Admin users AND hide the row where role_code='super_admin'
DROP POLICY IF EXISTS user_roles_stealth_super ON public.user_roles;
CREATE POLICY user_roles_stealth_super ON public.user_roles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (role_code <> 'super_admin' AND NOT public.is_super_admin_target(user_id))
    OR public.can_reveal_super_admin(auth.uid())
  );

-- role_history: hide history rows involving super_admin or a Super Admin identity
DROP POLICY IF EXISTS role_history_stealth_super ON public.role_history;
CREATE POLICY role_history_stealth_super ON public.role_history
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (role_code <> 'super_admin'
      AND NOT public.is_super_admin_target(user_id)
      AND (performed_by IS NULL OR NOT public.is_super_admin_target(performed_by)))
    OR public.can_reveal_super_admin(auth.uid())
  );

-- sessions: hide Super Admin sessions
DROP POLICY IF EXISTS sessions_stealth_super ON public.sessions;
CREATE POLICY sessions_stealth_super ON public.sessions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR NOT public.is_super_admin_target(user_id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- ip_logs: hide Super Admin login IPs
DROP POLICY IF EXISTS ip_logs_stealth_super ON public.ip_logs;
CREATE POLICY ip_logs_stealth_super ON public.ip_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR NOT public.is_super_admin_target(user_id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- device_logs: hide Super Admin device rows
DROP POLICY IF EXISTS device_logs_stealth_super ON public.device_logs;
CREATE POLICY device_logs_stealth_super ON public.device_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR NOT public.is_super_admin_target(user_id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- activity_logs: hide rows where actor is a Super Admin
DROP POLICY IF EXISTS activity_logs_stealth_super ON public.activity_logs;
CREATE POLICY activity_logs_stealth_super ON public.activity_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    actor_id IS NULL
    OR actor_id = auth.uid()
    OR NOT public.is_super_admin_target(actor_id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- audit_logs: hide rows where actor is a Super Admin (rows remain on disk)
DROP POLICY IF EXISTS audit_logs_stealth_super ON public.audit_logs;
CREATE POLICY audit_logs_stealth_super ON public.audit_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    actor_id IS NULL
    OR actor_id = auth.uid()
    OR NOT public.is_super_admin_target(actor_id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- notifications: don't leak notifications addressed to Super Admin
DROP POLICY IF EXISTS notifications_stealth_super ON public.notifications;
CREATE POLICY notifications_stealth_super ON public.notifications
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR NOT public.is_super_admin_target(user_id)
    OR public.can_reveal_super_admin(auth.uid())
  );

-- role_permissions: hide super_admin permission grants from non-Super callers
DROP POLICY IF EXISTS role_permissions_stealth_super ON public.role_permissions;
CREATE POLICY role_permissions_stealth_super ON public.role_permissions
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    role_code <> 'super_admin'
    OR public.can_reveal_super_admin(auth.uid())
  );

-- roles master: hide the super_admin role row itself from non-Super callers
DROP POLICY IF EXISTS roles_stealth_super ON public.roles;
CREATE POLICY roles_stealth_super ON public.roles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    code <> 'super_admin'
    OR public.can_reveal_super_admin(auth.uid())
  );
