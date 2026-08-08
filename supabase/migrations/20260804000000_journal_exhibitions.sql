-- ============ JOURNAL POSTS ============
-- Admin-authored content: no draft/publish gate — hitting "Publish" in the
-- admin UI is the insert itself, and the row is public immediately.

CREATE TABLE public.journal_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Curator Notes',
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  read_minutes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.journal_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.journal_posts TO authenticated;
GRANT ALL ON public.journal_posts TO service_role;

ALTER TABLE public.journal_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journal posts are public" ON public.journal_posts
  FOR SELECT USING (true);

CREATE POLICY "Admins manage journal posts" ON public.journal_posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update journal posts" ON public.journal_posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete journal posts" ON public.journal_posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_journal_posts_updated_at BEFORE UPDATE ON public.journal_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ EXHIBITIONS ============

CREATE TYPE public.exhibition_status AS ENUM ('upcoming', 'current', 'past');

CREATE TABLE public.exhibitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT NOT NULL DEFAULT '',
  location TEXT,
  date_label TEXT,
  status public.exhibition_status NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.exhibitions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exhibitions TO authenticated;
GRANT ALL ON public.exhibitions TO service_role;

ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exhibitions are public" ON public.exhibitions
  FOR SELECT USING (true);

CREATE POLICY "Admins insert exhibitions" ON public.exhibitions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update exhibitions" ON public.exhibitions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete exhibitions" ON public.exhibitions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_exhibitions_updated_at BEFORE UPDATE ON public.exhibitions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
