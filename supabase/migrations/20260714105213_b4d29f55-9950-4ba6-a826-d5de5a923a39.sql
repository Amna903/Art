
CREATE POLICY "country_sounds public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'country-sounds');

CREATE POLICY "country_sounds admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'country-sounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "country_sounds admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'country-sounds' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'country-sounds' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "country_sounds admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'country-sounds' AND public.has_role(auth.uid(), 'admin'));
