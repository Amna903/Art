-- ============ REVIEWS ============
-- Collector reviews on artwork detail pages. Keyed by artwork_slug for the
-- same reason as public.saved_artworks — content spans Sanity, the
-- self-service artworks table, and static fixtures, none of which share a
-- single UUID space.

CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_artwork_slug_idx ON public.reviews (artwork_slug, created_at DESC);

-- Reviews are public read (shown to logged-out visitors), but only
-- authenticated users can post one, and only as themselves.
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON public.reviews
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can post their own review" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
