-- Originality control: perceptual hash + match verdict on each artwork.
-- Enum value must commit before policies/status checks can reference it.
ALTER TYPE public.artwork_status ADD VALUE IF NOT EXISTS 'blocked' AFTER 'pending_review';

DO $$ BEGIN
  CREATE TYPE public.originality_status AS ENUM ('unchecked', 'clear', 'review', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS image_phash TEXT,
  ADD COLUMN IF NOT EXISTS originality_status public.originality_status NOT NULL DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS originality_score REAL,
  ADD COLUMN IF NOT EXISTS originality_report JSONB,
  ADD COLUMN IF NOT EXISTS originality_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS artworks_image_phash_idx ON public.artworks (image_phash)
  WHERE image_phash IS NOT NULL;

CREATE INDEX IF NOT EXISTS artworks_originality_status_idx ON public.artworks (originality_status)
  WHERE originality_status IN ('review', 'blocked');
