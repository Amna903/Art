import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { TECHNIQUES, type Artist, type Technique } from "@/lib/data/artists";

// Real, self-service artist/artwork data — this is what artists actually
// submit via the Artist Dashboard (components/dashboards/ArtistDashboard.tsx),
// stored in Supabase's `artworks` + `profiles` tables. Distinct from:
//   - lib/sanity/queries.ts    → admin/curator-authored CMS content
//   - lib/data/artists.ts      → static fixture data (last-resort fallback)
//
// NOTE: `artworks.price_usd` is intentionally never selected/exposed here —
// per the Price Upon Request policy, pricing only ever flows through the
// enquiries table (lib/data/enquiries.ts), never displayed on public pages.

export type SupabaseArtwork = {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  imageUrl: string;
  artistId: string;
  artistName: string;
  artistCountry: string | null;
  artistBio: string | null;
  artistAvatarUrl: string | null;
};

type SupabaseProfile = {
  id: string;
  display_name: string;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
};

function toArtwork(
  row: {
    id: string;
    slug: string;
    title: string;
    medium: string | null;
    year: number | null;
    country: string | null;
    description: string | null;
    image_url: string;
    artist_id: string;
  },
  profile: SupabaseProfile | undefined,
): SupabaseArtwork {
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
    artistName: profile?.display_name?.trim() || "Artist",
    artistCountry: profile?.country ?? row.country ?? null,
    artistBio: profile?.bio ?? null,
    artistAvatarUrl: profile?.avatar_url ?? null,
  };
}

/**
 * Note: artworks.artist_id references auth.users(id) directly (same as
 * profiles.id, but no FK exists *between* artworks and profiles), so
 * PostgREST can't auto-embed the join — we fetch both tables and join in JS.
 */
async function attachProfiles(
  rows: {
    id: string;
    slug: string;
    title: string;
    medium: string | null;
    year: number | null;
    country: string | null;
    description: string | null;
    image_url: string;
    artist_id: string;
  }[],
): Promise<SupabaseArtwork[]> {
  if (rows.length === 0) return [];
  const artistIds = Array.from(new Set(rows.map((r) => r.artist_id)));
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, display_name, bio, country, avatar_url")
    .in("id", artistIds);

  const profileById = new Map((profileRows ?? []).map((p) => [p.id, p as SupabaseProfile]));
  return rows.map((r) => toArtwork(r, profileById.get(r.artist_id)));
}

/** Returns [] (not an error) when Supabase isn't configured or has no published artworks yet. */
export async function getPublishedArtworks(): Promise<SupabaseArtwork[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select("id, slug, title, medium, year, country, description, image_url, artist_id")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch published artworks:", error.message);
      return [];
    }
    return attachProfiles(data);
  } catch (err) {
    console.error("[Supabase] Failed to fetch published artworks:", err);
    return [];
  }
}

/** Returns [] (not an error) when Supabase isn't configured or none of the ids match a published artwork. */
export async function getPublishedArtworksByIds(ids: string[]): Promise<SupabaseArtwork[]> {
  if (!isSupabaseConfigured() || ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("artworks")
      .select("id, slug, title, medium, year, country, description, image_url, artist_id")
      .eq("status", "published")
      .in("id", ids);

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch artworks by ids:", error.message);
      return [];
    }
    return attachProfiles(data);
  } catch (err) {
    console.error("[Supabase] Failed to fetch artworks by ids:", err);
    return [];
  }
}

/**
 * Homepage "Collector Picks" — decided by the code, not an admin click: the
 * artworks with the most "Request Price" enquiries, most-requested first.
 * Ranking comes from a SECURITY DEFINER RPC (enquiries itself is admin-only,
 * since it holds names/emails/messages — the RPC exposes only slug+count).
 */
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
      .select("id, slug, title, medium, year, country, description, image_url, artist_id")
      .eq("status", "published")
      .in("slug", slugs);

    if (error || !data) {
      if (error) console.error("[Supabase] Failed to fetch requested artworks:", error.message);
      return [];
    }

    // Preserve rank order (an enquired artwork may since have been
    // unpublished/deleted, so this also drops any slug with no live row).
    const bySlug = new Map(data.map((row) => [row.slug, row]));
    const orderedRows = slugs.map((s) => bySlug.get(s)).filter((row): row is (typeof data)[number] => Boolean(row));
    return attachProfiles(orderedRows);
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
      .select("id, slug, title, medium, year, country, description, image_url, artist_id")
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    const [artwork] = await attachProfiles([data]);
    return artwork ?? null;
  } catch (err) {
    console.error("[Supabase] Failed to fetch artwork by slug:", err);
    return null;
  }
}

/**
 * Groups published artworks by artist into the same `Artist` shape the
 * static directory / ArtistCard components already expect, so real
 * self-service artists can appear in the /artists directory without any
 * component changes.
 */
export async function getRealArtists(): Promise<Artist[]> {
  const artworks = await getPublishedArtworks();
  if (artworks.length === 0) return [];

  const byArtist = new Map<string, SupabaseArtwork[]>();
  for (const a of artworks) {
    const list = byArtist.get(a.artistId) ?? [];
    list.push(a);
    byArtist.set(a.artistId, list);
  }

  const artists: Artist[] = [];
  for (const [artistId, works] of byArtist) {
    const first = works[0];
    const uniqueMediums = Array.from(
      new Set(works.map((w) => w.medium?.trim()).filter((m): m is string => Boolean(m)))
    );
    const filterTechniques = Array.from(
      new Set(
        uniqueMediums.map((medium) =>
          TECHNIQUES.includes(medium as Technique) ? (medium as Technique) : "Other"
        )
      )
    );
    if (uniqueMediums.length > 1 && !filterTechniques.includes("Mixed Media")) {
      filterTechniques.push("Mixed Media");
    }
    const technique = uniqueMediums.length === 1 ? uniqueMediums[0] : "Mixed Media";

    artists.push({
      slug: artistId, // real accounts don't have a vanity slug yet — route by id
      name: first.artistName,
      countryCode: "",
      countryName: first.artistCountry ?? first.country ?? "",
      countrySlug: (first.artistCountry ?? first.country ?? "").toLowerCase().replace(/\s+/g, "-"),
      city: "",
      technique,
      filterTechniques,
      worksCount: works.length,
      newDiscovery: false,
      featuredWork: first.title,
      bio: first.artistBio ?? "",
      image: first.artistAvatarUrl ?? first.imageUrl,
    });
  }
  return artists;
}
