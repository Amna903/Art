import { getSanityClient, isSanityConfigured, urlFor } from "./client";
import { getCountryBySlug, getCountryGallery, type CountryGallery, type MockArtist, type MockArtwork } from "@/lib/data/africa";

// ---------- Site Settings (hero image + copy) ----------

export type SiteSettings = {
  heroImageUrl: string | null;
  heroHeadlineLine1: string | null;
  heroHeadlineLine2: string | null;
  heroBody: string | null;
};

const SITE_SETTINGS_QUERY = /* groq */ `
  *[_type == "siteSettings"][0]{
    heroImage,
    heroHeadlineLine1,
    heroHeadlineLine2,
    heroBody
  }
`;

const SITE_SETTINGS_FALLBACK: SiteSettings = {
  heroImageUrl: null,
  heroHeadlineLine1: null,
  heroHeadlineLine2: null,
  heroBody: null,
};

/**
 * Fetches the single "siteSettings" document (see sanity/schemas/siteSettings.ts
 * for the schema to add in your Sanity Studio). Returns a fallback — not an
 * error — when Sanity isn't configured yet, or the document doesn't exist,
 * so pages can always render with a sane default.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isSanityConfigured()) return SITE_SETTINGS_FALLBACK;

  try {
    const doc = await getSanityClient().fetch<{
      heroImage?: unknown;
      heroHeadlineLine1?: string;
      heroHeadlineLine2?: string;
      heroBody?: string;
    } | null>(SITE_SETTINGS_QUERY, {}, { next: { revalidate: 60 } });

    if (!doc) return SITE_SETTINGS_FALLBACK;

    return {
      heroImageUrl: doc.heroImage ? urlFor(doc.heroImage as never).width(1200).url() : null,
      heroHeadlineLine1: doc.heroHeadlineLine1 ?? null,
      heroHeadlineLine2: doc.heroHeadlineLine2 ?? null,
      heroBody: doc.heroBody ?? null,
    };
  } catch (err) {
    console.error("[Sanity] Failed to fetch siteSettings:", err);
    return SITE_SETTINGS_FALLBACK;
  }
}

// ---------- Artists ----------

export type ArtistCms = {
  name: string;
  slug: string;
  countryName: string | null;
  countrySlug: string | null;
  countryCode: string | null;
  city: string | null;
  technique: string | null;
  bio: string | null;
  artistStatement: string | null;
  featuredWork: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  worksCount: number | null;
  newDiscovery: boolean;
};

const ARTISTS_QUERY = /* groq */ `
  *[_type == "artist"] | order(name asc){
    name,
    "slug": slug.current,
    countryName,
    countrySlug,
    countryCode,
    city,
    technique,
    bio,
    artistStatement,
    featuredWork,
    portrait,
    "imageAlt": portrait.alt,
    worksCount,
    newDiscovery
  }
`;

function mapArtistDoc(d: {
  name: string;
  slug: string;
  countryName?: string;
  countrySlug?: string;
  countryCode?: string;
  city?: string;
  technique?: string;
  bio?: string;
  artistStatement?: string;
  featuredWork?: string;
  portrait?: unknown;
  imageAlt?: string;
  worksCount?: number;
  newDiscovery?: boolean;
}): ArtistCms {
  return {
    name: d.name,
    slug: d.slug,
    countryName: d.countryName ?? null,
    countrySlug: d.countrySlug ?? null,
    countryCode: d.countryCode ?? null,
    city: d.city ?? null,
    technique: d.technique ?? null,
    bio: d.bio ?? null,
    artistStatement: d.artistStatement ?? null,
    featuredWork: d.featuredWork ?? null,
    imageUrl: d.portrait ? urlFor(d.portrait as never).width(800).url() : null,
    imageAlt: d.imageAlt ?? null,
    worksCount: d.worksCount ?? null,
    newDiscovery: d.newDiscovery ?? false,
  };
}

/** Returns [] (not an error) when Sanity isn't configured or has no artists yet — callers should fall back to lib/data/artists.ts. */
export async function getArtists(): Promise<ArtistCms[]> {
  if (!isSanityConfigured()) return [];
  try {
    const docs = await getSanityClient().fetch<Parameters<typeof mapArtistDoc>[0][]>(
      ARTISTS_QUERY,
      {},
      { next: { revalidate: 60 } },
    );
    return docs.map(mapArtistDoc);
  } catch (err) {
    console.error("[Sanity] Failed to fetch artist:", err);
    return [];
  }
}

export async function getFeaturedArtists(limit = 3): Promise<ArtistCms[]> {
  if (!isSanityConfigured()) return [];
  try {
    const docs = await getSanityClient().fetch<Parameters<typeof mapArtistDoc>[0][]>(
      /* groq */ `*[_type == "artist"] | order(newDiscovery desc, name asc)[0...$limit]{
        name, "slug": slug.current, countryName, countrySlug, countryCode, city, technique,
        bio, artistStatement, featuredWork, portrait, "imageAlt": portrait.alt, worksCount, newDiscovery
      }`,
      { limit },
      { next: { revalidate: 60 } },
    );
    return docs.map(mapArtistDoc);
  } catch (err) {
    console.error("[Sanity] Failed to fetch featured artists:", err);
    return [];
  }
}

export async function getArtistsByCountrySlug(countrySlug: string): Promise<ArtistCms[]> {
  if (!isSanityConfigured()) return [];
  try {
    const docs = await getSanityClient().fetch<Parameters<typeof mapArtistDoc>[0][]>(
      /* groq */ `*[_type == "artist" && countrySlug == $countrySlug] | order(name asc){
        name, "slug": slug.current, countryName, countrySlug, countryCode, city, technique,
        bio, artistStatement, featuredWork, portrait, "imageAlt": portrait.alt, worksCount, newDiscovery
      }`,
      { countrySlug },
      { next: { revalidate: 60 } },
    );
    return docs.map(mapArtistDoc);
  } catch (err) {
    console.error("[Sanity] Failed to fetch artists by country:", err);
    return [];
  }
}

/** Returns null when not found / not configured — caller falls back to static data. */
export async function getArtistBySlug(slug: string): Promise<ArtistCms | null> {
  if (!isSanityConfigured()) return null;
  try {
    const doc = await getSanityClient().fetch<Parameters<typeof mapArtistDoc>[0] | null>(
      /* groq */ `*[_type == "artist" && slug.current == $slug][0]{
        name, "slug": slug.current, countryName, countrySlug, countryCode, city, technique,
        bio, artistStatement, featuredWork, portrait, "imageAlt": portrait.alt, worksCount, newDiscovery
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );
    return doc ? mapArtistDoc(doc) : null;
  } catch (err) {
    console.error("[Sanity] Failed to fetch artist by slug:", err);
    return null;
  }
}

export async function getArtworksByArtistSlug(slug: string): Promise<ArtworkCms[]> {
  if (!isSanityConfigured()) return [];
  try {
    const docs = await getSanityClient().fetch<
      Array<{
        title: string;
        slug: string;
        artistName?: string;
        artistSlug?: string;
        artistCity?: string;
        medium?: string;
        year?: number;
        image?: unknown;
        imageAlt?: string;
        story?: string;
        collection?: string;
      }>
    >(
      /* groq */ `*[_type == "artwork" && artist->slug.current == $slug] | order(year desc, title asc){
        title, "slug": slug.current, artistName: artist->name, artistSlug: artist->slug.current,
        artistCity: artist->city, medium, year, image, "imageAlt": image.alt, story, collection
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );

    return docs.map((d) => ({
      title: d.title,
      slug: d.slug,
      artistName: d.artistName ?? null,
      artistSlug: d.artistSlug ?? null,
      artistBio: null,
      artistStatement: null,
      medium: d.medium ?? null,
      year: d.year ?? null,
      imageUrl: d.image ? urlFor(d.image as never).width(1200).url() : null,
      imageAlt: d.imageAlt ?? null,
      story: d.story ?? null,
      collection: d.collection ?? null,
    }));
  } catch (err) {
    console.error("[Sanity] Failed to fetch artworks by artist:", err);
    return [];
  }
}

export async function getCountryGalleryBySlug(countrySlug: string): Promise<CountryGallery | null> {
  const country = getCountryBySlug(countrySlug);
  if (!country) return null;

  const [artistsCms, artworksCms] = await Promise.all([
    getArtistsByCountrySlug(countrySlug),
    isSanityConfigured()
      ? getSanityClient().fetch<
          Array<{
            title: string;
            slug: string;
            artistName?: string;
            artistSlug?: string;
            artistCity?: string;
            medium?: string;
            year?: number;
            image?: unknown;
            imageAlt?: string;
            story?: string;
            collection?: string;
          }>
        >(
          /* groq */ `*[_type == "artwork" && artist->countrySlug == $countrySlug] | order(year desc, title asc){
            title, "slug": slug.current, artistName: artist->name, artistSlug: artist->slug.current,
            artistCity: artist->city, medium, year, image, "imageAlt": image.alt, story, collection
          }`,
          { countrySlug },
          { next: { revalidate: 60 } },
        )
      : [],
  ]);

  const palette = ["b8703a", "c9a24a", "a37542", "d6b078", "8a5a2c", "7a4a2a", "8a8248", "96806a"];
  const hashStr = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const swatchFor = (seed: string) => palette[hashStr(seed) % palette.length];

  const artists: MockArtist[] = artistsCms.map((artist, index) => ({
    slug: artist.slug,
    name: artist.name,
    role: index === 0 ? "featured" : "emerging",
    bio:
      artist.bio ??
      `${artist.name.split(" ")[0]} works between ${country.capital} and the broader ${country.region} African scene.`,
    avatarSwatch: swatchFor(artist.slug),
  }));

  const artworks: MockArtwork[] = artworksCms.map((artwork, index) => ({
    id: artwork.slug,
    title: artwork.title,
    artist: artwork.artistName ?? "Unknown Artist",
    artistSlug: artwork.artistSlug ?? "",
    year: artwork.year ?? new Date().getFullYear(),
    technique: artwork.medium ?? "Mixed Media",
    dimensions: `${96 + (index % 4) * 12} × ${120 + (index % 3) * 16} cm`,
    price: index % 5 === 0 ? null : 1,
    city: artwork.artistSlug ? (artwork.story ? country.capital : country.capital) : country.capital,
    description:
      artwork.story ??
      `A work from ${country.name} that folds inherited symbols into a contemporary register.`,
    swatch: swatchFor(artwork.slug),
    room: (index % 3) as 0 | 1 | 2,
  }));

  // No Sanity documents for this country yet (or Sanity isn't configured) —
  // fall back to the deterministic mock gallery so the country page never
  // renders an empty artists/artworks section.
  if (artists.length === 0 && artworks.length === 0) {
    return getCountryGallery(countrySlug);
  }

  const rooms = [
    { title: "Featured Artist Room", subtitle: artists[0]?.name ?? country.capital },
    { title: "Emerging Artists Room", subtitle: `${Math.max(0, artists.length - 1)} voices from ${country.capital}` },
    { title: "Available Works Room", subtitle: `${artworks.length} works drawn from Sanity` },
  ];

  return {
    country,
    artists,
    artworks,
    rooms,
    available: artworks.filter((a) => a.price !== null).length,
    hasNew: artists.some((artist) => artist.role === "featured"),
  };
}

// ---------- Artworks ----------

export type ArtworkCms = {
  title: string;
  slug: string;
  artistName: string | null;
  artistSlug: string | null;
  artistBio: string | null;
  artistStatement: string | null;
  medium: string | null;
  year: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  story: string | null;
  collection: string | null;
};

function mapArtworkDoc(d: {
  title: string;
  slug: string;
  artistName?: string;
  artistSlug?: string;
  artistBio?: string;
  artistStatement?: string;
  medium?: string;
  year?: number;
  image?: unknown;
  imageAlt?: string;
  story?: string;
  collection?: string;
}): ArtworkCms {
  return {
    title: d.title,
    slug: d.slug,
    artistName: d.artistName ?? null,
    artistSlug: d.artistSlug ?? null,
    artistBio: d.artistBio ?? null,
    artistStatement: d.artistStatement ?? null,
    medium: d.medium ?? null,
    year: d.year ?? null,
    imageUrl: d.image ? urlFor(d.image as never).width(1200).url() : null,
    imageAlt: d.imageAlt ?? null,
    story: d.story ?? null,
    collection: d.collection ?? null,
  };
}

/** Returns null when not found / not configured — caller falls back to static/template content. */
export async function getArtworkBySlug(slug: string): Promise<ArtworkCms | null> {
  if (!isSanityConfigured()) return null;
  try {
    const doc = await getSanityClient().fetch<Parameters<typeof mapArtworkDoc>[0] | null>(
      /* groq */ `*[_type == "artwork" && slug.current == $slug][0]{
        title, "slug": slug.current, "artistName": artist->name, "artistSlug": artist->slug.current,
        "artistBio": artist->bio, "artistStatement": artist->artistStatement, medium, year,
        image, "imageAlt": image.alt, story, collection
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );
    return doc ? mapArtworkDoc(doc) : null;
  } catch (err) {
    console.error("[Sanity] Failed to fetch artwork by slug:", err);
    return null;
  }
}

export async function getFeaturedArtworks(limit = 3): Promise<ArtworkCms[]> {
  if (!isSanityConfigured()) return [];

  try {
    const docs = await getSanityClient().fetch<
      Array<{
        title: string;
        slug: string;
        artistName?: string;
  artistSlug?: string;
  artistBio?: string;
  artistStatement?: string;
  medium?: string;
        year?: number;
        image?: unknown;
        imageAlt?: string;
        story?: string;
        collection?: string;
      }>
    >(
      /* groq */ `*[_type == "artwork"] | order(year desc, title asc)[0...$limit]{
        title, "slug": slug.current, "artistName": artist->name, medium, year, image,
        "imageAlt": image.alt, story, collection
      }`,
      { limit },
      { next: { revalidate: 60 } },
    );

    return docs.map(mapArtworkDoc);
  } catch (err) {
    console.error("[Sanity] Failed to fetch featured artworks:", err);
    return [];
  }
}

/** Returns [] (not an error) when Sanity isn't configured or has no artworks yet — callers should fall back to lib/data/content.ts. */
export async function getAllArtworks(): Promise<ArtworkCms[]> {
  if (!isSanityConfigured()) return [];
  try {
    const docs = await getSanityClient().fetch<
      Array<{
        title: string;
        slug: string;
        artistName?: string;
  artistSlug?: string;
  artistBio?: string;
  artistStatement?: string;
  medium?: string;
        year?: number;
        image?: unknown;
        imageAlt?: string;
        story?: string;
        collection?: string;
      }>
    >(
      /* groq */ `*[_type == "artwork"] | order(year desc, title asc){
        title, "slug": slug.current, "artistName": artist->name, medium, year, image,
        "imageAlt": image.alt, story, collection
      }`,
      {},
      { next: { revalidate: 60 } },
    );

    return docs.map(mapArtworkDoc);
  } catch (err) {
    console.error("[Sanity] Failed to fetch artworks:", err);
    return [];
  }
}

export type JournalPostCms = {
  title: string;
  slug: string;
  tag: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  readMinutes: number | null;
  publishedAt: string | null;
};

const JOURNAL_POSTS_QUERY = /* groq */ `
  *[_type == "journalPost"] | order(publishedAt desc){
    title,
    "slug": slug.current,
    tag,
    excerpt,
    coverImage,
    "imageAlt": coverImage.alt,
    readMinutes,
    publishedAt
  }
`;

/** Returns [] (not an error) when Sanity isn't configured or has no posts yet — callers should fall back to static content. */
export async function getJournalPosts(): Promise<JournalPostCms[]> {
  if (!isSanityConfigured()) return [];

  try {
    const docs = await getSanityClient().fetch<
      Array<{
        title: string;
        slug: string;
        tag?: string;
        excerpt?: string;
        coverImage?: unknown;
        imageAlt?: string;
        readMinutes?: number;
        publishedAt?: string;
      }>
    >(JOURNAL_POSTS_QUERY, {}, { next: { revalidate: 60 } });

    return docs.map((d) => ({
      title: d.title,
      slug: d.slug,
      tag: d.tag ?? null,
      excerpt: d.excerpt ?? null,
      imageUrl: d.coverImage ? urlFor(d.coverImage as never).width(900).url() : null,
      imageAlt: d.imageAlt ?? null,
      readMinutes: d.readMinutes ?? null,
      publishedAt: d.publishedAt ?? null,
    }));
  } catch (err) {
    console.error("[Sanity] Failed to fetch journalPost:", err);
    return [];
  }
}

/** Returns null when not found / not configured — caller falls back to Supabase/static content. */
export async function getJournalPostBySlug(slug: string): Promise<JournalPostCms | null> {
  if (!isSanityConfigured()) return null;
  try {
    const doc = await getSanityClient().fetch<{
      title: string;
      slug: string;
      tag?: string;
      excerpt?: string;
      coverImage?: unknown;
      imageAlt?: string;
      readMinutes?: number;
      publishedAt?: string;
    } | null>(
      /* groq */ `*[_type == "journalPost" && slug.current == $slug][0]{
        title, "slug": slug.current, tag, excerpt, coverImage, "imageAlt": coverImage.alt, readMinutes, publishedAt
      }`,
      { slug },
      { next: { revalidate: 60 } },
    );
    if (!doc) return null;
    return {
      title: doc.title,
      slug: doc.slug,
      tag: doc.tag ?? null,
      excerpt: doc.excerpt ?? null,
      imageUrl: doc.coverImage ? urlFor(doc.coverImage as never).width(900).url() : null,
      imageAlt: doc.imageAlt ?? null,
      readMinutes: doc.readMinutes ?? null,
      publishedAt: doc.publishedAt ?? null,
    };
  } catch (err) {
    console.error("[Sanity] Failed to fetch journalPost by slug:", err);
    return null;
  }
}

// ---------- Exhibitions ----------

export type ExhibitionCms = {
  title: string;
  status: "upcoming" | "current" | "past" | null;
  location: string | null;
  dateLabel: string | null;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

const EXHIBITIONS_QUERY = /* groq */ `
  *[_type == "exhibition"] | order(dateLabel asc){
    title,
    status,
    location,
    dateLabel,
    description,
    coverImage,
    "imageAlt": coverImage.alt
  }
`;

/** Returns [] (not an error) when Sanity isn't configured or has no exhibitions yet — callers should fall back to static content. */
export async function getExhibitions(): Promise<ExhibitionCms[]> {
  if (!isSanityConfigured()) return [];

  try {
    const docs = await getSanityClient().fetch<
      Array<{
        title: string;
        status?: "upcoming" | "current" | "past";
        location?: string;
        dateLabel?: string;
        description?: string;
        coverImage?: unknown;
        imageAlt?: string;
      }>
    >(EXHIBITIONS_QUERY, {}, { next: { revalidate: 60 } });

    return docs.map((d) => ({
      title: d.title,
      status: d.status ?? null,
      location: d.location ?? null,
      dateLabel: d.dateLabel ?? null,
      description: d.description ?? null,
      imageUrl: d.coverImage ? urlFor(d.coverImage as never).width(900).url() : null,
      imageAlt: d.imageAlt ?? null,
    }));
  } catch (err) {
    console.error("[Sanity] Failed to fetch exhibition:", err);
    return [];
  }
}
