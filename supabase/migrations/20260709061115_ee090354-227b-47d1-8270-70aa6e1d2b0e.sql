
REVOKE EXECUTE ON FUNCTION public.persons_sync_search() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.person_addresses_sync_primary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.person_contacts_sync_primary() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.person_verifications_rollup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.person_relationships_reciprocal() FROM PUBLIC, anon, authenticated;
