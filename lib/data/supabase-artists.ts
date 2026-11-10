import { normalizeCountrySlug } from "@/lib/data/africa";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { TECHNIQUES, type Artist, type Technique } from "@/lib/data/artists";
import type { Json } from "@/lib/supabase/types";
import type { Language } from "@/lib/i18n/config";
import { localized } from "@/lib/i18n/content";

// Real artist/artwork data from Supabase:
//   - Self-service artists → artworks.artist_id + profiles
//   - Admin-represented artists (no login) → artworks.managed_artist_id + managed_artists
// Distinct from Sanity CMS and static fixtures.
//
// Every reader takes an optional language; titles, descriptions and bios are
// returned in that language when the admin/artist has entered a translation
// (the `translations` column), otherwise in English.

export type SupabaseArtwork = {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  dimensions: string | null;
  imageUrl: string;
  /** Account user id, or managed_artists.id when admin-represented. */
  artistId: string;
  /** Public route key: managed slug, or account user id. */
  artistSlug: string;
  artistName: string;
  artistAge: number | null;
  artistCountry: string | null;
  artistCity: string | null;
  artistBio: string | null;
  artistAvatarUrl: string | null;
  artistTechnique: string | null;
};

export type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  dimensions: string | null;
  image_url: string;
  artist_id: string;
  managed_artist_id: string | null;
  translations: Json;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
  translations: Json;
};

export type ManagedArtistRow = {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  country: string;
  city: string | null;
  technique: string | null;
  avatar_url: string | null;
  translations: Json;
  created_at?: string;
};

const ARTWORK_SELECT =
  "id, slug, title, medium, year, country, description, dimensions, image_url, artist_id, managed_artist_id, translations";
const PROFILE_SELECT = "id, display_name, bio, country, avatar_url, translations";
export const MANAGED_SELECT = "id, slug, display_name, bio, country, city, technique, avatar_url, translations, created_at";

export function toArtwork(
  row: ArtworkRow,
  profile: ProfileRow | undefined,
  managed: ManagedArtistRow | undefined,
  lang: Language,
): SupabaseArtwork {
  const title = localized(row.translations, "title", lang, row.title);
  const description = localized(row.translations, "description", lang, row.description);
  if (managed) {
    return {
      id: row.id,
      slug: row.slug,
      title,
      medium: row.medium,
      year: row.year,
      country: row.country,
      description,
      dimensions: row.dimensions ?? null,
      imageUrl: row.image_url,
      artistId: managed.id,
      artistSlug: managed.slug,
      artistName: splitArtistName(managed.display_name ?? "").name || "Artist",
      artistAge: splitArtistName(managed.display_name ?? "").age,
      artistCountry: managed.country ?? row.country ?? null,
      artistCity: managed.city ?? null,
      artistBio: localized(managed.translations, "bio", lang, managed.bio) ?? null,
      artistAvatarUrl: managed.avatar_url ?? null,
      artistTechnique: managed.technique ?? null,
    };
  }

  return {
    id: row.id,
    slug: row.slug,
    title,
    medium: row.medium,
    year: row.year,
    country: row.country,
    description,
    dimensions: row.dimensions ?? null,
    imageUrl: row.image_url,
    artistId: row.artist_id,
    artistSlug: row.artist_id,
    artistName: splitArtistName(profile?.display_name ?? "").name || "Artist",
    artistAge: splitArtistName(profile?.display_name ?? "").age,
    artistCountry: profile?.country ?? row.country ?? null,
    artistCity: null,
    artistBio: (profile && localized(profile.translations, "bio", lang, profile.bio)) ?? null,
    artistAvatarUrl: profile?.avatar_url ?? null,
    artistTechnique: null,
  };
}

/**
 * artworks.artist_id → profiles (account artists)
 * artworks.managed_artist_id → managed_artists (admin-represented, no login)
 */
async function attachArtistMeta(rows: ArtworkRow[], lang: Language): Promise<SupabaseArtwork[]> {
  if (rows.length === 0) return [];

  const accountIds = Array.from(
    new Set(rows.filter((r) => !r.managed_artist_id).map((r) => r.artist_id)),
  );
  const managedIds = Array.from(
    new Set(rows.map((r) => r.managed_artist_id).filter((id): id is string => Boolean(id))),
  );

  const [profileRes, managedRes] = await Promise.all([
    accountIds.length
      ? supabase.from("profiles").select(PROFILE_SELECT).in("id", accountIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    managedIds.length
      ? supabase
          .from("managed_artists")
          .select(MANAGED_SELECT)
          .in("id", managedIds)
      : Promise.resolve({ data: [] as ManagedArtistRow[] }),
  ]);

  const profileById = new Map((profileRes.data ?? []).map((p) => [p.id, p as ProfileRow]));
  const managedById = new Map((managedRes.data ?? []).map((m) => [m.id, m as ManagedArtistRow]));

  return rows.map((r) =>
    toArtwork(
      r,
      r.managed_artist_id ? undefined : profileById.get(r.artist_id),
      r.managed_artist_id ? managedById.get(r.managed_artist_id) : undefined,
      lang,
    ),
  );
}

/**
 * @deprecated Loads every published work. Only the virtual gallery still
 * uses it, until it moves to per-room queries; everything else uses the
 * paged helpers in lib/data/artwork-listing.ts. Pages through the results so
 * it never silently stops at Supabase's 1,000-row response limit.
 */
export async function getPublishedArtworks(lang: Language = "en"): Promise<SupabaseArtwork[]> {
  if (!isSupabaseConfigured()) return [];
  const PAGE = 1000;
  const rows: ArtworkRow[] = [];
  try {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("artworks")
        .select(ARTWORK_SELECT)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("[Supabase] Failed to fetch published artworks:", error.message);
        return [];
      }
      rows.push(...((data ?? []) as ArtworkRow[]));
      if (!data || data.length < PAGE) break;
    }
    return attachArtistMeta(rows, lang);
  } catch (err) {
    console.error("[Supabase] Failed to fetch published artworks:", err);
    return [];
  }
}

export async function getPublishedArtworksByIds(ids: string[], lang: Language = "en"): Promise<SupabaseArtwork[]> {
  if (!isSupabaseConfigured() || ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("status", "published")
      .in("id", ids);

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch artworks by ids:", error.message);
      return [];
    }
    return attachArtistMeta(data as ArtworkRow[], lang);
  } catch (err) {
    console.error("[Supabase] Failed to fetch artworks by ids:", err);
    return [];
  }
}

export async function getMostRequestedArtworks(limit = 6, lang: Language = "en"): Promise<SupabaseArtwork[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data: ranked, error: rpcError } = await supabase.rpc("get_top_requested_artwork_slugs", {
      limit_count: limit,
    });
    if (rpcError || !ranked || ranked.length === 0) {
      if (rpcError) console.error("[Supabase] Failed to rank requested artworks:", rpcError.message);
      return [];
    }

    const slugs = ranked.map((r) => r.artwork_slug);
    const { data, error } = await supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("status", "published")
      .in("slug", slugs);

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch requested artworks:", error.message);
      return [];
    }

    const bySlug = new Map((data as ArtworkRow[]).map((row) => [row.slug, row]));
    const orderedRows = slugs.map((s) => bySlug.get(s)).filter((row): row is ArtworkRow => Boolean(row));
    return attachArtistMeta(orderedRows, lang);
  } catch (err) {
    console.error("[Supabase] Failed to fetch requested artworks:", err);
    return [];
  }
}

export async function getPublishedArtworkBySlug(slug: string, lang: Language = "en"): Promise<SupabaseArtwork | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    const [artwork] = await attachArtistMeta([data as ArtworkRow], lang);
    return artwork ?? null;
  } catch (err) {
    console.error("[Supabase] Failed to fetch artwork by slug:", err);
    return null;
  }
}

/** The directory entry for an artist, from their newest work, how many
 * published works they have and the mediums used across them. */
export function artistFromSummary(first: SupabaseArtwork, worksCount: number, mediums: string[]): Artist {
  const uniqueMediums = Array.from(new Set(mediums.map((m) => m.trim()).filter(Boolean)));
  const filterTechniques = Array.from(
    new Set(
      uniqueMediums.map((medium) =>
        TECHNIQUES.includes(medium as Technique) ? (medium as Technique) : "Other",
      ),
    ),
  );
  if (uniqueMediums.length > 1 && !filterTechniques.includes("Mixed Media")) {
    filterTechniques.push("Mixed Media");
  }
  const technique =
    first.artistTechnique?.trim() ||
    (uniqueMediums.length === 1 ? uniqueMediums[0] : uniqueMediums.length > 1 ? "Mixed Media" : "Painting");

  return {
    slug: first.artistSlug,
    name: first.artistName,
    age: first.artistAge,
    countryCode: "",
    countryName: first.artistCountry ?? first.country ?? "",
    countrySlug: normalizeCountrySlug(first.artistCountry ?? first.country ?? ""),
    city: cleanPlace(first.artistCity),
    technique,
    filterTechniques: filterTechniques.length
      ? filterTechniques
      : TECHNIQUES.includes(technique as Technique)
        ? [technique as Technique]
        : ["Other"],
    worksCount,
    newDiscovery: false,
    featuredWork: first.title,
    bio: first.artistBio ?? "",
    image: first.artistAvatarUrl ?? first.imageUrl,
  };
}

/**
 * Splits what was typed into the name field into separate fields (change
 * brief §6): "PENIEL JOSHE Also known as Mukulo Onesto Age 56" →
 * { name: "Peniel Joshe", age: 56 }. The alias is left out until its spelling
 * is confirmed.
 */
export function splitArtistName(raw: string): { name: string; age: number | null } {
  let text = raw.trim().replace(/\s+/g, " ");
  const ageMatch = text.match(/[,\s]*\bAge\s*:?\s*(\d{1,3})\b[,\s]*$/i);
  const age = ageMatch ? Number(ageMatch[1]) : null;
  if (ageMatch) text = text.slice(0, ageMatch.index).trim();
  text = text.replace(/[,\s]*\b(also known as|aka|a\.k\.a\.)\b.*$/i, "").trim();
  return { name: displayArtistName(text), age };
}

/** One style for every name (change brief §6): title case. Names typed in
 * capitals ("JOSÉ PROENÇA") are lowered first; otherwise only first letters
 * are raised ("Mayonga kingila" → "Mayonga Kingila"). Particles stay lower. */
export function displayArtistName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const base = trimmed === trimmed.toUpperCase() ? trimmed.toLowerCase() : trimmed;
  const particles = new Set(["da", "de", "do", "das", "dos", "e"]);
  return base
    .split(" ")
    .map((w, i) => (i > 0 && particles.has(w) ? w : w.replace(/(^|[-'])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase())))
    .join(" ");
}

/** "Luanda," → "Luanda"; "kinshasa" → "Kinshasa". */
export function cleanPlace(place: string | null | undefined): string {
  const p = (place ?? "").trim().replace(/[\s,;]+$/, "");
  return p ? p.charAt(0).toLocaleUpperCase() + p.slice(1) : "";
}

