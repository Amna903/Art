// Shared "which content source wins" logic for anywhere we list artists or
// artworks across the whole catalog (search, the /artists directory, similar
// artists). Priority: real Supabase self-service content → Sanity CMS →
// static fixture (lib/data/artists.ts / lib/data/content.ts) as last resort.
import { ARTISTS as STATIC_ARTISTS, type Artist, type Technique } from "@/lib/data/artists";
import { ARTWORKS as STATIC_ARTWORKS } from "@/lib/data/content";
import { getArtists, getAllArtworks } from "@/lib/sanity/queries";
import { getRealArtists, getPublishedArtworks } from "@/lib/data/supabase-artists-cached";

export type DirectoryArtwork = {
  slug: string;
  title: string;
  artist: string;
  country: string;
  image: string;
};

export async function getDirectoryArtists(): Promise<Artist[]> {
  const realArtists = await getRealArtists();
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

export async function getDirectoryArtworks(): Promise<DirectoryArtwork[]> {
  const realArtworks = await getPublishedArtworks();
  if (realArtworks.length > 0) {
    return realArtworks.map((w) => ({
      slug: w.slug,
      title: w.title,
      artist: w.artistName,
      country: w.artistCountry ?? w.country ?? "",
      image: w.imageUrl,
    }));
  }

  const cmsArtworks = await getAllArtworks();
  if (cmsArtworks.length > 0) {
    return cmsArtworks.map((w) => ({
      slug: w.slug,
      title: w.title,
      artist: w.artistName ?? "Unknown Artist",
      country: "",
      image: w.imageUrl ?? "",
    }));
  }

  return STATIC_ARTWORKS;
}
