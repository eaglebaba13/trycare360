
REVOKE EXECUTE ON FUNCTION public.can_read_pharmacy(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write_pharmacy(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_dispense_controlled(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_approve_purchase(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_pharmacy(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_write_pharmacy(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_dispense_controlled(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_approve_purchase(uuid, uuid) TO authenticated, service_role;
