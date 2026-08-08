-- Public read so <img src> works without signed URLs; admin-only writes,
-- same shape as the journal/exhibitions bucket policies.

CREATE POLICY "collections bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'collections');
CREATE POLICY "collections bucket admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'collections' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "collections bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'collections' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'collections' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "collections bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'collections' AND public.has_role(auth.uid(), 'admin'));
