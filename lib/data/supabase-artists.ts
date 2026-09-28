import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { TECHNIQUES, type Artist, type Technique } from "@/lib/data/artists";

// Real artist/artwork data from Supabase:
//   - Self-service artists → artworks.artist_id + profiles
//   - Admin-represented artists (no login) → artworks.managed_artist_id + managed_artists
// Distinct from Sanity CMS and static fixtures.

export type SupabaseArtwork = {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  imageUrl: string;
  /** Account user id, or managed_artists.id when admin-represented. */
  artistId: string;
  /** Public route key: managed slug, or account user id. */
  artistSlug: string;
  artistName: string;
  artistCountry: string | null;
  artistCity: string | null;
  artistBio: string | null;
  artistAvatarUrl: string | null;
  artistTechnique: string | null;
};

type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  image_url: string;
  artist_id: string;
  managed_artist_id: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
};

type ManagedArtistRow = {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  country: string;
  city: string | null;
  technique: string | null;
  avatar_url: string | null;
};

const ARTWORK_SELECT =
  "id, slug, title, medium, year, country, description, image_url, artist_id, managed_artist_id";

function toArtwork(
  row: ArtworkRow,
  profile: ProfileRow | undefined,
  managed: ManagedArtistRow | undefined,
): SupabaseArtwork {
  if (managed) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      medium: row.medium,
      year: row.year,
      country: row.country,
      description: row.description,
      imageUrl: row.image_url,
      artistId: managed.id,
      artistSlug: managed.slug,
      artistName: managed.display_name?.trim() || "Artist",
      artistCountry: managed.country ?? row.country ?? null,
      artistCity: managed.city ?? null,
      artistBio: managed.bio ?? null,
      artistAvatarUrl: managed.avatar_url ?? null,
      artistTechnique: managed.technique ?? null,
    };
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    medium: row.medium,
    year: row.year,
    country: row.country,
    description: row.description,
    imageUrl: row.image_url,
    artistId: row.artist_id,
    artistSlug: row.artist_id,
    artistName: profile?.display_name?.trim() || "Artist",
    artistCountry: profile?.country ?? row.country ?? null,
    artistCity: null,
    artistBio: profile?.bio ?? null,
    artistAvatarUrl: profile?.avatar_url ?? null,
    artistTechnique: null,
  };
}

/**
 * artworks.artist_id → profiles (account artists)
 * artworks.managed_artist_id → managed_artists (admin-represented, no login)
 */
async function attachArtistMeta(rows: ArtworkRow[]): Promise<SupabaseArtwork[]> {
  if (rows.length === 0) return [];

  const accountIds = Array.from(
    new Set(rows.filter((r) => !r.managed_artist_id).map((r) => r.artist_id)),
  );
  const managedIds = Array.from(
    new Set(rows.map((r) => r.managed_artist_id).filter((id): id is string => Boolean(id))),
  );

  const [profileRes, managedRes] = await Promise.all([
    accountIds.length
      ? supabase.from("profiles").select("id, display_name, bio, country, avatar_url").in("id", accountIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    managedIds.length
      ? supabase
          .from("managed_artists")
          .select("id, slug, display_name, bio, country, city, technique, avatar_url")
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
    ),
  );
}

/** Returns [] when Supabase isn't configured or has no published artworks yet. */
export async function getPublishedArtworks(): Promise<SupabaseArtwork[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch published artworks:", error.message);
      return [];
    }
    return attachArtistMeta(data as ArtworkRow[]);
  } catch (err) {
    console.error("[Supabase] Failed to fetch published artworks:", err);
    return [];
  }
}

export async function getPublishedArtworksByIds(ids: string[]): Promise<SupabaseArtwork[]> {
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
    return attachArtistMeta(data as ArtworkRow[]);
  } catch (err) {
    console.error("[Supabase] Failed to fetch artworks by ids:", err);
    return [];
  }
}

export async function getMostRequestedArtworks(limit = 6): Promise<SupabaseArtwork[]> {
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
    return attachArtistMeta(orderedRows);
  } catch (err) {
    console.error("[Supabase] Failed to fetch requested artworks:", err);
    return [];
  }
}

export async function getPublishedArtworkBySlug(slug: string): Promise<SupabaseArtwork | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select(ARTWORK_SELECT)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    const [artwork] = await attachArtistMeta([data as ArtworkRow]);
    return artwork ?? null;
  } catch (err) {
    console.error("[Supabase] Failed to fetch artwork by slug:", err);
    return null;
  }
}

function artistFromWorks(works: SupabaseArtwork[]): Artist {
  const first = works[0];
  const uniqueMediums = Array.from(
    new Set(works.map((w) => w.medium?.trim()).filter((m): m is string => Boolean(m))),
  );
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
    countryCode: "",
    countryName: first.artistCountry ?? first.country ?? "",
    countrySlug: (first.artistCountry ?? first.country ?? "").toLowerCase().replace(/\s+/g, "-"),
    city: first.artistCity ?? "",
    technique,
    filterTechniques: filterTechniques.length
      ? filterTechniques
      : TECHNIQUES.includes(technique as Technique)
        ? [technique as Technique]
        : ["Other"],
    worksCount: works.length,
    newDiscovery: false,
    featuredWork: first.title,
    bio: first.artistBio ?? "",
    image: first.artistAvatarUrl ?? first.imageUrl,
  };
}

/**
 * Groups published artworks by artist (account or admin-managed) into the
 * `Artist` shape used by the directory. Also includes managed profiles that
 * have no published works yet so admins can preview the public page.
 */
export async function getRealArtists(): Promise<Artist[]> {
  if (!isSupabaseConfigured()) return [];

  const artworks = await getPublishedArtworks();
  const bySlug = new Map<string, SupabaseArtwork[]>();
  for (const a of artworks) {
    const list = bySlug.get(a.artistSlug) ?? [];
    list.push(a);
    bySlug.set(a.artistSlug, list);
  }

  const artists: Artist[] = Array.from(bySlug.values()).map(artistFromWorks);

  // Include admin-managed profiles with zero published works.
  try {
    const { data: managedRows } = await supabase
      .from("managed_artists")
      .select("id, slug, display_name, bio, country, city, technique, avatar_url")
      .order("created_at", { ascending: false });

    for (const m of (managedRows ?? []) as ManagedArtistRow[]) {
      if (bySlug.has(m.slug)) continue;
      artists.push({
        slug: m.slug,
        name: m.display_name,
        countryCode: "",
        countryName: m.country,
        countrySlug: m.country.toLowerCase().replace(/\s+/g, "-"),
        city: m.city ?? "",
        technique: m.technique?.trim() || "Painting",
        filterTechniques: TECHNIQUES.includes((m.technique ?? "") as Technique)
          ? [(m.technique as Technique)]
          : ["Other"],
        worksCount: 0,
        newDiscovery: true,
        featuredWork: "",
        bio: m.bio ?? "",
        image: m.avatar_url ?? "",
      });
    }
  } catch (err) {
    console.error("[Supabase] Failed to fetch managed artists:", err);
  }

  return artists;
}
