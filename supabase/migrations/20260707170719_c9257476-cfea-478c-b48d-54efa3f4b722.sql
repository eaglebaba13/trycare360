
-- Storage policies: users manage files under their own user-id folder
DO $$ BEGIN
  DROP POLICY IF EXISTS "tc_own_read" ON storage.objects;
  DROP POLICY IF EXISTS "tc_own_write" ON storage.objects;
  DROP POLICY IF EXISTS "tc_own_update" ON storage.objects;
  DROP POLICY IF EXISTS "tc_own_delete" ON storage.objects;
END $$;

CREATE POLICY "tc_own_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id IN ('avatars','documents','clinical','media')
  AND (auth.uid()::text = (storage.foldername(name))[1])
);
CREATE POLICY "tc_own_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id IN ('avatars','documents','clinical','media')
  AND (auth.uid()::text = (storage.foldername(name))[1])
);
CREATE POLICY "tc_own_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id IN ('avatars','documents','clinical','media')
  AND (auth.uid()::text = (storage.foldername(name))[1])
);
CREATE POLICY "tc_own_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id IN ('avatars','documents','clinical','media')
  AND (auth.uid()::text = (storage.foldername(name))[1])
);
