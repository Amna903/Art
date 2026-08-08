-- Lets a journal post opt into showing up on a country's /discover page
-- ("Stories from {country}"), the same one-field association artworks
-- already have. NULL = not country-specific (unchanged existing behavior).

ALTER TABLE public.journal_posts ADD COLUMN country TEXT;
