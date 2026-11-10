-- ============ VIRTUAL GALLERY ROOMS ============
-- The gallery lobby needs, per country, how many works it has (to split it
-- into rooms of 24) and a cover image — without loading the works.
-- covers = the two newest images, so the lobby can avoid showing the same
-- picture on the Featured card and on that country's card.
CREATE OR REPLACE FUNCTION public.published_country_rooms()
RETURNS TABLE (country text, works bigint, covers text[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT effective_country,
         count(*),
         (array_agg(image_url ORDER BY created_at DESC, id DESC))[1:2]
  FROM public.published_artworks
  GROUP BY effective_country;
$$;

GRANT EXECUTE ON FUNCTION public.published_country_rooms() TO anon, authenticated;
