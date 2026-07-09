CREATE POLICY "assessment_photos_public_insert" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'assessment-photos');
CREATE POLICY "assessment_photos_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assessment-photos' AND (
    public.has_role_at(auth.uid(),'super_admin',NULL) OR public.has_role_at(auth.uid(),'admin',NULL)
    OR public.has_role_at(auth.uid(),'doctor',NULL) OR public.has_role_at(auth.uid(),'hair_consultant',NULL)
    OR public.has_role_at(auth.uid(),'skin_consultant',NULL) OR public.has_role_at(auth.uid(),'nutritionist',NULL)
    OR public.has_role_at(auth.uid(),'telecaller',NULL) OR public.has_role_at(auth.uid(),'center_manager',NULL)
  ));