-- Admin-represented artists: vanity slug + public directory fields,
-- and artworks can belong to a managed artist (no login account required).

ALTER TABLE public.managed_artists
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS technique TEXT;

-- Backfill slugs for any rows created before this migration.
UPDATE public.managed_artists
SET slug = lower(regexp_replace(regexp_replace(trim(display_name), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
    || '-' || substr(replace(id::text, '-', ''), 1, 6)
WHERE slug IS NULL OR trim(slug) = '';

ALTER TABLE public.managed_artists
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS managed_artists_slug_uidx ON public.managed_artists (slug);

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS managed_artist_id UUID REFERENCES public.managed_artists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS artworks_managed_artist_id_idx ON public.artworks (managed_artist_id);

-- Admins may insert/publish artworks on behalf of represented (managed) artists.
-- artist_id stays the admin's auth user (required by existing FKs / order_items);
-- managed_artist_id carries the public attribution.
DROP POLICY IF EXISTS "Artists submit own country-matched artworks" ON public.artworks;
CREATE POLICY "Artists submit own country-matched artworks" ON public.artworks
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR (
      artist_id = auth.uid() AND public.has_role(auth.uid(), 'artist')
      AND status IN ('draft', 'pending_review')
      AND public.artwork_matches_artist_country(auth.uid(), country)
    )
  );

DROP POLICY IF EXISTS "Artists edit submissions admins publish" ON public.artworks;
CREATE POLICY "Artists edit submissions admins publish" ON public.artworks
  FOR UPDATE TO authenticated USING (artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR (
      artist_id = auth.uid() AND public.has_role(auth.uid(), 'artist')
      AND status IN ('draft', 'pending_review')
      AND public.artwork_matches_artist_country(auth.uid(), country)
    )
  );
