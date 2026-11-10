-- ============ ARTWORK LISTINGS AT SCALE ============
-- Pages must never load every artwork. This adds:
--   * indexes for the columns listings filter and sort on;
--   * public.published_artworks: one row per published work with its artist
--     already joined (one request per page instead of three, and no long
--     ".in(id, …)" URLs) plus the artist's effective country;
--   * count/summary functions so totals never require loading rows.

-- ---------- Thumbnails ----------
-- Pre-generated list images (lib/images/thumbnails.ts), so lists never use
-- Vercel's per-image optimizer quota. thumb_base is a public URL prefix;
-- the files are <thumb_base>/640.webp and <thumb_base>/1280.webp.
ALTER TABLE public.artworks ADD COLUMN IF NOT EXISTS thumb_base text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-thumbs', 'artwork-thumbs', true)
ON CONFLICT (id) DO NOTHING;
-- Public read; only the server (service role, which bypasses RLS) writes.
DROP POLICY IF EXISTS "artwork-thumbs public read" ON storage.objects;
CREATE POLICY "artwork-thumbs public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'artwork-thumbs');

-- ---------- Indexes ----------
-- Newest-first listings of published works (homepage, gallery, search).
CREATE INDEX IF NOT EXISTS artworks_published_created_idx
  ON public.artworks (created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS artworks_status_created_idx ON public.artworks (status, created_at DESC);
CREATE INDEX IF NOT EXISTS artworks_artist_id_idx ON public.artworks (artist_id);
-- (artworks_managed_artist_id_idx already exists.)
CREATE INDEX IF NOT EXISTS artworks_country_idx ON public.artworks (country);
CREATE INDEX IF NOT EXISTS managed_artists_country_idx ON public.managed_artists (country);
CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles (country);

-- Substring search ("ilike '%…%'") on titles and artist names.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS artworks_title_trgm_idx
  ON public.artworks USING gin (title extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS managed_artists_name_trgm_idx
  ON public.managed_artists USING gin (display_name extensions.gin_trgm_ops);

-- ---------- View ----------
-- security_invoker: the caller's RLS still applies to every joined table.
-- effective_country / artist_slug / artist_display_name mirror the rules in
-- lib/data/supabase-artists.ts (managed artist first, then the account
-- profile, then the artwork's own country).
-- Dropped first so the file can be re-run after an earlier version created
-- the view with different columns. A view stores no data.
DROP VIEW IF EXISTS public.published_artworks;
CREATE VIEW public.published_artworks
WITH (security_invoker = true) AS
SELECT
  a.id,
  a.slug,
  a.title,
  a.medium,
  a.year,
  a.country,
  a.description,
  a.dimensions,
  a.image_url,
  a.thumb_base,
  a.artist_id,
  a.managed_artist_id,
  a.translations,
  a.created_at,
  CASE WHEN a.managed_artist_id IS NOT NULL THEN COALESCE(ma.country, a.country)
       ELSE COALESCE(p.country, a.country) END AS effective_country,
  CASE WHEN a.managed_artist_id IS NOT NULL THEN ma.slug ELSE a.artist_id::text END AS artist_slug,
  CASE WHEN a.managed_artist_id IS NOT NULL THEN ma.display_name ELSE p.display_name END AS artist_display_name,
  -- Artist details, so a page needs no second request.
  ma.slug AS ma_slug,
  ma.display_name AS ma_display_name,
  ma.bio AS ma_bio,
  ma.country AS ma_country,
  ma.city AS ma_city,
  ma.technique AS ma_technique,
  ma.avatar_url AS ma_avatar_url,
  ma.translations AS ma_translations,
  p.display_name AS p_display_name,
  p.bio AS p_bio,
  p.country AS p_country,
  p.avatar_url AS p_avatar_url,
  p.translations AS p_translations
FROM public.artworks a
LEFT JOIN public.managed_artists ma ON ma.id = a.managed_artist_id
LEFT JOIN public.profiles p ON p.id = a.artist_id AND a.managed_artist_id IS NULL
WHERE a.status = 'published';

GRANT SELECT ON public.published_artworks TO anon, authenticated;

-- ---------- Counts ----------
-- Published works per (raw) country value; the app maps names to slugs.
CREATE OR REPLACE FUNCTION public.published_artwork_country_counts()
RETURNS TABLE (country text, works bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT effective_country, count(*) FROM public.published_artworks GROUP BY effective_country;
$$;

-- One row per artist with published works: their newest work (as JSON, the
-- same columns as the view), how many works they have and their mediums.
CREATE OR REPLACE FUNCTION public.published_artist_summaries()
RETURNS TABLE (newest jsonb, works bigint, mediums text[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH g AS (
    SELECT artist_slug,
           count(*) AS works,
           COALESCE(array_agg(DISTINCT btrim(medium)) FILTER (WHERE NULLIF(btrim(medium), '') IS NOT NULL), '{}') AS mediums
    FROM public.published_artworks
    GROUP BY artist_slug
  ),
  n AS (
    SELECT DISTINCT ON (artist_slug) *
    FROM public.published_artworks
    ORDER BY artist_slug, created_at DESC
  )
  SELECT to_jsonb(n), g.works, g.mediums
  FROM n JOIN g USING (artist_slug)
  ORDER BY n.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.published_artwork_country_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.published_artist_summaries() TO anon, authenticated;

-- ---------- Originality check ----------
-- Near-duplicate lookup done in the database: returns only artworks whose
-- 64-bit average hash is within max_distance bits of the target, instead of
-- the upload route loading every artwork's hash.
CREATE OR REPLACE FUNCTION public.similar_artworks_by_phash(target text, max_distance integer, exclude_id uuid DEFAULT NULL)
RETURNS TABLE (id uuid, title text, slug text, image_url text, distance integer)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT a.id, a.title, a.slug, a.image_url, d.distance
  FROM public.artworks a
  CROSS JOIN LATERAL (
    SELECT bit_count(('x' || a.image_phash)::bit(64) # ('x' || lower(target))::bit(64))::integer AS distance
  ) d
  WHERE a.image_phash ~ '^[0-9a-f]{16}$'
    AND (exclude_id IS NULL OR a.id <> exclude_id)
    AND d.distance <= max_distance
  ORDER BY d.distance;
$$;

REVOKE ALL ON FUNCTION public.similar_artworks_by_phash(text, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.similar_artworks_by_phash(text, integer, uuid) TO service_role;
