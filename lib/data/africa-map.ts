// Enriched country data used by the interactive atlas on /discover.
// Reuses the canonical 54-country list from ./africa and layers on counts,
// featured artists, and a curated connections graph.

import { AFRICAN_COUNTRIES, getCountryGallery, type Country } from "./africa";
import { ARTISTS } from "./artists";

export type CountryStats = {
  country: Country;
  artistsCount: number;
  worksCount: number;
  forSale: number;
  hasNew: boolean;
  featuredArtists: { slug: string; name: string; technique: string }[];
  featured: boolean; // shown as a red "hub" on the curatorial layer
};

const FEATURED_HUBS = new Set<string>([
  "nigeria",
  "senegal",
  "morocco",
  "south-africa",
  "kenya",
  "ghana",
  "egypt",
  "ethiopia",
  "drc",
  "ivory-coast",
]);

// Curated cultural corridors — drawn as thin dashed red lines in curatorial mode.
export const CONNECTIONS: { from: string; to: string; label: string }[] = [
  { from: "senegal", to: "morocco", label: "Sahelian dialogue" },
  { from: "senegal", to: "nigeria", label: "West African new wave" },
  { from: "nigeria", to: "ghana", label: "Gulf of Guinea circuit" },
  { from: "nigeria", to: "south-africa", label: "Lagos ↔ Johannesburg axis" },
  { from: "ghana", to: "ivory-coast", label: "Adinkra corridor" },
  { from: "morocco", to: "egypt", label: "Mediterranean crescent" },
  { from: "egypt", to: "ethiopia", label: "Nile route" },
  { from: "ethiopia", to: "kenya", label: "Rift valley school" },
  { from: "kenya", to: "tanzania", label: "Swahili coast" },
  { from: "south-africa", to: "mozambique", label: "Southern basin" },
  { from: "drc", to: "angola", label: "Congo basin" },
  { from: "drc", to: "rwanda", label: "Great Lakes network" },
  { from: "senegal", to: "cabo-verde", label: "Atlantic creolité" },
];

const statsCache = new Map<string, CountryStats>();

export function getStats(slug: string): CountryStats {
  const cached = statsCache.get(slug);
  if (cached) return cached;
  const country = AFRICAN_COUNTRIES.find((c) => c.slug === slug)!;
  const gallery = getCountryGallery(slug);
  const countryArtists = ARTISTS.filter((a) => a.countrySlug === slug);
  const artistsCount = countryArtists.length || gallery?.artists.length || 4;
  const worksCount =
    countryArtists.reduce((s, a) => s + a.worksCount, 0) || gallery?.artworks.length || 8;
  const forSale = gallery?.available ?? Math.max(3, Math.round(worksCount * 0.6));
  const hasNew = countryArtists.some((a) => a.newDiscovery) || (gallery?.hasNew ?? false);
  const featuredArtists = countryArtists.slice(0, 3).map((a) => ({
    slug: a.slug,
    name: a.name,
    technique: a.technique,
  }));
  const stats: CountryStats = {
    country,
    artistsCount,
    worksCount,
    forSale,
    hasNew,
    featuredArtists,
    featured: FEATURED_HUBS.has(slug),
  };
  statsCache.set(slug, stats);
  return stats;
}

export function getAllStats(): CountryStats[] {
  return AFRICAN_COUNTRIES.map((c) => getStats(c.slug));
}
