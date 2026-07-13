
REVOKE ALL ON FUNCTION public.can_read_patient_portal(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_patient_portal(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_family(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_wallet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_membership(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_read_patient_portal(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_patient_portal(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_family(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_wallet(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_membership(uuid) TO authenticated, service_role;
