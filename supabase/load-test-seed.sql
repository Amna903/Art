-- LOCAL LOAD TEST ONLY — never run against production.
-- 5,000 published artworks (+240 drafts) across 12 countries.
-- Usage: supabase start && psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/load-test-seed.sql
SET session_replication_role = replica;  -- skip publish-time triggers while seeding

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed-admin@example.test', '', now(), now()),
       ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seed-artist@example.test', '', now(), now())
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id, display_name, country, bio)
VALUES ('00000000-0000-0000-0000-0000000000b1', 'Seed Account Artist', 'Nigeria', 'Account artist used for load tests.')
ON CONFLICT (id) DO NOTHING;

WITH countries(i, name) AS (
  SELECT * FROM unnest(ARRAY[1,2,3,4,5,6,7,8,9,10,11,12],
    ARRAY['Angola','Nigeria','Zimbabwe','South Africa','Republic of the Congo','Democratic Republic of the Congo','Kenya','Ghana','Senegal','Ethiopia','Mozambique','Mali'])
)
INSERT INTO public.managed_artists (id, display_name, country, city, technique, bio, slug, managed_by, created_at)
SELECT gen_random_uuid(), 'Seed Artist ' || g, c.name, 'City ' || g, (ARRAY['Painting','Sculpture','Photography','Textile','Mixed Media'])[1 + g % 5],
       'Seeded artist ' || g || ' working in ' || c.name || '.', 'seed-artist-' || g,
       '00000000-0000-0000-0000-0000000000a1', now() - (g || ' days')::interval
FROM generate_series(1, 300) g
JOIN countries c ON c.i = 1 + (g % 12);

-- Skew: a few countries get far more works (Angola alone ~1,000+).
INSERT INTO public.artworks (artist_id, managed_artist_id, title, slug, description, medium, year, country, dimensions, image_url, status, created_at, translations)
SELECT '00000000-0000-0000-0000-0000000000a1', ma.id,
       'Seed Work ' || g, 'seed-work-' || g,
       'A seeded artwork for load testing. Number ' || g || '.',
       (ARRAY['Painting','Sculpture','Photography','Textile','Mixed Media'])[1 + g % 5],
       2000 + g % 26, ma.country, '100 x 80 cm',
       '/images/' || (ARRAY['art-painting-1.jpg','art-painting-2.jpg','art-painting-3.jpg','art-painting-4.jpg','art-painting-5.jpg','art-textile-1.jpg','art-textile-2.jpg','art-sculpture-1.jpg','art-photography-1.jpg','art-mixed-1.jpg','art-digital-1.jpg','art-mixed-2.jpg'])[1 + g % 12],
       CASE WHEN g % 21 = 0 THEN 'draft'::artwork_status ELSE 'published'::artwork_status END,
       now() - (g || ' minutes')::interval,
       '{}'::jsonb
FROM generate_series(1, 5050) g
JOIN LATERAL (
  SELECT id, country FROM public.managed_artists
  WHERE slug = 'seed-artist-' || (1 + ((CASE WHEN g % 5 = 0 THEN 0 ELSE g END) * 7919) % 300)
) ma ON true;

-- Account artist (profile path), 200 works.
INSERT INTO public.artworks (artist_id, title, slug, description, medium, year, country, image_url, status, created_at)
SELECT '00000000-0000-0000-0000-0000000000b1', 'Account Work ' || g, 'account-work-' || g, 'Seeded account artwork ' || g || '.',
       'Painting', 2024, 'Nigeria', '/images/art-painting-' || (1 + g % 5) || '.jpg', 'published', now() - (g || ' hours')::interval
FROM generate_series(1, 200) g;

SET session_replication_role = origin;
ANALYZE public.artworks; ANALYZE public.managed_artists; ANALYZE public.profiles;
SELECT status, count(*) FROM public.artworks GROUP BY status;
SELECT country, works FROM public.published_artwork_country_counts() ORDER BY works DESC;
