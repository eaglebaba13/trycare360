
REVOKE ALL ON FUNCTION public.fin_next_sequence(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fin_next_sequence(uuid, text) TO authenticated, service_role;
