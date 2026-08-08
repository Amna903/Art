
-- Public read for both buckets so <img src> works without signed URLs
CREATE POLICY "Artworks public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'artworks');
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Owner-only writes (file path must start with the user's uid)
CREATE POLICY "Artist uploads own artwork" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artworks' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Artist updates own artwork" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'artworks' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Artist deletes own artwork" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'artworks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "User uploads own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "User updates own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "User deletes own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
