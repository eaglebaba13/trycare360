
CREATE POLICY "clinical-media read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'clinical-media'
  AND public.can_read_clinical(auth.uid(), (split_part(name, '/', 1))::uuid)
);
CREATE POLICY "clinical-media write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinical-media'
  AND public.can_write_clinical(auth.uid(), (split_part(name, '/', 1))::uuid)
);
CREATE POLICY "clinical-media update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'clinical-media'
  AND public.can_write_clinical(auth.uid(), (split_part(name, '/', 1))::uuid)
);
CREATE POLICY "clinical-media delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'clinical-media'
  AND public.can_write_clinical(auth.uid(), (split_part(name, '/', 1))::uuid)
);
