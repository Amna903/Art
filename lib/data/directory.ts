// Shared "which content source wins" logic for anywhere we list artists or
// artworks across the whole catalog (search, the /artists directory, similar
// artists). Priority: real Supabase self-service content → Sanity CMS →
// static fixture (lib/data/artists.ts / lib/data/content.ts) as last resort.
import { ARTISTS as STATIC_ARTISTS, type Artist, type Technique } from "@/lib/data/artists";
import { ARTWORKS as STATIC_ARTWORKS } from "@/lib/data/content";
import { getArtists, getAllArtworks } from "@/lib/sanity/queries";
import { getRealArtists, countPublishedArtworks, listPublishedArtworks } from "@/lib/data/supabase-artists-cached";
import type { Language } from "@/lib/i18n/config";

export type DirectoryArtwork = {
  slug: string;
  title: string;
  artist: string;
  country: string;
  image: string;
};

export async function getDirectoryArtists(lang: Language = "en"): Promise<Artist[]> {
  const realArtists = await getRealArtists(lang);
  if (realArtists.length > 0) return realArtists;

  const cmsArtists = await getArtists();
  if (cmsArtists.length > 0) {
    return cmsArtists.map((a) => ({
      slug: a.slug,
      name: a.name,
      countryCode: a.countryCode ?? "",
      countryName: a.countryName ?? "",
      countrySlug: a.countrySlug ?? "",
      city: a.city ?? "",
      technique: (a.technique as Technique) ?? "Painting",
      worksCount: a.worksCount ?? 0,
      newDiscovery: a.newDiscovery,
      featuredWork: a.featuredWork ?? "",
      bio: a.bio ?? "",
      image: a.imageUrl ?? "",
    }));
  }

  return STATIC_ARTISTS;
}

/**
 * Artworks matching a search, at most `limit`. Supabase works are searched
 * in the database (title, artist, country, medium); the CMS / static
 * fixtures are only used while no artwork has been published at all.
 */
export async function searchDirectoryArtworks(query: string, lang: Language = "en", limit = 12): Promise<DirectoryArtwork[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  if ((await countPublishedArtworks()) > 0) {
    const { items } = await listPublishedArtworks({ lang, search: needle, limit });
    return items.map((w) => ({
      slug: w.slug,
      title: w.title,
      artist: w.artistName,
      country: w.artistCountry ?? w.country ?? "",
      image: w.thumbUrl ?? w.imageUrl,
    }));
  }

  const cmsArtworks = await getAllArtworks();
  const fallback: DirectoryArtwork[] =
    cmsArtworks.length > 0
      ? cmsArtworks.map((w) => ({
          slug: w.slug,
          title: w.title,
          artist: w.artistName ?? "Unknown Artist",
          country: "",
          image: w.imageUrl ?? "",
        }))
      : STATIC_ARTWORKS;
  return fallback.filter((w) => `${w.title} ${w.artist} ${w.country}`.toLowerCase().includes(needle)).slice(0, limit);
}
