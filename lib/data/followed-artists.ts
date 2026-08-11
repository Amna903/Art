import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export type FollowArtistInput = {
  artistSlug: string;
  artistName: string;
  artistImage?: string | null;
  technique?: string | null;
  countryName?: string | null;
};

export type FollowedArtistRow = {
  id: string;
  user_id: string;
  artist_slug: string;
  artist_name: string;
  artist_image: string | null;
  technique: string | null;
  country_name: string | null;
  created_at: string;
};

const LOCAL_STORAGE_KEY_PREFIX = "nu_art_followed_artists_";
export const FOLLOWED_ARTISTS_EVENT = "nu_art_followed_artists_changed";

function getStorageKey(userId?: string | null): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${userId || "guest"}`;
}

function getLocalFollowedArtists(userId?: string | null): FollowedArtistRow[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    if (userId) {
      const guestRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`);
      if (guestRaw) return JSON.parse(guestRaw);
    }
  } catch (err) {
    console.error("Error reading followed artists from localStorage:", err);
  }
  return [];
}

function setLocalFollowedArtists(items: FollowedArtistRow[], userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(FOLLOWED_ARTISTS_EVENT, { detail: { items } }));
  } catch (err) {
    console.error("Error writing followed artists to localStorage:", err);
  }
}

export async function isArtistFollowed(userId: string | undefined | null, slug: string): Promise<boolean> {
  const localItems = getLocalFollowedArtists(userId);
  if (localItems.some((item) => item.artist_slug === slug)) {
    return true;
  }

  if (userId && isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("followed_artists")
        .select("id")
        .eq("user_id", userId)
        .eq("artist_slug", slug)
        .maybeSingle();
      if (data) return true;
    } catch (e) {
      // Ignore Supabase fetch errors
    }
  }

  return false;
}

export async function followArtist(userId: string | undefined | null, input: FollowArtistInput) {
  const localItems = getLocalFollowedArtists(userId);
  const exists = localItems.some((i) => i.artist_slug === input.artistSlug);

  const newRow: FollowedArtistRow = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId || "guest",
    artist_slug: input.artistSlug,
    artist_name: input.artistName,
    artist_image: input.artistImage ?? null,
    technique: input.technique ?? null,
    country_name: input.countryName ?? null,
    created_at: new Date().toISOString(),
  };

  if (!exists) {
    const updated = [newRow, ...localItems];
    setLocalFollowedArtists(updated, userId);
  }

  if (userId && isSupabaseConfigured()) {
    try {
      await supabase.from("followed_artists").insert({
        user_id: userId,
        artist_slug: input.artistSlug,
        artist_name: input.artistName,
        artist_image: input.artistImage ?? null,
        technique: input.technique ?? null,
        country_name: input.countryName ?? null,
      });
    } catch (e) {
      console.warn("Supabase insert error for followed_artists:", e);
    }
  }

  return { data: newRow, error: null };
}

export async function unfollowArtist(userId: string | undefined | null, slug: string) {
  const localItems = getLocalFollowedArtists(userId);
  const updated = localItems.filter((i) => i.artist_slug !== slug);
  setLocalFollowedArtists(updated, userId);

  if (userId && isSupabaseConfigured()) {
    try {
      await supabase.from("followed_artists").delete().eq("user_id", userId).eq("artist_slug", slug);
    } catch (e) {
      console.warn("Supabase delete error for followed_artists:", e);
    }
  }

  return { error: null };
}

export async function listFollowedArtists(userId: string | undefined | null): Promise<FollowedArtistRow[]> {
  let localItems = getLocalFollowedArtists(userId);

  // When a guest logs in, sync any guest localStorage items up to Supabase
  if (userId && isSupabaseConfigured() && typeof window !== "undefined") {
    try {
      const guestRaw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`);
      if (guestRaw) {
        const guestItems: FollowedArtistRow[] = JSON.parse(guestRaw);
        if (guestItems.length > 0) {
          const insertPayloads = guestItems.map((g) => ({
            user_id: userId,
            artist_slug: g.artist_slug,
            artist_name: g.artist_name,
            artist_image: g.artist_image,
            technique: g.technique,
            country_name: g.country_name,
          }));
          await supabase.from("followed_artists").upsert(insertPayloads, { onConflict: "user_id,artist_slug" });
          localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}guest`);
        }
      }
    } catch {
      // Ignore migration errors
    }
  }

  let dbItems: FollowedArtistRow[] = [];
  if (userId && isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from("followed_artists")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (data) {
        dbItems = data as FollowedArtistRow[];
      }
    } catch {
      // Ignore fetch error
    }
  }

  const mergedMap = new Map<string, FollowedArtistRow>();
  for (const item of localItems) {
    mergedMap.set(item.artist_slug, item);
  }
  for (const item of dbItems) {
    mergedMap.set(item.artist_slug, item);
  }

  let merged = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Follow stores a one-time avatar snapshot. Refresh from profiles so
  // guest and client dashboards show up-to-date artist profile pictures.
  if (isSupabaseConfigured() && merged.length > 0) {
    try {
      const ids = merged.map((m) => m.artist_slug);
      const { data: live } = await supabase
        .from("profiles")
        .select("id, avatar_url, display_name")
        .in("id", ids);
      if (live?.length) {
        const byId = new Map(live.map((row) => [row.id, row]));
        merged = merged.map((row) => {
          const current = byId.get(row.artist_slug);
          if (!current) return row;
          return {
            ...row,
            artist_image: current.avatar_url || row.artist_image,
            artist_name: current.display_name?.trim() || row.artist_name,
          };
        });
      }
    } catch {
      // Ignore live resolution error
    }
  }

  setLocalFollowedArtists(merged, userId);
  return merged;
}

