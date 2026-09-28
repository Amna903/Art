-- This must run and commit before policies can reference the new enum value.
-- PostgreSQL rejects using a value added to an enum in the same transaction.
ALTER TYPE public.artwork_status ADD VALUE IF NOT EXISTS 'pending_review' BEFORE 'published';
