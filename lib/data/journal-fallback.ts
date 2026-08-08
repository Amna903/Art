// Static demo journal posts — last-resort fallback when neither Supabase nor
// the Sanity CMS has any journal content yet. Shared by the /journal listing
// page and the /journal/[slug] detail page so both agree on the same slugs.

const A = "https://nu-artcollective.lovable.app/__l5e/assets-v1";

export type JournalFallbackStory = {
  slug: string;
  tag: string;
  date: string;
  read: string;
  title: string;
  body: string;
  img: string;
  alt: string;
};

export const JOURNAL_FALLBACK_STORIES: JournalFallbackStory[] = [
  {
    slug: "the-silence-of-the-canvas",
    tag: "Curator Notes",
    date: "May 12, 2024",
    read: "5 Min Read",
    title: "The Silence of the Canvas: Minimalism in Modern Accra",
    body: "Exploring the understated power of negative space in contemporary painting from the heart of Ghana.",
    img: `${A}/0622c489-71d0-4a78-a45d-29fb5bb45e68/afr-charcoal.jpg`,
    alt: "A wide-angle landscape shot of a modern architectural gallery building in Cape Town with vast glass panels reflecting a sunset sky.",
  },
  {
    slug: "carving-identity-zanele-muholi",
    tag: "Artist Stories",
    date: "May 08, 2024",
    read: "8 Min Read",
    title: "Carving Identity: A Profile of Zanele Muholi",
    body: "A deep dive into the process of capturing the essence of being through stone and light.",
    img: `${A}/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg`,
    alt: "An artistic close-up of a sculptor's hand holding a chisel against a block of dark, polished stone in high-contrast black and white.",
  },
  {
    slug: "inside-the-studio-24-hours",
    tag: "Exhibitions",
    date: "April 29, 2024",
    read: "15 Min Read",
    title: "Inside the Studio: 24 Hours with the NU-ART Collective",
    body: "A photographic essay documenting the creative chaos and quiet moments of art creation.",
    img: `${A}/53f7015e-08e4-4a34-b1a9-68d47a7f1a78/afr-sculpture.jpg`,
    alt: "A bright, high-key image of a modern art studio filled with colorful canvases and art supplies, overlooking a green urban garden.",
  },
];
