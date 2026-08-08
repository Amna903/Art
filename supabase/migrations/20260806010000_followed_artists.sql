-- ============ FOLLOWED ARTISTS ============
CREATE TABLE IF NOT EXISTS public.followed_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_slug TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_image TEXT,
  technique TEXT,
  country_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_slug)
);

GRANT SELECT, INSERT, DELETE ON public.followed_artists TO authenticated;
GRANT ALL ON public.followed_artists TO service_role;

ALTER TABLE public.followed_artists ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'followed_artists' AND policyname = 'Users manage own followed artists'
  ) THEN
    CREATE POLICY "Users manage own followed artists" ON public.followed_artists
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
