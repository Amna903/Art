-- Public read so <img src> works without signed URLs; admin-only writes,
-- same shape as the journal/exhibitions/collections bucket policies.

CREATE POLICY "home bucket public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'home');
CREATE POLICY "home bucket admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'home' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "home bucket admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'home' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'home' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "home bucket admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'home' AND public.has_role(auth.uid(), 'admin'));
