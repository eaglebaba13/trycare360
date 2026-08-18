-- 1. Storage: remove unrestricted public insert on assessment-photos
DROP POLICY IF EXISTS "assessment_photos_public_insert" ON storage.objects;

-- 2. CMS appointment requests: no direct client inserts (server-side only)
DROP POLICY IF EXISTS "cms_appt_anon_insert" ON public.cms_appointment_requests;
DROP POLICY IF EXISTS "cms_appt_auth_insert" ON public.cms_appointment_requests;
REVOKE INSERT ON public.cms_appointment_requests FROM anon;
GRANT ALL ON public.cms_appointment_requests TO service_role;

-- 3. SECURITY DEFINER exposure
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;

-- Anonymous consultation routines are invoked only by the trusted server route
REVOKE ALL ON FUNCTION public.assessment_start_public(text, text, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.assessment_save_public(text, jsonb, integer, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.assessment_submit_public(text, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.assessment_result_public(text) FROM authenticated;