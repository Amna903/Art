-- Gallery admins upload media for represented artists under managed/<artist-id>/.
-- Those paths intentionally do not start with the admin's auth UID, so the
-- owner-only policies for self-service artist uploads do not apply.
CREATE POLICY "Admins upload managed artist avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update managed artist avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete managed artist avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins upload managed artist artworks"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artworks'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update managed artist artworks"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artworks'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'artworks'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete managed artist artworks"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'artworks'
    AND public.has_role(auth.uid(), 'admin')
  );
