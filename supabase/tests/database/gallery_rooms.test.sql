-- The gallery room plan must count and show only published works.
-- Run: supabase test db
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(4);

SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-00000000bb01', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pgtap-rooms@example.test', '', now(), now());
INSERT INTO public.artworks (artist_id, title, slug, country, image_url, thumb_base, status, created_at) VALUES
  ('00000000-0000-0000-0000-00000000bb01', 'OK old',    'rooms-ok-1',   'Roomland', 'https://x/ok1.jpg',   NULL,                     'published', now() - interval '2 days'),
  ('00000000-0000-0000-0000-00000000bb01', 'OK new',    'rooms-ok-2',   'Roomland', 'https://x/ok2.jpg',   'https://t/rooms-ok-2/v1', 'published', now() - interval '1 day'),
  ('00000000-0000-0000-0000-00000000bb01', 'LEAK new',  'rooms-leak-1', 'Roomland', 'https://x/leak.jpg',  NULL,                     'draft',     now()),
  ('00000000-0000-0000-0000-00000000bb01', 'LEAK sold', 'rooms-leak-2', 'Roomland', 'https://x/leak2.jpg', NULL,                     'sold',      now());
SET LOCAL session_replication_role = origin;

SELECT is((SELECT prosecdef FROM pg_proc WHERE proname = 'published_country_rooms'), false,
  'published_country_rooms is SECURITY INVOKER');

SET LOCAL ROLE anon;
SELECT is((SELECT works FROM public.published_country_rooms() WHERE country = 'Roomland'), 2::bigint,
  'anon: room plan counts only published works');
SELECT is((SELECT covers FROM public.published_country_rooms() WHERE country = 'Roomland'),
  ARRAY['https://t/rooms-ok-2/v1/1280.webp', 'https://x/ok1.jpg'],
  'anon: covers are the newest published works (thumbnail when available), never a draft');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000bb01", "role": "authenticated"}';
SELECT is((SELECT works FROM public.published_country_rooms() WHERE country = 'Roomland'), 2::bigint,
  'owner: room plan still counts only published works');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
