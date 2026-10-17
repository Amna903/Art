-- ============ CONTENT TRANSLATIONS ============
-- The site is served in English, French, Portuguese, Spanish and Italian.
-- The existing text columns (title, bio, description, content, …) stay the
-- English source of truth. Each table gets one `translations` column holding
-- the other languages, keyed by language then field:
--
--   { "fr": { "title": "…", "description": "…" },
--     "pt": { "title": "…" } }
--
-- A missing language or field falls back to the English column, so rows
-- created before this migration keep rendering exactly as they did. Only
-- fr / pt / es / it keys are accepted, each holding an object of strings.

CREATE FUNCTION public.is_valid_translations(t JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_typeof(t) = 'object'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_each(t) AS lang(key, value)
      WHERE lang.key NOT IN ('fr', 'pt', 'es', 'it')
         OR jsonb_typeof(lang.value) <> 'object'
         OR EXISTS (
           SELECT 1 FROM jsonb_each(lang.value) AS field(key, value)
           WHERE jsonb_typeof(field.value) <> 'string'
         )
    );
$$;

-- Artwork title + description (the work's story).
ALTER TABLE public.artworks
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT artworks_translations_valid CHECK (public.is_valid_translations(translations));

-- Self-service artist bio.
ALTER TABLE public.profiles
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT profiles_translations_valid CHECK (public.is_valid_translations(translations));

-- Admin-managed artist bio.
ALTER TABLE public.managed_artists
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT managed_artists_translations_valid CHECK (public.is_valid_translations(translations));

-- Journal stories: title, excerpt, content.
ALTER TABLE public.journal_posts
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT journal_posts_translations_valid CHECK (public.is_valid_translations(translations));

-- Exhibitions: title, description, location, date_label.
ALTER TABLE public.exhibitions
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT exhibitions_translations_valid CHECK (public.is_valid_translations(translations));

-- Collections: title, description.
ALTER TABLE public.collections
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT collections_translations_valid CHECK (public.is_valid_translations(translations));

-- Inline-edited page copy: { "pt": { "value": "…", "alt_text": "…" } }.
ALTER TABLE public.page_blocks
  ADD COLUMN translations JSONB NOT NULL DEFAULT '{}'::jsonb
  CONSTRAINT page_blocks_translations_valid CHECK (public.is_valid_translations(translations));
