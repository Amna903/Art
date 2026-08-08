-- Exhibitions have a free-text "location" (e.g. "Lagos, Nigeria") that isn't
-- matched against the canonical 54-country list, so they never show up on a
-- country's /discover page the way artworks and journal posts do. This adds
-- the same one-field country association those already have, independent of
-- the free-text location. NULL = not country-specific (unchanged existing
-- behavior).

ALTER TABLE public.exhibitions ADD COLUMN country TEXT;
