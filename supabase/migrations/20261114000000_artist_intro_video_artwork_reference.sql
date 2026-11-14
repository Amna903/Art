-- Artist profile: a short intro shown beside the portrait (separate from the
-- full narrative bio) and an optional studio video link. The video button is
-- only shown when video_url is set.
ALTER TABLE public.managed_artists
  ADD COLUMN IF NOT EXISTS intro text,
  ADD COLUMN IF NOT EXISTS video_url text;

-- Admin-assigned artwork reference number (e.g. NA-C1-001), shown on the
-- artwork page and on its certificate of authenticity.
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS reference_number text;

CREATE UNIQUE INDEX IF NOT EXISTS artworks_reference_number_key
  ON public.artworks (upper(reference_number))
  WHERE reference_number IS NOT NULL;
