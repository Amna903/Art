-- Allow artists to save blocked submissions (set by the originality check),
-- while still preventing them from publishing themselves.
DROP POLICY IF EXISTS "Artists submit own country-matched artworks" ON public.artworks;
DROP POLICY IF EXISTS "Artists edit submissions admins publish" ON public.artworks;

CREATE POLICY "Artists submit own country-matched artworks" ON public.artworks
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR (
      artist_id = auth.uid() AND public.has_role(auth.uid(), 'artist')
      AND status IN ('draft', 'pending_review', 'blocked')
      AND public.artwork_matches_artist_country(auth.uid(), country)
    )
  );

CREATE POLICY "Artists edit submissions admins publish" ON public.artworks
  FOR UPDATE TO authenticated USING (artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR (
      artist_id = auth.uid() AND public.has_role(auth.uid(), 'artist')
      AND status IN ('draft', 'pending_review', 'blocked')
      AND public.artwork_matches_artist_country(auth.uid(), country)
    )
  );
