-- 1. Role expiry checks
CREATE OR REPLACE FUNCTION public.has_any_role_code(_tenant_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND role_code = ANY(_roles)
      AND (valid_to IS NULL OR valid_to > now())
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = _tenant_id
      AND (valid_to IS NULL OR valid_to > now())
  );
$function$;

-- 2. Tenant-scope reward catalog reads
DROP POLICY IF EXISTS patient_rewards_read ON public.patient_rewards;
CREATE POLICY patient_rewards_read ON public.patient_rewards
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (tenant_id IS NOT NULL AND public.has_tenant_access(auth.uid(), tenant_id))
);

-- 3. Tighten always-true INSERT policies on public appointment requests
DROP POLICY IF EXISTS cms_appt_anon_insert ON public.cms_appointment_requests;
DROP POLICY IF EXISTS cms_appt_auth_insert ON public.cms_appointment_requests;
CREATE POLICY cms_appt_anon_insert ON public.cms_appointment_requests
FOR INSERT TO anon
WITH CHECK (
  status = 'new'::cms_appointment_status
  AND EXISTS (SELECT 1 FROM public.cms_sites s WHERE s.tenant_id = cms_appointment_requests.tenant_id AND s.is_active)
);
CREATE POLICY cms_appt_auth_insert ON public.cms_appointment_requests
FOR INSERT TO authenticated
WITH CHECK (
  status = 'new'::cms_appointment_status
  AND EXISTS (SELECT 1 FROM public.cms_sites s WHERE s.tenant_id = cms_appointment_requests.tenant_id AND s.is_active)
);

-- 4. Revoke EXECUTE on SECURITY DEFINER functions from anon (except intentional public assessment endpoints)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname, p.prorettype
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.proname NOT IN ('assessment_result_public','assessment_save_public','assessment_start_public','assessment_submit_public') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig);
    END IF;
    -- trigger functions are never called directly by clients
    IF r.prorettype = 'trigger'::regtype THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', r.sig);
    END IF;
  END LOOP;
END $$;