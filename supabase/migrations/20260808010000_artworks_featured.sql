-- Lets admins click-toggle which published artworks appear in the homepage
-- "Collector Picks" section, same one-click curation as collection_artworks.
-- No new RLS needed: the existing "Artists update own artworks" policy
-- already lets admins update any artwork row.

ALTER TABLE public.artworks ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;
