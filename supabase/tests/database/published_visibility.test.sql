-- Unpublished artworks must never be visible through the public listing
-- view or the count/summary functions, and private data must not leak.
-- Run: supabase test db
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(14);

-- ---------- Fixtures (as postgres) ----------
SET LOCAL session_replication_role = replica; -- skip publish-time triggers
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-admin@example.test', '', now(), now()),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-artist@example.test', '', now(), now());
INSERT INTO public.profiles (id, display_name, country, bio)
VALUES ('00000000-0000-0000-0000-00000000aa02', 'PRIVATE profile name', 'Testland', 'PRIVATE bio');
INSERT INTO public.managed_artists (id, display_name, country, slug, managed_by)
VALUES ('00000000-0000-0000-0000-00000000aa03', 'Test Managed Artist', 'Testland', 'pgtap-managed', '00000000-0000-0000-0000-00000000aa01');

-- One published work per artist, plus one of every other status.
INSERT INTO public.artworks (artist_id, managed_artist_id, title, slug, country, image_url, image_phash, status) VALUES
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000aa03', 'OK managed', 'pgtap-ok-1', 'Testland', 'https://x/1.jpg', 'ffffffffffffffff', 'published'),
  ('00000000-0000-0000-0000-00000000aa02', NULL, 'OK account', 'pgtap-ok-2', 'Testland', 'https://x/2.jpg', 'ffffffffffffffff', 'published'),
  ('00000000-0000-0000-0000-00000000aa02', NULL, 'LEAK draft', 'pgtap-leak-1', 'Testland', 'https://x/3.jpg', 'ffffffffffffffff', 'draft'),
  ('00000000-0000-0000-0000-00000000aa02', NULL, 'LEAK pending', 'pgtap-leak-2', 'Testland', 'https://x/4.jpg', 'ffffffffffffffff', 'pending_review'),
  ('00000000-0000-0000-0000-00000000aa02', NULL, 'LEAK sold', 'pgtap-leak-3', 'Testland', 'https://x/5.jpg', 'ffffffffffffffff', 'sold'),
  ('00000000-0000-0000-0000-00000000aa02', NULL, 'LEAK archived', 'pgtap-leak-4', 'Testland', 'https://x/6.jpg', 'ffffffffffffffff', 'archived'),
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000aa03', 'LEAK blocked', 'pgtap-leak-5', 'Testland', 'https://x/7.jpg', 'ffffffffffffffff', 'blocked');
SET LOCAL session_replication_role = origin;

-- ---------- Definitions ----------
SELECT is(
  (SELECT bool_or(prosecdef) FROM pg_proc WHERE proname IN
    ('published_artwork_country_counts', 'published_artist_summaries', 'similar_artworks_by_phash')),
  false, 'all new functions are SECURITY INVOKER');
SELECT ok(
  (SELECT 'security_invoker=true' = ANY (reloptions) FROM pg_class WHERE relname = 'published_artworks'),
  'published_artworks view is security_invoker');

-- ---------- Anonymous visitor ----------
SET LOCAL ROLE anon;
SELECT is((SELECT count(*) FROM public.published_artworks WHERE title LIKE 'LEAK%'), 0::bigint,
  'anon: view shows no unpublished works');
SELECT is((SELECT count(*) FROM public.published_artworks WHERE title LIKE 'OK%'), 2::bigint,
  'anon: view shows the published works');
SELECT is((SELECT works FROM public.published_artwork_country_counts() WHERE country = 'Testland'), 2::bigint,
  'anon: country counts include only published works');
SELECT is((SELECT count(*) FROM public.published_artist_summaries() s WHERE s.newest->>'title' LIKE 'LEAK%'), 0::bigint,
  'anon: artist summaries never pick an unpublished work');
SELECT is((SELECT sum(works) FROM public.published_artist_summaries() s WHERE s.newest->>'country' = 'Testland'), 2::numeric,
  'anon: artist summaries count only published works');
SELECT is((SELECT count(*) FROM public.published_artworks WHERE p_display_name IS NOT NULL OR p_bio IS NOT NULL), 0::bigint,
  'anon: private profile fields are not exposed through the view');
SELECT throws_ok($$ SELECT * FROM public.similar_artworks_by_phash('ffffffffffffffff', 64) $$, '42501', NULL,
  'anon: cannot call the originality lookup (it sees all statuses)');
SELECT is((SELECT count(*) FROM public.artworks WHERE title LIKE 'LEAK%'), 0::bigint,
  'anon: base table RLS also hides unpublished works');
RESET ROLE;

-- ---------- Logged-in artist who owns the unpublished works ----------
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000aa02", "role": "authenticated"}';
SELECT is((SELECT count(*) FROM public.published_artworks WHERE title LIKE 'LEAK%'), 0::bigint,
  'owner: view still shows only published works');
SELECT is((SELECT works FROM public.published_artwork_country_counts() WHERE country = 'Testland'), 2::bigint,
  'owner: counts still include only published works');
SELECT throws_ok($$ SELECT * FROM public.similar_artworks_by_phash('ffffffffffffffff', 64) $$, '42501', NULL,
  'authenticated: cannot call the originality lookup');
RESET ROLE;

-- ---------- Server (service role) ----------
SET LOCAL ROLE service_role;
SELECT is((SELECT count(*) FROM public.similar_artworks_by_phash('ffffffffffffffff', 0) WHERE title LIKE '%pgtap%' OR slug LIKE 'pgtap-%'), 7::bigint,
  'service role: originality lookup works (all statuses, by design)');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
