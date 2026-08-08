
CREATE TABLE IF NOT EXISTS public.country_sounds (
  country_slug TEXT PRIMARY KEY,
  title TEXT,
  audio_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.country_sounds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.country_sounds TO authenticated;
GRANT ALL ON public.country_sounds TO service_role;

ALTER TABLE public.country_sounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "country_sounds are public readable"
  ON public.country_sounds FOR SELECT
  USING (true);

CREATE POLICY "admins can insert country_sounds"
  ON public.country_sounds FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can update country_sounds"
  ON public.country_sounds FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can delete country_sounds"
  ON public.country_sounds FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER country_sounds_set_updated_at
  BEFORE UPDATE ON public.country_sounds
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
