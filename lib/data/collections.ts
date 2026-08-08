export type Collection = {
  slug: string;
  title: string;
  tag?: string;
  description: string;
  image: string;
  imageAlt: string;
  country: string;
  medium: string;
  artists: string;
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "women-artists",
    title: "Women Artists: The Divine Feminine",
    tag: "Featured Series",
    description:
      "An exploration of the maternal, the mystical, and the political through the lens of twelve leading female creators across the continent. This collection spans textile, sculpture, and oil on canvas.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg",
    imageAlt:
      "Editorial photograph of contemporary African women portraiture in a minimalist gallery with a single red thread.",
    country: "Pan-African",
    medium: "Mixed Media",
    artists: "12 Featured",
  },
  {
    slug: "urban-memory",
    title: "Urban Memory",
    description:
      "Tracing the rapid evolution of African megacities through mixed-media works that incorporate street detritus and architectural blueprints.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg",
    imageAlt: "Architectural photograph of urban textures in Lagos with a vibrant red geometric shape.",
    country: "Nigeria",
    medium: "Photography",
    artists: "8 Artists",
  },
  {
    slug: "pan-african-photography",
    title: "Pan-African Photography",
    description:
      "A retrospective of the pioneers and new-wavers defining the visual language of the continent's diverse cultures.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/047a8f56-5cc6-48eb-8d6b-4c1254b37d70/afr-ritual-bw.jpg",
    imageAlt: "High-contrast black and white photography of African cultural rituals and identity.",
    country: "Pan-African",
    medium: "Photography",
    artists: "24 Artists",
  },
  {
    slug: "woven-narratives",
    title: "Woven Narratives",
    tag: "Materiality Series",
    description:
      "Celebrating the resurgence of textile arts as a medium for socio-political storytelling and environmental consciousness. Each piece is a testament to labor and lore.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/8845a1bc-9dc1-4336-b28f-fd6b4059d7be/afr-weaver-hands.jpg",
    imageAlt: "Documentary photograph of a Malian weaver's hands working on a traditional wooden loom.",
    country: "Mali",
    medium: "Textile",
    artists: "07 Artists",
  },
  {
    slug: "sahel-abstractions",
    title: "Sahel Abstractions",
    description:
      "Contemporary paintings and mixed-media works evoking the light, land and spiritual depth of the Sahel region.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/a820f217-1476-433e-9017-b7e8bc4d6e4b/afr-painting-abstract.jpg",
    imageAlt: "Contemporary African abstract oil painting in warm ochres, deep indigos and stark blacks.",
    country: "Senegal",
    medium: "Painting",
    artists: "9 Artists",
  },
  {
    slug: "clay-and-form",
    title: "Clay & Form",
    description:
      "Hand-built stoneware and ceremonial vessels reinterpreted by a new generation of South African ceramicists.",
    image: "https://nu-artcollective.lovable.app/__l5e/assets-v1/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg",
    imageAlt: "Contemporary African ceramic vessel with tribal-inspired incised patterns.",
    country: "South Africa",
    medium: "Sculpture",
    artists: "6 Artists",
  },
];

export function getCollectionBySlug(slug: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.slug === slug);
}
