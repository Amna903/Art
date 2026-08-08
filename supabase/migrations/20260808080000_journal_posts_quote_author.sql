-- The right-rail pull quote always cited the post's category (e.g. "Artist
-- Stories") instead of a person — the hardcoded static version of the main
-- /journal story got this right ("— Kofi Mensah") only because that name was
-- baked into a page_blocks string, not stored anywhere near the quote itself.
-- This lets a post carry a real attribution; NULL keeps the old
-- category-as-cite fallback for every existing post.
ALTER TABLE public.journal_posts ADD COLUMN quote_author TEXT;

UPDATE public.journal_posts
SET quote_author = 'Kofi Mensah'
WHERE slug = 'weaving-the-archive-loom-project' AND quote_author IS NULL;

