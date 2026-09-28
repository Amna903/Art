-- Store country from the sign-up metadata, rather than relying on an optional
-- profile edit after an artist has started uploading work.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_name TEXT;
  v_country TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  v_country := NULLIF(trim(NEW.raw_user_meta_data->>'country'), '');
  v_role := CASE WHEN NEW.raw_user_meta_data->>'role' = 'artist' THEN 'artist'::public.app_role ELSE 'client'::public.app_role END;
  INSERT INTO public.profiles (id, display_name, country) VALUES (NEW.id, v_name, v_country) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.artwork_matches_artist_country(p_artist UUID, p_country TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(lower(trim(p.country)), '') IS NOT NULL
     AND lower(trim(p.country)) = lower(trim(COALESCE(p_country, '')))
  FROM public.profiles p WHERE p.id = p_artist;
$$;

DROP POLICY IF EXISTS "Artists insert own artworks" ON public.artworks;
DROP POLICY IF EXISTS "Artists update own artworks" ON public.artworks;
CREATE POLICY "Artists submit own country-matched artworks" ON public.artworks
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR (
      artist_id = auth.uid() AND public.has_role(auth.uid(), 'artist')
      AND status IN ('draft', 'pending_review')
      AND public.artwork_matches_artist_country(auth.uid(), country)
    )
  );
CREATE POLICY "Artists edit submissions admins publish" ON public.artworks
  FOR UPDATE TO authenticated USING (artist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR (
      artist_id = auth.uid() AND public.has_role(auth.uid(), 'artist')
      AND status IN ('draft', 'pending_review')
      AND public.artwork_matches_artist_country(auth.uid(), country)
    )
  );

-- Profiles for artists represented by the gallery but without login accounts.
CREATE TABLE IF NOT EXISTS public.managed_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  bio TEXT,
  country TEXT NOT NULL,
  avatar_url TEXT,
  managed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.managed_artists TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.managed_artists TO authenticated;
ALTER TABLE public.managed_artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managed artists are public" ON public.managed_artists FOR SELECT USING (true);
CREATE POLICY "Admins manage represented artists" ON public.managed_artists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER set_managed_artists_updated_at BEFORE UPDATE ON public.managed_artists
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- A client may see their own request in their dashboard and can pay only a
-- quote that belongs to them.  Admins retain full inbox access.
CREATE POLICY "Clients read own enquiries" ON public.enquiries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS checkout_order_id UUID REFERENCES public.orders(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT UNIQUE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS enquiry_id UUID UNIQUE REFERENCES public.enquiries(id);

-- Keep seeded/editorial content aligned with the public brand rename.
UPDATE public.journal_posts SET title = replace(title, 'NU-ART', 'NUA-ARTE'), content = replace(content, 'NU-ART', 'NUA-ARTE');

