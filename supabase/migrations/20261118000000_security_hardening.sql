-- ============ SECURITY HARDENING (correction plan P0.3) ============
--
-- 1. Anyone with the public API key (logged out, or any signed-up account)
--    could read every column of published artworks, including price_usd
--    (the site shows "Price Upon Request") and the internal originality /
--    plagiarism data. Row-level security only limits which ROWS are visible,
--    so the fix is column grants: anon and authenticated may read only the
--    public columns. The private columns are served by
--    artwork_private_fields(), which returns them only for the caller's own
--    artworks, or for any artwork when the caller is an admin.
--    Server code (service_role) is unaffected.
--    Writes are unaffected: UPDATE/INSERT privileges are separate from SELECT.

REVOKE SELECT ON public.artworks FROM anon, authenticated;

GRANT SELECT (
  id,
  slug,
  title,
  description,
  year,
  medium,
  dimensions,
  country,
  image_url,
  thumb_base,
  status,
  artist_id,
  managed_artist_id,
  translations,
  reference_number,
  created_at,
  updated_at
) ON public.artworks TO anon, authenticated;

-- Private columns for the artist who owns the work, or an admin.
-- p_ids: limit to these artworks (NULL = every artwork the caller may see).
-- p_originality: limit to these originality statuses (NULL = any).
CREATE OR REPLACE FUNCTION public.artwork_private_fields(
  p_ids uuid[] DEFAULT NULL,
  p_originality text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  price_usd numeric,
  originality_status text,
  originality_score double precision,
  originality_report jsonb,
  originality_checked_at timestamptz,
  image_phash text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id,
         a.price_usd::numeric,
         a.originality_status::text,
         a.originality_score::double precision,
         a.originality_report::jsonb,
         a.originality_checked_at,
         a.image_phash::text
  FROM public.artworks a
  WHERE auth.uid() IS NOT NULL
    AND (a.artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND (p_ids IS NULL OR a.id = ANY (p_ids))
    AND (p_originality IS NULL OR a.originality_status::text = ANY (p_originality));
$$;

REVOKE ALL ON FUNCTION public.artwork_private_fields(uuid[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.artwork_private_fields(uuid[], text[]) TO authenticated;

-- 2. Reviews (P1.7): posting already requires sign-in (live check: a guest
--    insert is rejected by RLS). Admins had no way to remove a review; allow it.

GRANT DELETE ON public.reviews TO authenticated;

DROP POLICY IF EXISTS "Admins delete reviews" ON public.reviews;
CREATE POLICY "Admins delete reviews" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
