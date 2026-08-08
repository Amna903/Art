-- The 3 "static demo" journal posts (lib/data/journal-fallback.ts) were only
-- ever a last-resort fallback shown when journal_posts was empty — the
-- moment an admin published even one real post, JournalGrid switched to
-- Supabase entirely and all 3 static ones vanished from the site. Seeding
-- them as real rows here makes them permanent, admin-editable content: they
-- always exist, and any post an admin adds from here on just adds to this
-- list rather than replacing it.
INSERT INTO public.journal_posts (slug, title, category, excerpt, content, cover_image_url, read_minutes, created_at)
VALUES
  (
    'the-silence-of-the-canvas',
    'The Silence of the Canvas: Minimalism in Modern Accra',
    'Curator Notes',
    'Exploring the understated power of negative space in contemporary painting from the heart of Ghana.',
    'Exploring the understated power of negative space in contemporary painting from the heart of Ghana.',
    'https://nu-artcollective.lovable.app/__l5e/assets-v1/0622c489-71d0-4a78-a45d-29fb5bb45e68/afr-charcoal.jpg',
    5,
    '2024-05-12T00:00:00Z'
  ),
  (
    'carving-identity-zanele-muholi',
    'Carving Identity: A Profile of Zanele Muholi',
    'Artist Stories',
    'A deep dive into the process of capturing the essence of being through stone and light.',
    'A deep dive into the process of capturing the essence of being through stone and light.',
    'https://nu-artcollective.lovable.app/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg',
    8,
    '2024-05-08T00:00:00Z'
  ),
  (
    'inside-the-studio-24-hours',
    'Inside the Studio: 24 Hours with the NU-ART Collective',
    'Exhibitions',
    'A photographic essay documenting the creative chaos and quiet moments of art creation.',
    'A photographic essay documenting the creative chaos and quiet moments of art creation.',
    'https://nu-artcollective.lovable.app/__l5e/assets-v1/53f7015e-08e4-4a34-b1a9-68d47a7f1a78/afr-sculpture.jpg',
    15,
    '2024-04-29T00:00:00Z'
  )
ON CONFLICT (slug) DO NOTHING;
