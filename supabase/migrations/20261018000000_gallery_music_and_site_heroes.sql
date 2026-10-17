-- ============ GALLERY MUSIC + SITE HEROES ============
-- Change brief of 9 Oct 2026, sections 3 and 7.
--
-- gallery_tracks: the playlist of full-length tracks the single, app-wide
-- music player plays through (and loops) during the guided tour and the
-- virtual gallery. Files live in the public `gallery-music` bucket.
--
-- site_heroes: hero images an admin can replace without a deploy, one active
-- image per page (home, virtual-gallery, exhibitions, about, country:<slug>).
-- Files live in the public `heroes` bucket.
--
-- Room titles for the gallery ("room_title") are stored as page_blocks rows
-- (page 'virtual-gallery', block_key 'room_title_1'…'room_title_4'), so they
-- are editable and translatable like every other inline text.

-- ---------- gallery_tracks ----------
CREATE TABLE public.gallery_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  country_slug TEXT,
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_tracks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_tracks TO authenticated;
GRANT ALL ON public.gallery_tracks TO service_role;

ALTER TABLE public.gallery_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gallery tracks are public" ON public.gallery_tracks
  FOR SELECT USING (true);
CREATE POLICY "Admins insert gallery tracks" ON public.gallery_tracks
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update gallery tracks" ON public.gallery_tracks
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete gallery tracks" ON public.gallery_tracks
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_gallery_tracks_updated_at BEFORE UPDATE ON public.gallery_tracks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-music', 'gallery-music', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "gallery-music public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'gallery-music');
CREATE POLICY "gallery-music admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery-music' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gallery-music admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'gallery-music' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'gallery-music' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "gallery-music admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'gallery-music' AND public.has_role(auth.uid(), 'admin'));

-- ---------- site_heroes ----------
CREATE TABLE public.site_heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  image_desktop TEXT NOT NULL,
  image_mobile TEXT,
  alt_text TEXT NOT NULL DEFAULT '',
  credit TEXT,
  -- CSS object-position, e.g. "50% 40%"; used to crop the desktop image on
  -- phones when there is no mobile image.
  focal_point TEXT NOT NULL DEFAULT '50% 50%',
  active BOOLEAN NOT NULL DEFAULT false,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_heroes_translations_valid CHECK (public.is_valid_translations(translations))
);

-- At most one active hero per page.
CREATE UNIQUE INDEX site_heroes_one_active_per_page ON public.site_heroes (page) WHERE active;

GRANT SELECT ON public.site_heroes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_heroes TO authenticated;
GRANT ALL ON public.site_heroes TO service_role;

ALTER TABLE public.site_heroes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site heroes are public" ON public.site_heroes
  FOR SELECT USING (true);
CREATE POLICY "Admins insert site heroes" ON public.site_heroes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update site heroes" ON public.site_heroes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete site heroes" ON public.site_heroes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_site_heroes_updated_at BEFORE UPDATE ON public.site_heroes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('heroes', 'heroes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "heroes public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'heroes');
CREATE POLICY "heroes admin insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'heroes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "heroes admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'heroes' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'heroes' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "heroes admin delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'heroes' AND public.has_role(auth.uid(), 'admin'));
