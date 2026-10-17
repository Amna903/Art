-- ============ SITE VISITS ============
-- "Visits worldwide" on the homepage stats panel replaces "Collectors
-- worldwide" until the collector figure is large enough to show (client
-- direction). The site counts one visit per browser session.

CREATE TABLE public.site_stats (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_stats (key, value) VALUES ('visits', 0)
ON CONFLICT (key) DO NOTHING;

GRANT SELECT ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site stats are public" ON public.site_stats
  FOR SELECT USING (true);
-- No insert/update policies: the counter only moves through the function below.

CREATE FUNCTION public.record_site_visit()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.site_stats
    SET value = value + 1, updated_at = now()
    WHERE key = 'visits'
    RETURNING value;
$$;

REVOKE ALL ON FUNCTION public.record_site_visit() FROM public;
GRANT EXECUTE ON FUNCTION public.record_site_visit() TO anon, authenticated;
