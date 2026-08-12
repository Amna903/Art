import { AFRICAN_COUNTRIES } from "./africa";
import { pickImage, pickImageForTechnique } from "./african-imagery";


export const TECHNIQUES = [
  "Painting",
  "Sculpture",
  "Photography",
  "Textile",
  "Digital",
  "Mixed Media",
  "Other",
] as const;
export type Technique = (typeof TECHNIQUES)[number];

export type Artist = {
  slug: string;
  name: string;
  countryCode: string;
  countryName: string;
  countrySlug: string;
  city: string;
  technique: string;
  filterTechniques?: Technique[];
  worksCount: number;
  newDiscovery: boolean;
  featuredWork: string;
  bio: string;
  image: string;
};

// Deterministic PRNG (mulberry32) so the directory is stable across renders.
function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Kofi", "Thabo", "Amani", "Lindiwe", "Chinua", "Zanele", "Ibrahim", "Amara",
  "Kwesi", "Tunde", "Nia", "Ade", "Sekou", "Naledi", "Fatou", "Omar",
  "Aisha", "Kwame", "Yara", "Idris", "Nala", "Kojo", "Ayana", "Musa",
  "Zola", "Chidi", "Rania", "Bola", "Ngozi", "Salif", "Adaeze", "Jelani",
  "Mariama", "Youssef", "Simi", "Aminata", "Bakary", "Efua", "Hakim", "Sade",
  "Obi", "Rashida", "Tariq", "Zainab", "Ekow", "Farida", "Kagiso", "Layla",
];
const LAST_NAMES = [
  "Diallo", "Achebe", "Nkosi", "Banda", "Mensah", "Khoza", "Diop", "Bello",
  "Ansah", "Olayinka", "Mbeki", "Okafor", "Traoré", "Sow", "Mwangi", "Adeyemi",
  "Osei", "Kamau", "Fofana", "Njoku", "Sesay", "Toure", "Owusu", "Balogun",
  "Dieng", "Camara", "Mutombo", "Nakamura", "Achieng", "Cissé", "Coulibaly", "Keita",
  "Sarr", "Nwosu", "Chukwu", "Mahama", "Ba", "Salif", "Diakité", "Sy",
];

const TECH_CYCLE: Technique[] = [
  "Painting", "Sculpture", "Mixed Media", "Textile",
  "Photography", "Digital", "Painting", "Sculpture",
];

function slugify(name: string, idx: number) {
  const base = name.toLowerCase().replace(/[^a-z]+/g, "-");
  return idx === 0 ? base : `${base}-${idx + 1}`;
}

function buildArtists(): Artist[] {
  const rand = rng(20260702);
  const list: Artist[] = [];
  const usedSlugs = new Map<string, number>();

  // Country distribution to reach 178 total across 54 countries: 4 for the
  // first 16 countries, 3 for the rest → 16*4 + 38*3 = 64 + 114 = 178.
  const perCountry = AFRICAN_COUNTRIES.map((_, i) => (i < 16 ? 4 : 3));

  AFRICAN_COUNTRIES.forEach((country, ci) => {
    const n = perCountry[ci];
    for (let i = 0; i < n; i++) {
      const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      const name = `${first} ${last}`;
      const base = `${first}-${last}`.toLowerCase();
      const dupIdx = usedSlugs.get(base) ?? 0;
      usedSlugs.set(base, dupIdx + 1);
      const slug = slugify(`${first} ${last}`, dupIdx);
      const technique = TECH_CYCLE[(ci + i) % TECH_CYCLE.length];
      const worksCount = 1 + Math.floor(rand() * 12);
      const newDiscovery = rand() < 0.18;
      const featuredWorks = [
        "The Echo of Ancestors", "Monoliths & Memory", "Woven Narratives",
        "Algorithm of the Soul", "Horizons Unwritten", "The Cartographer's Silence",
        "Sun Between Walls", "Nocturne for a River", "Field Notes in Indigo",
        "Portrait of a Continent", "After the Harmattan", "Salt, Light, Bone",
      ];
      const featuredWork = featuredWorks[Math.floor(rand() * featuredWorks.length)];
      const bio = `${first} works between ${country.capital} and international residencies, translating ${country.blurb.toLowerCase()}`;
      // Deterministic African-first imagery per artist — portraits alternate,
      // featured works are matched to the artist's technique for authenticity.
      const wantsPortrait = i % 2 === 0;
      const image = wantsPortrait
        ? pickImage(`artist-${ci}-${i}-${first}-${last}`, "portrait")
        : pickImageForTechnique(`artwork-${ci}-${i}-${first}-${last}-${featuredWork}`, technique);


      list.push({
        slug,
        name,
        countryCode: country.code,
        countryName: country.name,
        countrySlug: country.slug,
        city: country.capital,
        technique,
        worksCount,
        newDiscovery,
        featuredWork,
        bio,
        image,
      });
    }
  });

  // Guarantee the four examples from the spec are present.
  const overrides: Array<Partial<Artist> & { targetIndex: number }> = [
    { targetIndex: 0, name: "Kofi Diallo", slug: "kofi-diallo", technique: "Painting", worksCount: 3, newDiscovery: false, featuredWork: "The Cartographer's Silence" },
    { targetIndex: 1, name: "Thabo Achebe", slug: "thabo-achebe", technique: "Sculpture", worksCount: 2, newDiscovery: true, featuredWork: "Monoliths & Memory" },
    { targetIndex: 4, name: "Amani Nkosi", slug: "amani-nkosi", technique: "Mixed Media", worksCount: 4, newDiscovery: false, featuredWork: "Woven Narratives" },
    { targetIndex: 5, name: "Lindiwe Banda", slug: "lindiwe-banda", technique: "Textile", worksCount: 3, newDiscovery: false, featuredWork: "Field Notes in Indigo" },
  ];
  overrides.forEach((o) => {
    Object.assign(list[o.targetIndex], o);
  });

  return list;
}

export const ARTISTS: Artist[] = buildArtists();
export const ARTIST_COUNT = ARTISTS.length; // 178
export const COUNTRY_COUNT = AFRICAN_COUNTRIES.length; // 54

export function getArtistSlugByName(name: string): string {
  const norm = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const found = ARTISTS.find(
    (a) => a.name.toLowerCase() === name.toLowerCase() || a.slug === norm
  );
  if (found) return found.slug;
  return norm;
}

export function getArtistBySlug(slug: string): Artist {
  const norm = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const found =
    ARTISTS.find((a) => a.slug === slug || a.slug === norm) ||
    ARTISTS.find((a) => a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === norm);
  if (found) return found;

  // Fallback dynamic artist profile for any unlisted slug so artist pages never 404
  const nameParts = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  const name = nameParts.join(" ");
  let seed = 0;
  for (let i = 0; i < slug.length; i++) seed += slug.charCodeAt(i);
  const country = AFRICAN_COUNTRIES[seed % AFRICAN_COUNTRIES.length];

  return {
    slug,
    name,
    countryCode: country.code,
    countryName: country.name,
    countrySlug: country.slug,
    city: country.capital,
    technique: "Mixed Media",
    worksCount: 4,
    newDiscovery: true,
    featuredWork: "The Cartographer's Silence",
    bio: `${name} works between ${country.capital} and international studio spaces, translating ${country.blurb.toLowerCase()}`,
    image: pickImage(`artist-fallback-${slug}`, "portrait"),
  };
}
