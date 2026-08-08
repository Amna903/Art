-- ============ SAVED ARTWORKS (wishlist) ============
-- Keyed by artwork_slug (not a FK to public.artworks) because artwork detail
-- pages resolve content from three sources — Sanity CMS, the self-service
-- public.artworks table, and static fixture data (see resolveArtwork() in
-- app/artworks/[slug]/page.tsx) — most of which have no row in
-- public.artworks. Same pattern as public.enquiries.

CREATE TABLE public.saved_artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_slug TEXT NOT NULL,
  artwork_title TEXT NOT NULL,
  artist_name TEXT,
  artwork_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, artwork_slug)
);

GRANT SELECT, INSERT, DELETE ON public.saved_artworks TO authenticated;
GRANT ALL ON public.saved_artworks TO service_role;

ALTER TABLE public.saved_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved artworks" ON public.saved_artworks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
