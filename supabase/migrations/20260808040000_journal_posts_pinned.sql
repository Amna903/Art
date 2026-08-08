-- Lets an admin pick which real journal post is the "main story" shown at
-- the top of /journal, replacing the static/editable magazine block —
-- an editorial choice with no automatic signal to derive it from, so this
-- is a manual admin toggle (unlike Collector Picks, which is auto-ranked).
-- The partial unique index enforces "at most one pinned post" at the DB
-- level; the client still unsets the previous one before setting a new one.

ALTER TABLE public.journal_posts ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX journal_posts_single_pinned ON public.journal_posts ((is_pinned)) WHERE is_pinned;
