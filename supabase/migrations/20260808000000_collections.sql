-- ============ COLLECTIONS ============
-- Admin-authored groupings of published artworks, curated entirely by
-- click-toggling artworks in/out via collection_artworks (no typing needed
-- beyond the initial title/description/cover).

CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections are public" ON public.collections
  FOR SELECT USING (true);

CREATE POLICY "Admins insert collections" ON public.collections
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update collections" ON public.collections
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete collections" ON public.collections
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_collections_updated_at BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ COLLECTION ARTWORKS (join table) ============
-- One row per artwork-in-collection. Toggling in the admin grid is a single
-- insert (add) or delete (remove) scoped to one (collection_id, artwork_id)
-- pair, so the client only ever needs to patch that one collection's state.

CREATE TABLE public.collection_artworks (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, artwork_id)
);

GRANT SELECT ON public.collection_artworks TO anon, authenticated;
GRANT INSERT, DELETE ON public.collection_artworks TO authenticated;
GRANT ALL ON public.collection_artworks TO service_role;

ALTER TABLE public.collection_artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection artworks are public" ON public.collection_artworks
  FOR SELECT USING (true);

CREATE POLICY "Admins add collection artworks" ON public.collection_artworks
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove collection artworks" ON public.collection_artworks
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
