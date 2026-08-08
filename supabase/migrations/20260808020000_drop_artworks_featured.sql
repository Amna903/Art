-- Superseded: Collector Picks is no longer a manual admin toggle — it's
-- now auto-ranked by enquiry ("Request Price") volume via
-- public.get_top_requested_artwork_slugs(), see the next migration.

ALTER TABLE public.artworks DROP COLUMN is_featured;
