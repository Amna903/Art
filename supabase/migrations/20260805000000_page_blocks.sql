-- ============ PAGE BLOCKS ============
-- Backs inline, on-page editing for the static parts of /journal and
-- /exhibitions (headline, paragraphs, images, captions). Each editable
-- spot on the page reads one row here by (page, block_key); when no row
-- exists yet, the page falls back to its original hardcoded copy, so the
-- page renders identically before any admin has edited anything.

CREATE TABLE public.page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  block_key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  alt_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page, block_key)
);

GRANT SELECT ON public.page_blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;

ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Page blocks are public" ON public.page_blocks
  FOR SELECT USING (true);

CREATE POLICY "Admins insert page blocks" ON public.page_blocks
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update page blocks" ON public.page_blocks
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete page blocks" ON public.page_blocks
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_page_blocks_updated_at BEFORE UPDATE ON public.page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
