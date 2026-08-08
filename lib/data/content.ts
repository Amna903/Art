// Centralized image URLs (CDN-hosted African art & photography).
// NOTE: hotlinked from the original Lovable asset host for now — swap for
// self-hosted/Supabase Storage URLs whenever the real asset files are exported.
const ASSET_HOST = "https://nu-artcollective.lovable.app";

const A = {
  paintingAbstract: `${ASSET_HOST}/__l5e/assets-v1/a820f217-1476-433e-9017-b7e8bc4d6e4b/afr-painting-abstract.jpg`,
  streetLagos: `${ASSET_HOST}/__l5e/assets-v1/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg`,
  textile: `${ASSET_HOST}/__l5e/assets-v1/cd429143-8a30-4fcf-ad79-d9a3d5093892/afr-textile.jpg`,
  artistPortrait: `${ASSET_HOST}/__l5e/assets-v1/2f15c99e-87ab-412d-88ad-ead477c66ef0/afr-artist-portrait.jpg`,
  sculpture: `${ASSET_HOST}/__l5e/assets-v1/53f7015e-08e4-4a34-b1a9-68d47a7f1a78/afr-sculpture.jpg`,
  mixedMedia: `${ASSET_HOST}/__l5e/assets-v1/04f8502e-a9bb-4275-9ace-a1f2f752eae2/afr-mixedmedia.jpg`,
  portraitPainting: `${ASSET_HOST}/__l5e/assets-v1/7ecf1ef0-f8b8-4e2b-ba7f-9abe7ac43151/afr-portrait-painting.jpg`,
  galleryRoom: `${ASSET_HOST}/__l5e/assets-v1/8170e7d1-3e87-4dfd-984d-5c50a5625187/afr-gallery-room.jpg`,
  weaverHands: `${ASSET_HOST}/__l5e/assets-v1/8845a1bc-9dc1-4336-b28f-fd6b4059d7be/afr-weaver-hands.jpg`,
  fabricMacro: `${ASSET_HOST}/__l5e/assets-v1/3b671063-daed-4dec-a143-5219ad0ec512/afr-fabric-macro.jpg`,
  culturePortrait: `${ASSET_HOST}/__l5e/assets-v1/962ca422-ea96-4526-86bf-114414bf21e6/afr-culture-portrait.jpg`,
  ceramic: `${ASSET_HOST}/__l5e/assets-v1/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg`,
  ritualBw: `${ASSET_HOST}/__l5e/assets-v1/047a8f56-5cc6-48eb-8d6b-4c1254b37d70/afr-ritual-bw.jpg`,
  charcoal: `${ASSET_HOST}/__l5e/assets-v1/0622c489-71d0-4a78-a45d-29fb5bb45e68/afr-charcoal.jpg`,
};

export const IMG = {
  heroPortrait: A.portraitPainting,
  fresh1: A.paintingAbstract,
  fresh2: A.streetLagos,
  fresh3: A.textile,
  pick1: A.sculpture,
  pick2: A.mixedMedia,
  pick3: A.textile,
  origin: A.culturePortrait,
  dir1: A.artistPortrait,
  dir2: A.portraitPainting,
  dir3: A.sculpture,
  dir4: A.culturePortrait,
  dir5: A.weaverHands,
  dir6: A.ceramic,
  dir7: A.mixedMedia,
  dir8: A.ritualBw,
  artistHero: A.artistPortrait,
  work1: A.paintingAbstract,
  work2: A.portraitPainting,
  work3: A.textile,
  work4: A.ceramic,
  artworkMain: A.mixedMedia,
  artworkDetail: A.fabricMacro,
  artworkContext: A.galleryRoom,
  countryHero: A.galleryRoom,
  country1: A.paintingAbstract,
  country2: A.streetLagos,
  country3: A.culturePortrait,
  collection1: A.paintingAbstract,
  collection2: A.textile,
  collection3: A.sculpture,
  collection4: A.mixedMedia,
  collection5: A.portraitPainting,
  collection6: A.ceramic,
  exhibition1: A.galleryRoom,
  exhibition2: A.mixedMedia,
  exhibition3: A.portraitPainting,
  exhibition4: A.ritualBw,
  account1: A.culturePortrait,
  account2: A.paintingAbstract,
  account3: A.textile,
  account4: A.sculpture,
  senegal: A.galleryRoom,
};

export type Artist = {
  slug: string;
  name: string;
  country: string;
  discipline: string;
  image: string;
};

export const ARTISTS: Artist[] = [
  { slug: "amara-diop", name: "Amara Diop", country: "Senegal", discipline: "Abstract Expressionism", image: IMG.fresh1 },
  { slug: "kofi-mensah", name: "Kofi Mensah", country: "Ghana", discipline: "Street Photography", image: IMG.fresh2 },
  { slug: "zanele-mokoena", name: "Zanele Mokoena", country: "South Africa", discipline: "Textile Arts", image: IMG.fresh3 },
  { slug: "zubairu-ibrahim", name: "Zubairu Ibrahim", country: "Nigeria", discipline: "Mixed Media", image: IMG.dir1 },
  { slug: "amara-okeke", name: "Amara Okeke", country: "Nigeria", discipline: "Oil Painting", image: IMG.dir2 },
  { slug: "moussa-traore", name: "Moussa Traoré", country: "Mali", discipline: "Sculpture", image: IMG.dir3 },
  { slug: "ngozi-eze", name: "Ngozi Eze", country: "Nigeria", discipline: "Photography", image: IMG.dir4 },
  { slug: "aida-kone", name: "Aïda Koné", country: "Côte d'Ivoire", discipline: "Weaving", image: IMG.dir5 },
  { slug: "thandi-nkosi", name: "Thandi Nkosi", country: "South Africa", discipline: "Ceramics", image: IMG.dir6 },
  { slug: "rashid-johnson", name: "Rashid Bello", country: "Cameroon", discipline: "Installation", image: IMG.dir7 },
  { slug: "hawa-toure", name: "Hawa Touré", country: "Senegal", discipline: "Performance", image: IMG.dir8 },
];

export type Artwork = {
  slug: string;
  title: string;
  artist: string;
  country: string;
  medium: string;
  year: number;
  image: string;
  // Slugs from lib/data/collections.ts — an artwork can appear in more than one curated collection.
  collections?: string[];
};

export const ARTWORKS: Artwork[] = [
  { slug: "ethereal-resilience", title: "Ethereal Resilience", artist: "Zubairu Ibrahim", country: "Nigeria", medium: "Oil & gold leaf on linen", year: 2024, image: IMG.artworkMain, collections: ["urban-memory"] },
  { slug: "rhythm-of-the-soil", title: "Rhythm of the Soil", artist: "Moussa Traoré", country: "Mali", medium: "Recycled metal & dark wood", year: 2023, image: IMG.pick1, collections: ["urban-memory"] },
  { slug: "lagos-after-rain", title: "Lagos, After Rain", artist: "Kofi Mensah", country: "Ghana", medium: "Archival pigment print", year: 2024, image: IMG.pick2, collections: ["urban-memory", "pan-african-photography"] },
  { slug: "woven-memory", title: "Woven Memory", artist: "Zanele Mokoena", country: "South Africa", medium: "Hand-woven textile", year: 2024, image: IMG.pick3, collections: ["women-artists", "woven-narratives"] },
  { slug: "fragments-of-light", title: "Fragments of Light", artist: "Amara Diop", country: "Senegal", medium: "Mixed media on canvas", year: 2023, image: IMG.work1, collections: ["women-artists", "sahel-abstractions"] },
  { slug: "the-third-voice", title: "The Third Voice", artist: "Amara Okeke", country: "Nigeria", medium: "Oil on canvas", year: 2024, image: IMG.work2, collections: ["women-artists"] },
  { slug: "river-tongues", title: "River Tongues", artist: "Aïda Koné", country: "Côte d'Ivoire", medium: "Cotton & raffia", year: 2024, image: IMG.work3, collections: ["women-artists", "woven-narratives"] },
  { slug: "interior-monument", title: "Interior Monument", artist: "Thandi Nkosi", country: "South Africa", medium: "Stoneware ceramic", year: 2023, image: IMG.work4, collections: ["women-artists", "clay-and-form"] },
];

export const COUNTRIES = [
  { slug: "nigeria", name: "Nigeria", iso: "NGA", artistsCount: 24, blurb: "Lagos powers a generation of painters and photographers in dialogue with global markets." },
  { slug: "senegal", name: "Senegal", iso: "SEN", artistsCount: 18, blurb: "Dakar's biennale energy sustains a deep bench of conceptual artists and weavers." },
  { slug: "south-africa", name: "South Africa", iso: "ZAF", artistsCount: 31, blurb: "From Johannesburg to Cape Town, ceramicists and textile artists set the pace for the continent." },
  { slug: "ghana", name: "Ghana", iso: "GHA", artistsCount: 15, blurb: "Accra's street photographers archive a city in motion." },
  { slug: "mali", name: "Mali", iso: "MLI", artistsCount: 9, blurb: "Bamako's sculptural tradition transformed by recycled and post-industrial materials." },
  { slug: "kenya", name: "Kenya", iso: "KEN", artistsCount: 12, blurb: "Nairobi's young figurative painters lead the East African scene." },
  { slug: "morocco", name: "Morocco", iso: "MAR", artistsCount: 11, blurb: "Marrakech meets Casablanca in a new wave of mixed-media practice." },
  { slug: "ethiopia", name: "Ethiopia", iso: "ETH", artistsCount: 8, blurb: "Addis Ababa's painterly history reimagined by a younger cohort." },
  { slug: "egypt", name: "Egypt", iso: "EGY", artistsCount: 14, blurb: "Cairo's conceptualists pull from antiquity and street life in equal measure." },
  { slug: "cote-d-ivoire", name: "Côte d'Ivoire", iso: "CIV", artistsCount: 7, blurb: "Abidjan's textile and weaving collectives reframe craft as fine art." },
];
