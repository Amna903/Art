-- The "main story" at the top of /journal (weaving/Loom Project piece) was
-- never a journal_posts row at all — it's hardcoded page_blocks content
-- (hero_lead/body_1/body_2/body_3/pull_quote in app/journal/page.tsx),
-- rendered only on that one page. That's why it never shows up in "Latest
-- from the Journal", has no /journal/<slug> URL, and isn't visible from any
-- other journal post. Seeding it as a real, pinned post makes it a normal
-- article like any other — /journal already prefers the pinned real post
-- over the static block (see the pinnedPost check in app/journal/page.tsx)
-- so this also replaces the hardcoded spread with this same content, now
-- admin-editable from the journal grid instead of the page-blocks editor.
INSERT INTO public.journal_posts (slug, title, category, excerpt, content, cover_image_url, read_minutes, is_pinned, created_at)
VALUES (
  'weaving-the-archive-loom-project',
  'Weaving the Archive: Inside the Loom Project',
  'Artist Stories',
  'We are not just weaving threads; we are weaving the historical consciousness of a continent.',
  E'The conversation around contemporary African art has shifted. No longer confined to the periphery of global discourse, it now dictates the tempo. In this deep dive, we explore how textile artists are reclaiming ancient weaving techniques to narrate stories of migration, digital identity, and ancestral memory.\n\nTraditionally, weaving was a communal act — a rhythmic dialogue between the weaver and the loom. Today, that rhythm is being reinterpreted through the lens of modern software and political activism. Artists like El Anatsui paved the way, but a new generation is taking the mantle, using everything from discarded copper wire to recycled digital cables to create tapestries that function as both art and archive.\n\nSustainability is not a buzzword here; it is an inheritance. The materials chosen by these artists often reflect the environmental realities of their locales. From the e-waste graveyards of Accra to the bustling textile markets of Lagos, the raw matter of their work is infused with the weight of the present moment.\n\nIn our exclusive interview with the collective behind ''The Loom Project'', they discuss the tension between preservation and evolution. "The challenge," says lead artist Kofi Mensah, "is to respect the geometry of the past while building the abstractions of the future."',
  'https://nu-artcollective.lovable.app/__l5e/assets-v1/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg',
  12,
  true,
  '2024-05-15T00:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;
