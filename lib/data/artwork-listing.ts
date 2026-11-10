// Paged, database-side access to published artworks. Nothing here ever loads
// the whole catalogue: listings fetch one page with .range(), totals come
// from count queries / SQL functions, and search runs in Postgres.
// See supabase/migrations/20261110000000_artwork_listing_at_scale.sql.
import { normalizeCountrySlug } from "@/lib/data/africa";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { TECHNIQUES, type Artist, type Technique } from "@/lib/data/artists";
import type { Language } from "@/lib/i18n/config";
import { localized } from "@/lib/i18n/content";
import type { Json } from "@/lib/supabase/types";
import {
  artistFromSummary,
  cleanPlace,
  MANAGED_SELECT,
  splitArtistName,
  toArtwork,
  type ArtworkRow,
  type ManagedArtistRow,
  type ProfileRow,
  type SupabaseArtwork,
} from "@/lib/data/supabase-artists";

/** A row of public.published_artworks. */
type ViewRow = ArtworkRow & {
  created_at: string;
  effective_country: string | null;
  artist_slug: string;
  ma_slug: string | null;
  ma_display_name: string | null;
  ma_bio: string | null;
  ma_country: string | null;
  ma_city: string | null;
  ma_technique: string | null;
  ma_avatar_url: string | null;
  ma_translations: Json;
  p_display_name: string | null;
  p_bio: string | null;
  p_country: string | null;
  p_avatar_url: string | null;
  p_translations: Json;
};

const VIEW_SELECT =
  "id, slug, title, medium, year, country, description, dimensions, image_url, artist_id, managed_artist_id, translations, created_at, effective_country, artist_slug, ma_slug, ma_display_name, ma_bio, ma_country, ma_city, ma_technique, ma_avatar_url, ma_translations, p_display_name, p_bio, p_country, p_avatar_url, p_translations";

/** Same mapping as the rest of the app (toArtwork), from one view row. */
export function viewRowToArtwork(r: ViewRow, lang: Language): SupabaseArtwork {
  const managed: ManagedArtistRow | undefined = r.managed_artist_id
    ? {
        id: r.managed_artist_id,
        slug: r.ma_slug ?? "",
        display_name: r.ma_display_name ?? "",
        bio: r.ma_bio,
        country: r.ma_country ?? "",
        city: r.ma_city,
        technique: r.ma_technique,
        avatar_url: r.ma_avatar_url,
        translations: r.ma_translations,
      }
    : undefined;
  const profile: ProfileRow | undefined =
    !r.managed_artist_id && r.p_display_name != null
      ? {
          id: r.artist_id,
          display_name: r.p_display_name,
          bio: r.p_bio,
          country: r.p_country,
          avatar_url: r.p_avatar_url,
          translations: r.p_translations,
        }
      : undefined;
  return toArtwork(r, profile, managed, lang);
}

// ---------- Counts ----------

export type CountryCount = { slug: string; works: number; /** raw country values stored for it */ values: string[] };

/** Published works per country (slug), from a GROUP BY in the database. */
export async function getCountryCounts(): Promise<CountryCount[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.rpc("published_artwork_country_counts");
  if (error || !data) {
    if (error) console.error("[Supabase] country counts:", error.message);
    return [];
  }
  const bySlug = new Map<string, CountryCount>();
  for (const row of data as { country: string | null; works: number }[]) {
    const slug = normalizeCountrySlug(row.country ?? "") || "other";
    const entry = bySlug.get(slug) ?? { slug, works: 0, values: [] };
    entry.works += Number(row.works);
    if (row.country != null) entry.values.push(row.country);
    bySlug.set(slug, entry);
  }
  return [...bySlug.values()].sort((a, b) => b.works - a.works);
}

// ---------- Listings ----------

export type ListOptions = {
  lang: Language;
  /** Country slug (matches the artist's effective country, like everywhere else). */
  country?: string;
  /** Artist route key (managed slug or account id). */
  artistSlug?: string;
  /** Free text: title, artist, country or medium. */
  search?: string;
  excludeSlug?: string;
  offset?: number;
  limit: number;
  /** Also return the total number of matches (one extra count, no rows). */
  withTotal?: boolean;
};

export type Page<T> = { items: T[]; total: number };

/** Characters PostgREST's or() syntax gives meaning to are dropped from search text. */
const cleanSearch = (q: string) => q.replace(/[,()*%\\:"]/g, " ").replace(/\s+/g, " ").trim();

/** One page of published works, newest first. */
export async function listPublishedArtworks(opts: ListOptions): Promise<Page<SupabaseArtwork>> {
  if (!isSupabaseConfigured()) return { items: [], total: 0 };
  const offset = Math.max(0, opts.offset ?? 0);

  let query = supabase
    .from("published_artworks")
    .select(VIEW_SELECT, opts.withTotal ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (opts.country) {
    const values = opts.country === "other" ? null : (await getCountryCounts()).find((c) => c.slug === opts.country)?.values;
    if (opts.country !== "other" && (!values || values.length === 0)) return { items: [], total: 0 };
    query = values ? query.in("effective_country", values) : query.is("effective_country", null);
  }
  if (opts.artistSlug) query = query.eq("artist_slug", opts.artistSlug);
  if (opts.excludeSlug) query = query.neq("slug", opts.excludeSlug);
  if (opts.search) {
    const q = cleanSearch(opts.search);
    if (!q) return { items: [], total: 0 };
    query = query.or(
      ["title", "artist_display_name", "effective_country", "medium"].map((col) => `${col}.ilike.*${q}*`).join(","),
    );
  }

  const { data, error, count } = await query.range(offset, offset + opts.limit - 1);
  if (error) {
    console.error("[Supabase] listPublishedArtworks:", error.message);
    return { items: [], total: 0 };
  }
  const items = ((data ?? []) as unknown as ViewRow[]).map((r) => viewRowToArtwork(r, opts.lang));
  return { items, total: count ?? items.length };
}

/** Total published works, without loading any. */
export async function countPublishedArtworks(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const { count } = await supabase.from("published_artworks").select("id", { count: "exact", head: true });
  return count ?? 0;
}

// ---------- Artists ----------

const NEW_DISCOVERY_MS = 30 * 24 * 60 * 60 * 1000;
const isRecent = (createdAt?: string) => !!createdAt && Date.now() - new Date(createdAt).getTime() < NEW_DISCOVERY_MS;

/**
 * Every artist for the directory: one summary row per artist with published
 * works (computed by a GROUP BY in the database), plus admin-managed
 * profiles that have no published works yet so admins can preview them.
 * Loads one row per artist — never the artworks.
 */
export async function getRealArtists(lang: Language = "en"): Promise<Artist[]> {
  if (!isSupabaseConfigured()) return [];

  const [{ data: summaries, error }, { data: managedRows }] = await Promise.all([
    supabase.rpc("published_artist_summaries"),
    supabase.from("managed_artists").select(MANAGED_SELECT).order("created_at", { ascending: false }),
  ]);
  if (error) console.error("[Supabase] artist summaries:", error.message);

  const artists: Artist[] = ((summaries ?? []) as { newest: Json; works: number; mediums: string[] | null }[]).map((s) =>
    artistFromSummary(viewRowToArtwork(s.newest as unknown as ViewRow, lang), Number(s.works), s.mediums ?? []),
  );
  const withWorks = new Set(artists.map((a) => a.slug));

  for (const m of (managedRows ?? []) as ManagedArtistRow[]) {
    if (withWorks.has(m.slug)) continue;
    artists.push({
      slug: m.slug,
      ...splitArtistName(m.display_name),
      countryCode: "",
      countryName: m.country,
      countrySlug: normalizeCountrySlug(m.country),
      city: cleanPlace(m.city),
      technique: m.technique?.trim() || "Painting",
      filterTechniques: TECHNIQUES.includes((m.technique ?? "") as Technique) ? [m.technique as Technique] : ["Other"],
      worksCount: 0,
      newDiscovery: isRecent(m.created_at),
      featuredWork: "",
      bio: localized(m.translations, "bio", lang, m.bio) ?? "",
      image: m.avatar_url ?? "",
    });
  }
  return artists;
}
