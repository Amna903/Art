-- Public read so <img src> works without signed URLs; admin-only writes,
-- same shape as the country-sounds bucket policies (admin-owned assets,
-- not per-user-owned like artworks/avatars).

CREATE POLICY "journal bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'journal');
CREATE POLICY "journal bucket admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'journal' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "journal bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'journal' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'journal' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "journal bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'journal' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "exhibitions bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exhibitions');
CREATE POLICY "exhibitions bucket admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exhibitions' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exhibitions bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'exhibitions' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'exhibitions' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "exhibitions bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'exhibitions' AND public.has_role(auth.uid(), 'admin'));
