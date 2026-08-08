-- Homepage "Collector Picks" are decided by the code, not an admin click:
-- the artworks with the most "Request Price" enquiries are the most
-- sought-after. `enquiries` is admin-only (it holds names/emails/messages),
-- so this SECURITY DEFINER function exposes nothing but a slug + a count —
-- safe to call from the public homepage.

CREATE FUNCTION public.get_top_requested_artwork_slugs(limit_count INT DEFAULT 6)
RETURNS TABLE (artwork_slug TEXT, request_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT artwork_slug, COUNT(*) AS request_count
  FROM public.enquiries
  GROUP BY artwork_slug
  ORDER BY request_count DESC, MAX(created_at) DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_requested_artwork_slugs(INT) TO anon, authenticated;
